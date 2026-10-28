import { expect, test } from '@playwright/test';
import { mock } from 'node:test';
import { downloadPhoto } from '../src/lib/download-photo';

const photo = { id: '1', title: 'Sunset Landscape', url: '/samples/landscape.svg' };
let link: HTMLAnchorElement;
let cleanups: (() => void)[];
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalSetTimeout = globalThis.setTimeout;

function calls(fn: unknown): unknown[][] {
  return (fn as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls.map(call => call.arguments);
}

test.beforeEach(() => {
  cleanups = [];
  link = {
    href: '', download: '', hidden: false,
    click: mock.fn(), remove: mock.fn(),
  } as unknown as HTMLAnchorElement;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: mock.fn(() => link), body: { appendChild: mock.fn() } },
  });
  mock.method(URL, 'createObjectURL', () => 'blob:sample');
  mock.method(URL, 'revokeObjectURL', () => {});
  mock.method(globalThis, 'setTimeout', ((callback: () => void, delay: number) => {
    if (delay !== 1000) return originalSetTimeout(callback, delay);
    cleanups.push(callback);
    return 0;
  }) as unknown as typeof setTimeout);
  mock.method(globalThis, 'fetch', async () => new Response('<svg/>', {
    headers: { 'Content-Type': 'image/svg+xml' },
  }));
});

test.afterEach(() => {
  mock.restoreAll();
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
});

test('fetches the selected URL, initiates download and releases resources after handoff', async () => {
  await downloadPhoto(photo);
  expect(calls(fetch)).toEqual([[photo.url, { mode: 'cors', credentials: 'same-origin' }]]);
  expect(link.download).toBe('Sunset-Landscape-1.svg');
  expect(link.href).toBe('blob:sample');
  expect(calls(link.click)).toHaveLength(1);
  expect(calls(link.remove)).toHaveLength(1);
  expect(calls(URL.revokeObjectURL)).toHaveLength(0);
  expect(cleanups).toHaveLength(1);
  cleanups[0]();
  expect(calls(URL.revokeObjectURL)).toEqual([['blob:sample']]);
});

test('sanitizes filenames and uses the returned MIME type rather than a URL extension', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('image', {
    headers: { 'Content-Type': 'image/png' },
  }));
  await downloadPhoto({ ...photo, title: '../Résumé: "summer"?.jpg', id: '../../42' });
  expect(link.download).toBe('Re-sume-summer-jpg-42.png');
  await downloadPhoto({ ...photo, title: '.../💛', id: '' });
  expect(link.download).toBe('photo-image.png');
  await downloadPhoto({ ...photo, title: 'a'.repeat(300) });
  expect(link.download).toBe(`${'a'.repeat(80)}-1.png`);
});

for (const status of [404, 403, 500]) {
  test(`rejects HTTP ${status} without a download or object URL`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response('', { status }));
    await expect(downloadPhoto(photo)).rejects.toThrow(`HTTP ${status}`);
    expect(calls(URL.createObjectURL)).toHaveLength(0);
    expect(calls(link.click)).toHaveLength(0);
  });
}

test('explains network/CORS failures and blob read failures', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await expect(downloadPhoto(photo)).rejects.toThrow('CORS');
  mock.method(globalThis, 'fetch', async () => ({
    ok: true, blob: async () => { throw new Error('interrupted'); },
  }) as unknown as Response);
  await expect(downloadPhoto(photo)).rejects.toThrow('could not be read');
  expect(calls(URL.createObjectURL)).toHaveLength(0);
});

for (const [body, type] of [['', 'image/png'], ['not an image', 'text/html']]) {
  test(`rejects invalid image response: ${type} ${body || '(empty)'}`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response(body, {
      headers: { 'Content-Type': type },
    }));
    await expect(downloadPhoto(photo)).rejects.toThrow('supported image');
    expect(calls(URL.createObjectURL)).toHaveLength(0);
  });
}

test('cleans up immediately when browser download initiation fails', async () => {
  mock.method(link, 'click', () => { throw new Error('blocked'); });
  await expect(downloadPhoto(photo)).rejects.toThrow('browser could not start');
  expect(calls(link.remove)).toHaveLength(1);
  expect(calls(URL.revokeObjectURL)).toEqual([['blob:sample']]);
  expect(cleanups).toHaveLength(0);
});

test('releases the object URL even if creating the link fails', async () => {
  mock.method(document, 'createElement', () => { throw new Error('DOM failure'); });
  await expect(downloadPhoto(photo)).rejects.toThrow('browser could not start');
  expect(calls(URL.revokeObjectURL)).toEqual([['blob:sample']]);
});
