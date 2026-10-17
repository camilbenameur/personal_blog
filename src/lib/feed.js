import { postsIn } from './posts.js';
import { baseSlug, feedUrl, homeUrl, postUrl, t } from '../i18n.js';

const SITE = 'https://blog.camilbenameur.com';

/** JSON Feed 1.1 for one language (/feed.json in English, /fr/feed.json in French). */
export async function feedResponse(lang) {
  const s = t(lang);
  const posts = await postsIn(lang);
  const day = (d) => d.toISOString().slice(0, 10);
  const correctionLabel = lang === 'fr' ? 'Correction du' : 'Correction';
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: s.feedTitle,
    home_page_url: `${SITE}${homeUrl(lang)}`,
    feed_url: `${SITE}${feedUrl(lang)}`,
    description: s.siteDescription,
    language: lang,
    authors: [{ name: 'Camil Benameur', url: 'https://camilbenameur.com/' }],
    items: posts.map((post) => {
      const url = `${SITE}${postUrl(lang, baseSlug(post))}`;
      const modified = post.data.correction?.date ?? post.data.updatedDate;
      return {
        id: url,
        url,
        title: post.data.title,
        summary: post.data.description,
        content_text: post.data.correction
          ? `${correctionLabel} (${day(post.data.correction.date)}): ${post.data.correction.text}\n\n${post.data.description}`
          : post.data.description,
        date_published: post.data.pubDate.toISOString(),
        ...(modified ? { date_modified: modified.toISOString() } : {}),
        authors: [{ name: post.data.author }],
        tags: post.data.tags,
        language: lang,
      };
    }),
  };
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
