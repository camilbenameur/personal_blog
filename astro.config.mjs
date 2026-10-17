import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import remarkMermaid from 'remark-mermaidjs';
import rehypeWrapWide from './src/plugins/rehype-wrap-wide.mjs';
import rehypePostChrome from './src/plugins/rehype-post-chrome.mjs';

// Mermaid diagrams are rendered once at build time, in greys only (black on white). The shared token
// --diagram-filter (src/styles/tokens.css) inverts them in the dark theme and leaves them alone in the
// light one, for the stored choice and for the system preference. That is exact for greys: keep them grey.
const mermaidConfig = {
  theme: 'base',
  fontFamily: 'Arial, Helvetica, sans-serif',
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#f4f4f4',
    primaryTextColor: '#111111',
    primaryBorderColor: '#111111',
    lineColor: '#111111',
    secondaryColor: '#ffffff',
    tertiaryColor: '#ffffff',
    mainBkg: '#f4f4f4',
    nodeBorder: '#111111',
    clusterBkg: '#ffffff',
    clusterBorder: '#8a8a8a',
    edgeLabelBackground: '#ffffff',
    noteBkgColor: '#f4f4f4',
    noteTextColor: '#111111',
    noteBorderColor: '#8a8a8a',
  },
};

export default defineConfig({
  site: 'https://blog.camilbenameur.com',
  integrations: [mdx(), tailwind({ applyBaseStyles: false })],
  redirects: { '/blog': '/', '/fr/blog': '/fr/' },
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
      wrap: false,
      // Puts the language on the <pre> (data-language), which rehype-post-chrome shows in the code window bar.
      transformers: [
        {
          pre(node) {
            node.properties['data-language'] = this.options.lang;
          },
        },
      ],
    },
    remarkPlugins: [[remarkMermaid, { mermaidConfig }]],
    rehypePlugins: [rehypePostChrome, rehypeWrapWide],
  },
});
