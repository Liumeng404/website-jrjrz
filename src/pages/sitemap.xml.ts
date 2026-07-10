import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.origin || 'https://www.jrjrz.com').replace(/\/$/, '');

  // 文章按发布日期倒序
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  type Entry = { loc: string; lastmod: string };
  const entries: Entry[] = [
    { loc: `${origin}/`, lastmod: toDateStr(new Date()) },
    {
      loc: `${origin}/blog/`,
      lastmod: posts[0] ? toDateStr(posts[0].data.pubDate) : toDateStr(new Date()),
    },
    { loc: `${origin}/about/`, lastmod: toDateStr(new Date()) },
    ...posts.map((post) => ({
      loc: `${origin}/blog/${post.id}/`,
      lastmod: toDateStr(post.data.pubDate), // 发布日期
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
