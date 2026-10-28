# Using UI Components Across Different Pages

Our newly created UI components are designed for reuse across various pages in the application. Here's a guide on how to use them in different contexts:

## Import the Components

```tsx
import { 
  Hero, 
  SectionContainer, 
  SectionTitle, 
  FeatureCard 
} from "@/components/ui";
```

## Examples of Usage in Different Pages

### 1. Homepage (Already Implemented)

```tsx
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section with title and description */}
      <Hero 
        title="Professional Photo Gallery & Portfolio" 
        description="Upload, organize, and share your photography with automatic optimization, tagging system, and client proofing capabilities."
      />
      
      {/* Feature Cards Section */}
      <div className="container mx-auto px-4 mb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {featureCardsData.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              iconColor={feature.iconColor}
            />
          ))}
        </div>
      </div>

      {/* Sections with custom background colors */}
      <SectionContainer bgColor="bg-white/30 dark:bg-slate-800/30">
        <SectionTitle title="Quick Upload" className="text-center mb-12" />
        <UploadZone />
      </SectionContainer>

      {/* Sections with view all links */}
      <SectionContainer>
        <SectionTitle title="Recent Uploads" viewAllLink="/gallery" />
        <GalleryGrid limit={6} currentPage={1} />
      </SectionContainer>
    </div>
  );
}
```

### 2. Gallery Page

```tsx
export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Hero 
        title="Browse Your Photography Collection" 
        description="View, filter, and organize your images by collection, tag, or date."
      />
      
      <SectionContainer>
        <SectionTitle title="Filter Options" />
        <div className="grid md:grid-cols-3 gap-8">
          {filterOptions.map((option, index) => (
            <FeatureCard
              key={index}
              icon={option.icon}
              title={option.title}
              description={option.description}
              iconColor={option.iconColor}
            />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer bgColor="bg-white/30 dark:bg-slate-800/30">
        <SectionTitle 
          title="All Photos" 
          className="flex justify-between"
        >
          <div className="flex space-x-2">
            <select className="px-3 py-2 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              <option>Recent First</option>
              <option>Oldest First</option>
              <option>A-Z</option>
            </select>
            <button className="px-3 py-2 bg-blue-600 text-white rounded">
              New Collection
            </button>
          </div>
        </SectionTitle>
        <GalleryGrid limit={12} currentPage={1} />
      </SectionContainer>
    </div>
  );
}
```

### 3. Admin Dashboard

```tsx
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Hero
        title="Admin Dashboard"
        description="Manage your galleries, clients, and portfolio"
      />
      
      <SectionContainer>
        <div className="flex justify-end mb-8">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Gallery
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
              {/* Stat content */}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <SectionTitle title="Quick Actions" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Action cards */}
        </div>

        {/* Galleries Table */}
        <SectionTitle title="Recent Galleries" viewAllLink="/admin/galleries" />
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          {/* Table content */}
        </div>
      </SectionContainer>
    </div>
  );
}
```

### 4. Upload Page

```tsx
export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Hero 
        title="Upload Your Photos" 
        description="Drag and drop your photos for automatic optimization and organization."
      />
      
      <SectionContainer>
        <SectionTitle title="Upload Zone" />
        <UploadZone />
      </SectionContainer>
      
      <SectionContainer bgColor="bg-white/30 dark:bg-slate-800/30">
        <SectionTitle title="Upload Settings" />
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
          {/* Settings content */}
        </div>
      </SectionContainer>
    </div>
  );
}
```

## Gallery Photo Downloads

Every `GalleryGrid` includes an always-visible, keyboard- and touch-accessible
Download button for each photo. `PhotoDownloadButton` owns that photo's pending
and retry state; it does not share pagination loading state. `downloadPhoto` in
`src/lib/download-photo.ts` fetches the selected photo's `url`, checks the HTTP
response and nonempty supported image Content-Type, and hands a temporary file
URL to the browser. Filenames use a sanitized title and ID, with an extension
from the returned image MIME type (JPEG, PNG, WebP, GIF, AVIF, SVG, BMP, TIFF, or ICO).
Temporary links are removed immediately and successful object URLs are released
after a short delay so the browser can consume them.

The demo uses original local SVG illustrations in `public/samples/`, reused
across mock entries, rather than missing photo placeholders. These are sample
artwork, not the photographs described by the mock metadata. Replace each
`Photo.url` with an available image file to use your own photos; previews and
downloads use the same source.

Missing files, HTTP errors, empty/non-image responses, and network failures show
an accessible error with a retry action. External sources must permit browser
CORS fetching and return a supported image Content-Type. Opaque responses are
not a workaround; there is no remote proxy or external credential forwarding.
Previews load the source directly without using the Next.js image optimizer.
Browser security policies may block downloads. Handing off a file does not
prove that the user saved it, and the mock download counts are not updated.

Run focused download tests with `npm test` (install Chromium once with
`npx playwright install chromium`). The suite starts the local development server.

## Benefits of Using These Components

1. **Consistency** - Maintain the same look and feel across all pages
2. **Efficiency** - Reduce repetitive code and make changes in one place
3. **Maintainability** - Easier to update styles and behaviors
4. **Readability** - Cleaner page components with clear separation of concerns

## Extending the Components

You can also extend these components for more specific use cases. For example:

```tsx
// Creating a specialized section component for statistics
function StatsSection({ stats }) {
  return (
    <SectionContainer>
      <SectionTitle title="Statistics" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            {/* Stat content */}
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
```
