import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const quizItem = z.object({
  q: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.number().int().min(0).max(3),
  explain: z.string(),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'slug 只能用小写字母、数字和连字符'),
    title: z.string(),
    thesis: z.string(),
    part: z.enum([
      'p-start',
      'p-intuition',
      'p-math',
      'p-qubit',
      'p-entangle',
      'p-algo',
      'p-hw',
      'p-app',
      'p-lab',
      'p-sweet',
    ]),
    topic: z.string(),
    tag: z.enum(['概念', '交互', '动画', '反例', '深入', '实战']),
    minutes: z.number().min(2).max(30),
    order: z.number(),
    demos: z.array(z.string()).default([]),
    quiz: z.array(quizItem).min(2),
    sources: z.array(z.string()).min(1),
    updated: z
      .union([z.string(), z.date()])
      .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
