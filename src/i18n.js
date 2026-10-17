// Two languages, one site. English keeps the original URLs (/, /blog/<slug>/, /feed.json);
// French lives under /fr/ (/fr/, /fr/blog/<slug>/, /fr/feed.json).
// A French post is a file in src/content/blog/fr/ with `lang: "fr"` and `slug: "fr/<english slug>"`:
// the two versions of a post share the English slug, which is how the language switch finds the other one.

export const LANGS = ['en', 'fr'];

const STRINGS = {
  en: {
    locale: 'en-US',
    siteDescription: 'Write-ups of software I have built, mostly in Go. By Camil Benameur, software engineer in Nice, France.',
    archiveDescription: 'Write-ups of software I have built, mostly in Go.',
    feedTitle: 'Camil Benameur - Blog',
    skip: 'Skip to content',
    nav: { home: 'Home', archive: 'Archive', feed: 'Feed', menu: 'Menu', primary: 'Primary' },
    themeFlip: 'Switch between dark and light theme',
    blog: 'Blog',
    noPosts: 'No posts yet.',
    corrected: 'corrected',
    updated: 'updated',
    correction: 'Correction',
    previous: 'Previous',
    next: 'Next',
    morePosts: 'More posts',
    switchLabel: 'FR',
    switchName: 'Français',
    switchAria: 'Lire cette page en français',
  },
  fr: {
    locale: 'fr-FR',
    siteDescription: "Retours d'expérience sur des logiciels que j'ai construits, surtout en Go. Par Camil Benameur, ingénieur logiciel à Nice.",
    archiveDescription: "Retours d'expérience sur des logiciels que j'ai construits, surtout en Go.",
    feedTitle: 'Camil Benameur - Blog',
    skip: 'Aller au contenu',
    nav: { home: 'Accueil', archive: 'Archives', feed: 'Flux', menu: 'Menu', primary: 'Navigation principale' },
    themeFlip: 'Basculer entre thème sombre et clair',
    blog: 'Blog',
    noPosts: "Aucun article pour l'instant.",
    corrected: 'corrigé',
    updated: 'mis à jour',
    correction: 'Correction',
    previous: 'Précédent',
    next: 'Suivant',
    morePosts: "Autres articles",
    switchLabel: 'EN',
    switchName: 'English',
    switchAria: 'Read this page in English',
  },
};

export const t = (lang) => STRINGS[lang] ?? STRINGS.en;
export const otherLang = (lang) => (lang === 'fr' ? 'en' : 'fr');

/** Language of a post (front matter `lang`, English by default). */
export const postLang = (post) => post.data.lang ?? 'en';
/** The English slug shared by both versions of a post. */
export const baseSlug = (post) => post.slug.replace(/^fr\//, '');

export const homeUrl = (lang) => (lang === 'fr' ? '/fr/' : '/');
export const feedUrl = (lang) => (lang === 'fr' ? '/fr/feed.json' : '/feed.json');
export const postUrl = (lang, slug) => (lang === 'fr' ? `/fr/blog/${slug}/` : `/blog/${slug}/`);
