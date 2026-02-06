import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import remarkMermaid from 'remark-mermaidjs';

export default defineConfig({
  site: 'https://blog.camilbenameur.com',
  integrations: [mdx(), tailwind()],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true,
    },
    remarkPlugins: [remarkMermaid],
  },
});
