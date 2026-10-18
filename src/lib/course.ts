import { getCollection, type CollectionEntry } from 'astro:content';
import { PARTS, PART_BY_ID, type PartDef, type PartId } from '../data/course';

export type Lesson = CollectionEntry<'lessons'>;

export interface LessonNode {
  slug: string;
  title: string;
  thesis: string;
  tag: string;
  minutes: number;
  order: number;
  part: PartId;
  topic: string;
  entry: Lesson;
  readTime: number;
}

export interface TopicGroup {
  id: string;
  title: string;
  lessons: LessonNode[];
}

export interface PartGroup {
  def: PartDef;
  topics: TopicGroup[];
  lessons: LessonNode[];
  count: number;
  minutes: number;
}

export interface Course {
  parts: PartGroup[];
  flat: LessonNode[];
  bySlug: Map<string, LessonNode>;
  byIndex: Map<string, number>;
  totalMinutes: number;
}

let cached: Promise<Course> | null = null;

function toNode(entry: Lesson): LessonNode {
  return {
    slug: entry.data.slug,
    title: entry.data.title,
    thesis: entry.data.thesis,
    tag: entry.data.tag,
    minutes: entry.data.minutes,
    order: entry.data.order,
    part: entry.data.part,
    topic: entry.data.topic,
    entry,
    readTime: entry.data.minutes,
  };
}

/** 读取并组织课程结构（构建期调用，模块级缓存避免重复扫描） */
export function loadCourse(): Promise<Course> {
  if (!cached) cached = build();
  return cached;
}

async function build(): Promise<Course> {
  const entries = await getCollection('lessons', (e) => !e.data.draft);
  const nodes = entries.map(toNode).sort((a, b) => a.order - b.order);

  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.slug)) throw new Error(`课节 slug 重复：${n.slug}`);
    seen.add(n.slug);
    if (!PART_BY_ID.has(n.part)) throw new Error(`课节 ${n.slug} 的篇章 ${n.part} 不存在`);
  }

  const parts: PartGroup[] = [];
  for (const def of PARTS) {
    const mine = nodes.filter((n) => n.part === def.id);
    if (!mine.length) continue;
    const topicIds = new Set(def.topics.map((t) => t.id));
    for (const n of mine) {
      if (!topicIds.has(n.topic)) {
        throw new Error(`课节 ${n.slug} 的主题 ${n.topic} 不在 ${def.id} 的清单里`);
      }
    }
    const topics: TopicGroup[] = def.topics
      .map((t) => ({
        id: t.id,
        title: t.title,
        lessons: mine.filter((n) => n.topic === t.id),
      }))
      .filter((t) => t.lessons.length > 0);
    parts.push({
      def,
      topics,
      lessons: mine,
      count: mine.length,
      minutes: mine.reduce((s, n) => s + n.minutes, 0),
    });
  }

  const flat = parts.flatMap((p) => p.lessons);
  const bySlug = new Map(flat.map((n) => [n.slug, n]));
  const byIndex = new Map(flat.map((n, i) => [n.slug, i]));

  return {
    parts,
    flat,
    bySlug,
    byIndex,
    totalMinutes: flat.reduce((s, n) => s + n.minutes, 0),
  };
}

export function neighbours(course: Course, slug: string) {
  const i = course.byIndex.get(slug) ?? -1;
  return {
    index: i,
    prev: i > 0 ? course.flat[i - 1] : null,
    next: i >= 0 && i < course.flat.length - 1 ? course.flat[i + 1] : null,
  };
}

export function partOf(node: LessonNode): PartDef {
  const p = PART_BY_ID.get(node.part);
  if (!p) throw new Error(`未知篇章 ${node.part}`);
  return p;
}

export function topicTitle(node: LessonNode, course: Course): string {
  const part = course.parts.find((p) => p.def.id === node.part);
  return part?.topics.find((t) => t.id === node.topic)?.title ?? '';
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} 分钟`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}
