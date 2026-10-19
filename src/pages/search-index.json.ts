import { loadCourse } from '../lib/course';

const plain = (body: string) =>
  body
    .replace(/^import .*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/[#>*_`~\[\]()|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET() {
  const course = await loadCourse();
  return new Response(
    JSON.stringify(
      course.flat.map((l) => ({
        slug: l.slug,
        title: l.title,
        thesis: l.thesis,
        part: l.part,
        partTitle: course.parts.find((p) => p.def.id === l.part)?.def.title ?? '',
        tag: l.tag,
        minutes: l.minutes,
        // 正文前 600 字，让本地搜索能命中正文里的术语，而不只是标题
        text: plain(l.entry.body ?? '').slice(0, 600),
      })),
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
