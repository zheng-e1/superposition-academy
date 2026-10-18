#!/usr/bin/env node
/**
 * 修复 frontmatter 里以 YAML 指示符开头的裸标量（最常见的是 |0⟩、|+⟩）。
 * 用法：node scripts/fix-frontmatter.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = join(ROOT, 'src/content/lessons');
const dry = process.argv.includes('--dry');

const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const f = join(d, n);
    return statSync(f).isDirectory() ? walk(f) : f.endsWith('.mdx') ? [f] : [];
  });

// 需要引号保护的起始字符
const RISKY = /^([|>*&!%@`{[,-]\s|[|>])/;

function needsQuote(value) {
  if (!value) return false;
  if (/^['"]/.test(value)) return false;
  if (/^\|$/.test(value)) return false; // 合法的块标量
  return RISKY.test(value) || /^[|>]/.test(value);
}

let touched = 0;
for (const file of walk(dir)) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const fm = m[1];
  let changed = false;

  const lines = fm.split(/\r?\n/).map((line) => {
    // 列表项里带键：  - q: |0⟩ …
    let mm = line.match(/^(\s*)-\s+([A-Za-z_][\w-]*):\s+(.+)$/);
    if (mm && needsQuote(mm[3])) {
      changed = true;
      return `${mm[1]}- ${mm[2]}: "${mm[3].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    // 列表项：  - |0⟩
    mm = line.match(/^(\s*)-\s+(.+)$/);
    if (mm && needsQuote(mm[2])) {
      changed = true;
      return `${mm[1]}- "${mm[2].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    // 键值：  q: |0⟩ 与 |1⟩
    mm = line.match(/^(\s*)([A-Za-z_][\w-]*):\s+(.+)$/);
    if (mm && needsQuote(mm[3])) {
      changed = true;
      return `${mm[1]}${mm[2]}: "${mm[3].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return line;
  });

  if (!changed) continue;
  touched += 1;
  const next = raw.replace(fm, lines.join('\n'));
  if (!dry) writeFileSync(file, next, 'utf8');
  console.log(`${dry ? '[dry] ' : ''}fixed ${relative(ROOT, file)}`);
}

console.log(`\n${touched} 个文件需要修复`);
