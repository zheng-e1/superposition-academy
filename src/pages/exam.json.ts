import type { APIRoute } from 'astro';
import { loadCourse } from '../lib/course';
import { PART_BY_ID } from '../data/course';
import { renderMath } from '../lib/math';

export const GET: APIRoute = async () => {
  const course = await loadCourse();
  const items = course.flat.flatMap((lesson) =>
    lesson.entry.data.quiz.map((q) => ({
      slug: lesson.slug,
      title: lesson.title,
      part: lesson.part,
      partTitle: PART_BY_ID.get(lesson.part)?.title ?? '',
      q: renderMath(q.q),
      options: q.options.map((o) => renderMath(o)),
      answer: q.answer,
      explain: renderMath(q.explain),
    })),
  );
  return new Response(JSON.stringify({ total: items.length, items }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
