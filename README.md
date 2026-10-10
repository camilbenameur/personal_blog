# Blog - Camil Benameur

Source of [blog.camilbenameur.com](https://blog.camilbenameur.com): write-ups of software I have built.
The portfolio is at [camilbenameur.com](https://camilbenameur.com).

## Stack
- Astro 4 (static site), Tailwind CSS 3 (preflight off)
- Look: art direction V1 "Terminal", shared with the portfolio. `src/styles/tokens.css`, `src/styles/base.css`, `public/theme.js`, `public/keys.js`, `public/ui.js` and `public/favicon.svg` are byte-identical to the same files in the portfolio repo (camilbenameur/my_website): change both repos together, never one alone. `src/styles/prose.css` is the only blog-only stylesheet.
- Fonts self-hosted through `@fontsource-variable/geist` and `@fontsource-variable/jetbrains-mono` (no CDN)
- Posts in `src/content/blog/` (Markdown / MDX content collection); the front-matter `slug` sets the URL `/blog/<slug>/`
- Mermaid diagrams rendered at build time by `remark-mermaidjs` (needs Playwright Chromium: `npx playwright install chromium`). They are drawn in greys on white and the theme token `--diagram-filter` inverts them in the dark theme, so keep them grey
- Code highlighting with Shiki (`css-variables` theme, mapped to the palette in `base.css`). `src/plugins/rehype-post-chrome.mjs` turns each code block into a small window with a copy button and adds `#` links to headings; `src/plugins/rehype-wrap-wide.mjs` makes tables and diagrams scroll inside a focusable region
- Deployed to Cloudflare Pages on push to `main`

## Develop
`npm install`, then `npm run dev` or `npm run build` (Node 20).

## Corrections
A post can carry a dated correction note: add `correction: { date, text }` to its front matter. The note is shown as a window under the post header, the post header and the archive row carry a `corrected <month year>` badge, and the text goes into `feed.json`.
