import { getCollection } from 'astro:content';

const DESCRIPTION =
  'Write-ups of software I have built, mostly in Go. By Camil Benameur, software engineer in Nice, France.';

export async function GET() {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Camil Benameur - Blog',
    home_page_url: 'https://blog.camilbenameur.com/',
    feed_url: 'https://blog.camilbenameur.com/feed.json',
    description: DESCRIPTION,
    language: 'en',
    authors: [{ name: 'Camil Benameur', url: 'https://camilbenameur.com/' }],
    items: posts.map((post) => {
      const url = `https://blog.camilbenameur.com/blog/${post.slug}/`;
      const modified = post.data.correction?.date ?? post.data.updatedDate;
      const day = (d) => d.toISOString().slice(0, 10);
      return {
        id: url,
        url,
        title: post.data.title,
        summary: post.data.description,
        content_text: post.data.correction
          ? `Correction (${day(post.data.correction.date)}): ${post.data.correction.text}\n\n${post.data.description}`
          : post.data.description,
        date_published: post.data.pubDate.toISOString(),
        ...(modified ? { date_modified: modified.toISOString() } : {}),
        authors: [{ name: post.data.author }],
        tags: post.data.tags,
      };
    }),
  };
  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
