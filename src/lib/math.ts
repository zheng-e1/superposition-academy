import katex from 'katex';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 把文本里的 $…$ 与 $$…$$ 渲染成 KaTeX，其余部分按字面转义。
 * 用在服务端（自测题、题库 JSON），避免把 300KB 的 katex 打包进客户端。
 */
export function renderMath(input: string): string {
  if (!input) return '';
  const parts = input.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const expr = part.slice(2, -2);
        try {
          return katex.renderToString(expr, { displayMode: true, throwOnError: false, strict: false });
        } catch {
          return escapeHtml(part);
        }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const expr = part.slice(1, -1);
        try {
          return katex.renderToString(expr, { displayMode: false, throwOnError: false, strict: false });
        } catch {
          return escapeHtml(part);
        }
      }
      return escapeHtml(part);
    })
    .join('');
}
