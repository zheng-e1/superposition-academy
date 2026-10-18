import { loadCourse } from '../lib/course';
import { site } from '../config';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const course = await loadCourse();
  const items = [...course.flat]
    .reverse()
    .slice(0, 30)
    .map(
      (l) => `    <item>
      <title>${esc(l.title)}</title>
      <link>${site.url}/learn/${l.slug}</link>
      <guid isPermaLink="true">${site.url}/learn/${l.slug}</guid>
      <description>${esc(l.thesis)}</description>
      <category>${esc(course.parts.find((p) => p.def.id === l.part)?.def.title ?? '')}</category>
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} · ${esc(site.tagline)}</title>
    <link>${site.url}</link>
    <description>${esc(site.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
