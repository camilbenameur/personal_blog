// Post chrome added at build time (classes from src/styles/base.css):
//  1. a `#` permalink inside every h2 and h3 (shown on hover or focus by base.css);
//  2. every Shiki code block becomes a small window: <figure class="win code"> with a bar
//     (language label, copy button) around the <pre>. The copy button is wired by /ui.js.
// Runs after Shiki (Astro highlights before user rehype plugins) and before Astro assigns heading ids,
// so it assigns the ids itself, the way Astro does (github-slugger, one slugger per document, trailing
// dash removed): same slugs as before, same de-duplication. Astro's later pass sees the ids and keeps them.
import Slugger from 'github-slugger';

const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

const hasClass = (node, name) => {
  const c = node.properties?.className;
  return Array.isArray(c) ? c.includes(name) : typeof c === 'string' && c.split(/\s+/).includes(name);
};
const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

// The language comes from the Shiki transformer in astro.config.mjs (attribute data-language on the <pre>).
// A fence without a language is highlighted as "plaintext".
const languageLabel = (pre) => {
  const lang = String(pre.properties?.dataLanguage ?? '').trim().toLowerCase();
  return !lang || lang === 'plaintext' || lang === 'plain' ? 'text' : lang;
};

const codeWindow = (pre) =>
  el('figure', { className: ['win', 'code'] }, [
    el('div', { className: ['win__bar'] }, [
      el('span', { className: ['dots'], ariaHidden: 'true' }, [el('i'), el('i'), el('i')]),
      el('span', { className: ['win__title'] }, [text(languageLabel(pre))]),
      el('button', { className: ['copy'], type: 'button', ariaLabel: 'Copy code' }, [
        // No aria-live here: a live region inside a button is not announced. /ui.js announces "Copied" through
        // one status region at the end of <body> (see public/ui.js for the data attributes).
        el('span', { className: ['copy__label'] }, [text('copy')]),
      ]),
    ]),
    pre,
  ]);

// The `#` link names the section it points to, so the links in a screen reader's list are told apart.
const permalink = (id, heading) =>
  el('a', { className: ['anchor'], href: `#${id}`, ariaLabel: `Link to section: ${heading}` }, [text('#')]);

// The heading's accessible name is its own text only: the text sits in a span and the heading points to it
// with aria-labelledby (otherwise the `#` link, which comes first, would put its label at the start of every
// heading name). The span id ends in ".label"; a slug never contains a dot, so it cannot clash with a heading id.
const withPermalink = (heading) => {
  const id = heading.properties.id;
  const label = `${id}.label`;
  const name = textOf(heading).trim();
  heading.properties.ariaLabelledBy = label;
  heading.children = [permalink(id, name), el('span', { id: label }, heading.children)];
};

const isHeading = (node) => /^h[1-6]$/.test(node.tagName);

function walk(parent, state, inCode = false) {
  parent.children = (parent.children ?? []).map((child) => {
    if (child.type !== 'element') return child;
    if (isHeading(child)) {
      child.properties ??= {};
      if (typeof child.properties.id !== 'string') {
        const slug = state.slugger.slug(textOf(child));
        child.properties.id = slug.endsWith('-') ? slug.slice(0, -1) : slug;
      }
      if (child.tagName === 'h2' || child.tagName === 'h3') withPermalink(child);
      return child;
    }
    if (child.tagName === 'pre' && hasClass(child, 'astro-code') && !inCode) return codeWindow(child);
    walk(child, state, inCode || (child.tagName === 'figure' && hasClass(child, 'code')));
    return child;
  });
}

export default function rehypePostChrome() {
  return (tree) => walk(tree, { slugger: new Slugger() });
}
