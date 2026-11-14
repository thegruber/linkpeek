// Moves the generated Markdown exports from out/md/<route>/index.md next to
// their pages (out/<route>/index.md), the URLs the previous site published.
import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve(import.meta.dirname, "..", "out");
const md = resolve(out, "md");
if (!existsSync(md)) throw new Error("out/md is missing; run next build first");
cpSync(md, out, { recursive: true });
rmSync(md, { recursive: true });
console.log("Moved Markdown exports next to their pages.");
