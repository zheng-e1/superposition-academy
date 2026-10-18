/** 演示组件的公共工具：Canvas、可见性、主题、动画帧。 */

export const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface CanvasKit {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  redraw: () => void;
  destroy: () => void;
}

export interface ThemeColors {
  ink: string;
  sub: string;
  faint: string;
  line: string;
  accent: string;
  teal: string;
  phase: string;
  danger: string;
  success: string;
  card: string;
  bg: string;
}

export function themeColors(): ThemeColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    ink: v('--ink', '#191a1e'),
    sub: v('--sub', '#5d626b'),
    faint: v('--faint', '#8b9098'),
    line: v('--line', 'rgba(0,0,0,.09)'),
    accent: v('--accent', '#1f5f8b'),
    teal: v('--teal', '#0f766e'),
    phase: v('--phase', '#b45309'),
    danger: v('--danger', '#b42318'),
    success: v('--success', '#1c7a4c'),
    card: v('--card', '#fff'),
    bg: v('--bg', '#f7f6f2'),
  };
}

export function onThemeChange(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

/** 建立一张自适应宽高、按 DPR 缩放的画布；draw 在每帧或尺寸变化时调用 */
export function canvasKit(
  host: HTMLElement,
  opts: { height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void },
): CanvasKit {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = `${opts.height}px`;
  canvas.style.display = 'block';
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 canvas 2d');

  let width = 0;
  let height = opts.height;

  const measure = () => {
    let w = host.getBoundingClientRect().width;
    if (w < 80) w = host.parentElement?.getBoundingClientRect().width ?? 0;
    if (w < 80) w = 360;
    return w;
  };

  const paint = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    width = measure();
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    opts.draw(ctx, width, height);
  };

  const ro = new ResizeObserver(() => paint());
  ro.observe(host);
  paint();
  requestAnimationFrame(paint);

  return {
    canvas,
    ctx,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    redraw: paint,
    destroy: () => ro.disconnect(),
  };
}

/** 元素进入视口后执行一次（带 200px 提前量） */
export function onceVisible(el: Element, cb: () => void) {
  if (!('IntersectionObserver' in window)) {
    cb();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.disconnect();
          cb();
          return;
        }
      }
    },
    { rootMargin: '200px 0px' },
  );
  io.observe(el);
}

/** 简单动画循环，返回停止函数 */
export function loop(tick: (dt: number, t: number) => void) {
  let raf = 0;
  let last = performance.now();
  let running = true;
  const step = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tick(dt, now / 1000);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => {
    running = false;
    cancelAnimationFrame(raf);
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—';
  const v = Math.abs(x) < 1e-10 ? 0 : x;
  return v.toFixed(digits).replace(/\.?0+$/, '') || '0';
}

export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** 度数 → 弧度 */
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** 画箭头 */
export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1.6,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = 7;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
  ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

/** 圆角矩形路径 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('data-')) node.setAttribute(k, v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

/** 生成一个标准的读数行：标签 + 值 */
export function readout(label: string, value: string) {
  const row = el('div', { class: 'readout' });
  const l = el('span', { class: 'readout-label', text: label });
  const v = el('span', { class: 'readout-value mono', text: value });
  row.append(l, v);
  return { row, value: v };
}

export function controlRow(children: (HTMLElement | string)[]) {
  const row = el('div', { class: 'controls' });
  for (const c of children) row.append(c);
  return row;
}

export function slider(
  label: string,
  opts: { min: number; max: number; step: number; value: number; onInput: (v: number) => void },
) {
  const wrap = el('div', { class: 'control' });
  const lab = el('label', { text: label });
  const input = el('input') as HTMLInputElement;
  input.type = 'range';
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  input.value = String(opts.value);
  const out = el('output', { text: String(opts.value) });
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = String(v);
    opts.onInput(v);
  });
  wrap.append(lab, input, out);
  return wrap;
}

export function toggle(label: string, opts: { value: boolean; onChange: (v: boolean) => void }) {
  const btn = el('button', { class: 'chip' }) as HTMLButtonElement;
  btn.type = 'button';
  btn.textContent = label;
  btn.setAttribute('aria-pressed', String(opts.value));
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(next));
    opts.onChange(next);
  });
  return btn;
}

export function button(label: string, onClick: () => void, cls = 'chip') {
  const btn = el('button', { class: cls }) as HTMLButtonElement;
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
