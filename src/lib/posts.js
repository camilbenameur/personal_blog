import { getCollection } from 'astro:content';
import { baseSlug, postLang, postUrl } from '../i18n.js';

/** Published posts in one language, newest first. */
export async function postsIn(lang) {
  return (await getCollection('blog', ({ data }) => !data.draft && (data.lang ?? 'en') === lang)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/** getStaticPaths for one language: params.slug is the English slug, props carry neighbours and alternates. */
export async function postPaths(lang) {
  const all = await getCollection('blog', ({ data }) => !data.draft);
  const translated = new Map(); // English slug -> { en: path, fr: path }
  for (const p of all) {
    const key = baseSlug(p);
    translated.set(key, { ...translated.get(key), [postLang(p)]: postUrl(postLang(p), key) });
  }
  // Oldest first: the previous post is the older one, the next post the newer one.
  const posts = all.filter((p) => postLang(p) === lang).sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
  return posts.map((post, i) => ({
    params: { slug: baseSlug(post) },
    props: { post, previous: posts[i - 1], next: posts[i + 1], alternates: translated.get(baseSlug(post)) },
  }));
}
