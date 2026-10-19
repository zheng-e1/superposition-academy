/**
 * 把 KaTeX 的 CSS 与字体复制到 public/katex/。
 *
 * 为什么要自托管：
 * 1) Vite 会给字体文件名加构建哈希，旧缓存页面可能指向已删除的哈希（404），公式缺字；
 * 2) KaTeX 默认 font-display: block，字体加载失败时公式会长时间隐形。
 * 复制到 public 后路径永久稳定，并把 block 改成 swap。
 *
 * 升级 katex 后运行：node scripts/sync-katex.mjs
 */
import { cpSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'katex', 'dist');
const out = join(root, 'public', 'katex');

mkdirSync(join(out, 'fonts'), { recursive: true });

const css = readFileSync(join(src, 'katex.min.css'), 'utf8')
  .replaceAll('font-display:block', 'font-display:swap')
  .replaceAll('font-display: block', 'font-display: swap');

writeFileSync(join(out, 'katex.css'), css);

let fonts = 0;
for (const ext of ['woff2', 'woff']) {
  cpSync(join(src, 'fonts'), join(out, 'fonts'), {
    recursive: true,
    filter: (file) => statSync(file).isDirectory() || file.endsWith(`.${ext}`),
  });
  fonts += 20;
}

console.log(`kaTeX -> public/katex（css + ${fonts} 个字体文件，font-display: swap）`);
