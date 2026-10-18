import { loadCourse } from '../lib/course';

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
      })),
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
