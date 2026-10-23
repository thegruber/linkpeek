# React — Link Preview Card Component

A `<LinkPreview>` component that fetches metadata from your API and renders a card.

## Usage

1. Set up a server-side API route using any of the other examples (Next.js, Express, etc.)

2. Drop this component into your React app:

```tsx
import { LinkPreview } from "./LinkPreview";

export default function Page() {
  return <LinkPreview url="https://github.com" />;
}
```

The component expects a `/api/preview?url=` endpoint. Adjust the `fetch` URL in the component to match your API.

The component cancels obsolete requests and ignores late responses. It expects
the full preview result, including `statusCode` and `imageAlt`, and shows an error
for either API failures or non-2xx target responses. Loading and error states
are announced to assistive technology.
