#!/usr/bin/env node
/**
 * 内容闸门：在 CI 里拦住最容易被漏掉的问题。
 * 用法：node scripts/check-content.mjs [--strict]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LESSONS = join(ROOT, 'src/content/lessons');
const strict = process.argv.includes('--strict');

const errors = [];
const warns = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warns.push(`${file}: ${msg}`);

/* ── 从 course.ts 里读出篇章与主题，避免再维护一份清单 ─────── */
const courseSrc = readFileSync(join(ROOT, 'src/data/course.ts'), 'utf8');
const partTopics = new Map();
for (const block of courseSrc.split(/\n  \{\n    id: '/).slice(1)) {
  const partId = block.slice(0, block.indexOf("'"));
  const topics = new Set(
    [...block.matchAll(/\{ id: '(t-[a-z0-9-]+)'/g)].map((m) => m[1]),
  );
  if (partId.startsWith('p-')) partTopics.set(partId, topics);
}

const glossarySrc = readFileSync(join(ROOT, 'src/data/glossary.ts'), 'utf8');
const glossaryIds = new Set([...glossarySrc.matchAll(/\{ id: '([a-z0-9-]+)'/g)].map((m) => m[1]));

const DEMOS = new Set([
  'polarizer',
  'amplitude',
  'interference',
  'bloch',
  'circuit',
  'grover',
  'bell',
  'bb84',
  'bitflip',
  'noise',
  'hardware',
]);

const TAGS = new Set(['概念', '交互', '动画', '反例', '深入', '实战']);
const BANNED = ['众所周知', '显然', '毋庸置疑', '不难发现', '秒杀经典', '彻底颠覆', '量子水'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.mdx') ? [full] : [];
  });
}

function countWords(body) {
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<Demo[\s\S]*?\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const cjk = (stripped.match(/[\u4e00-\u9fa5]/g) || []).length;
  const latin = (stripped.match(/[A-Za-z][A-Za-z0-9'’-]*/g) || []).length;
  return cjk + latin;
}

const files = walk(LESSONS).sort();
const slugs = new Map();
const orders = new Map();
let checked = 0;

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    fail(rel, '缺少 frontmatter');
    continue;
  }

  let data;
  try {
    data = parseYaml(m[1]);
  } catch (e) {
    fail(rel, `frontmatter 解析失败：${e.message.split('\n')[0]}`);
    continue;
  }

  const body = raw.slice(m[0].length);
  const need = ['slug', 'title', 'thesis', 'part', 'topic', 'tag', 'minutes', 'order', 'quiz', 'sources'];
  for (const key of need) {
    if (data[key] === undefined) fail(rel, `缺少字段 ${key}`);
  }
  if (!data.slug) continue;

  if (!/^[a-z0-9-]+$/.test(data.slug)) fail(rel, `slug 不合法：${data.slug}`);
  if (slugs.has(data.slug)) fail(rel, `slug 重复：${data.slug} 与 ${slugs.get(data.slug)}`);
  slugs.set(data.slug, rel);

  if (orders.has(data.order)) fail(rel, `order 重复：${data.order} 与 ${orders.get(data.order)}`);
  orders.set(data.order, rel);

  if (!partTopics.has(data.part)) {
    fail(rel, `篇章不存在：${data.part}`);
  } else if (!partTopics.get(data.part).has(data.topic)) {
    fail(rel, `主题 ${data.topic} 不属于 ${data.part}`);
  }

  if (!TAGS.has(data.tag)) fail(rel, `非法 tag：${data.tag}`);
  if (String(data.thesis || '').length > 40) warn(rel, `thesis 超过 40 字（${data.thesis.length}）`);

  const words = countWords(body);
  if (words < 300) fail(rel, `正文过短：${words} 字`);
  else if (words < 460) warn(rel, `正文偏短：${words} 字`);
  else if (words > 1100) warn(rel, `正文偏长：${words} 字`);

  if (!Array.isArray(data.quiz) || data.quiz.length < 2) {
    fail(rel, '自测题少于 2 道');
  } else {
    data.quiz.forEach((q, i) => {
      const n = i + 1;
      if (!q || !q.q) fail(rel, `第 ${n} 题缺题干`);
      if (!Array.isArray(q?.options) || q.options.length !== 4) fail(rel, `第 ${n} 题选项不是 4 个`);
      if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer > 3) fail(rel, `第 ${n} 题 answer 非法`);
      if (!q?.explain || String(q.explain).length < 20) fail(rel, `第 ${n} 题解析过短`);
    });
  }

  if (!Array.isArray(data.sources) || data.sources.length < 1) fail(rel, '缺少来源');

  for (const d of data.demos || []) {
    if (!DEMOS.has(d)) fail(rel, `未知演示：${d}`);
    if (!body.includes(`<Demo`) || !body.includes(`kind="${d}"`)) {
      fail(rel, `demos 声明了 ${d}，但正文没有对应 <Demo kind="${d}">`);
    }
  }

  for (const [, id] of body.matchAll(/<Term id="([a-z0-9-]+)"/g)) {
    if (!glossaryIds.has(id)) fail(rel, `术语 id 不存在于 glossary：${id}`);
  }

  if (!body.includes('<Misconception')) warn(rel, '没有 Misconception 块');
  if (!body.includes('<Conclusion')) warn(rel, '没有 Conclusion 块');

  for (const word of BANNED) {
    if (body.includes(word)) fail(rel, `出现禁词「${word}」`);
  }

  if (/^\s*<div/m.test(body)) warn(rel, '正文里直接用了 div，考虑改用组件');

  checked += 1;
}

console.log(`\n检查了 ${checked} / ${files.length} 个课节`);
if (warns.length) {
  console.log(`\n提示（${warns.length}）：`);
  for (const w of warns) console.log('  · ' + w);
}
if (errors.length) {
  console.log(`\n错误（${errors.length}）：`);
  for (const e of errors) console.log('  ✕ ' + e);
  process.exit(1);
}
if (strict && warns.length) {
  console.log('\n--strict 模式下提示也算失败');
  process.exit(1);
}
console.log('\n内容闸门通过。');
