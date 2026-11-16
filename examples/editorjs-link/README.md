# Editor.js link tool backend

The [Editor.js link tool](https://github.com/editor-js/link) needs a server endpoint that fetches the pasted URL and returns its title, description and image. This one uses linkpeek, so private and internal addresses are refused, every redirect is checked, and slow pages time out after 5 seconds.

## On Cloudflare Workers, Bun or Deno

`index.ts` exports a standard fetch handler:

```bash
npm install linkpeek
npx wrangler dev index.ts          # Cloudflare Workers
bun run index.ts                   # Bun (with Bun.serve({ fetch: handleRequest }))
```

## In Express

```ts
import express from "express";
import { fetchLinkData } from "./index";

const app = express();

app.get("/fetchUrl", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  res.json(url ? await fetchLinkData(url) : { success: 0 });
});

app.listen(8008);
```

## In the editor

```js
import LinkTool from "@editorjs/link";

new EditorJS({
  tools: {
    linkTool: {
      class: LinkTool,
      config: { endpoint: "http://localhost:8008/fetchUrl" },
    },
  },
});
```

The tool sends `GET /fetchUrl?url=...` and gets back:

```json
{
  "success": 1,
  "link": "https://github.com/",
  "meta": {
    "title": "GitHub · Change is constant. GitHub keeps you ahead. · GitHub",
    "description": "Join the world's most widely adopted…",
    "image": { "url": "https://images.ctfassets.net/…/OG_image.jpg" },
    "site_name": "GitHub",
    "favicon": "https://github.githubassets.com/favicons/favicon.svg"
  }
}
```
