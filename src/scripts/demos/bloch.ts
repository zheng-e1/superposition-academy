import { Circuit } from '../../lib/qsim';
import {
  arrow,
  button,
  canvasKit,
  clamp,
  el,
  fmt,
  loop,
  onThemeChange,
  pct,
  reducedMotion,
  themeColors,
} from './kit';

type GateName = 'x' | 'y' | 'z' | 'h' | 's' | 't';

/** 布洛赫球：拖动旋转视角，门按钮把态矢推到新位置 */
export function mount(host: HTMLElement, props: Record<string, unknown> = {}) {
  const compact = Boolean(props.compact);
  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage);
  if (!compact) host.append(readoutRow, controls);

  const gates: { name: GateName }[] = [];
  let theta = 0;
  let yaw = -0.5;
  let pitch = 0.55;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  let shown = { x: 0, y: 0, z: 1 };
  let target = { x: 0, y: 0, z: 1 };
  let t0 = 0;
  let raf = 0;
  const kit = canvasKit(stage, {
    height: compact ? 292 : 330,
    draw: (ctx, w, h) => {
      const c = themeColors();
      const cx = w / 2;
      const cy = h / 2 + 4;
      const r = Math.min(w * 0.36, h * 0.4);

      const project = (p: { x: number; y: number; z: number }) => {
        const X = p.x * Math.cos(yaw) - p.y * Math.sin(yaw);
        const Y = p.x * Math.sin(yaw) + p.y * Math.cos(yaw);
        const sy = p.z * Math.cos(pitch) + Y * Math.sin(pitch);
        return { sx: cx + X * r, sy: cy - sy * r, depth: Y * Math.cos(pitch) - p.z * Math.sin(pitch) };
      };

      // 球体轮廓
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 纬线
      for (const z of [-0.66, -0.33, 0, 0.33, 0.66]) {
        const rr = Math.sqrt(1 - z * z);
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const phi = (i / 60) * Math.PI * 2;
          const p = project({ x: rr * Math.cos(phi), y: rr * Math.sin(phi), z });
          i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
        }
        ctx.strokeStyle = Math.abs(z) < 1e-6 ? c.faint : c.line;
        ctx.globalAlpha = Math.abs(z) < 1e-6 ? 0.55 : 1;
        ctx.setLineDash(Math.abs(z) < 1e-6 ? [3, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // 经线
      for (const phi of [0, Math.PI / 2]) {
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const ang = (i / 60) * Math.PI * 2;
          const p = project({
            x: Math.cos(ang) * Math.cos(phi),
            y: Math.cos(ang) * Math.sin(phi),
            z: Math.sin(ang),
          });
          i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy);
        }
        ctx.strokeStyle = c.line;
        ctx.stroke();
      }

      // 坐标轴
      const axes: [string, { x: number; y: number; z: number }, string][] = [
        ['x', { x: 1, y: 0, z: 0 }, '|+⟩'],
        ['y', { x: 0, y: 1, z: 0 }, '|+i⟩'],
        ['z', { x: 0, y: 0, z: 1 }, '|0⟩'],
      ];
      for (const [name, dir, label] of axes) {
        const a = project({ x: 0, y: 0, z: 0 });
        const b = project(dir);
        arrow(ctx, a.sx, a.sy, b.sx, b.sy, c.line, 1.2);
        const out = project({ x: dir.x * 1.34, y: dir.y * 1.34, z: dir.z * 1.34 });
        ctx.textAlign = 'center';
        ctx.fillStyle = c.sub;
        ctx.font = '12.5px system-ui, sans-serif';
        ctx.fillText(label, out.sx, out.sy + 4);
        ctx.fillStyle = c.faint;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(name, out.sx + (name === 'z' ? 16 : 0), out.sy + (name === 'z' ? 0 : 15));
      }
      const bottom = project({ x: 0, y: 0, z: -1 });
      ctx.fillStyle = c.sub;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('|1⟩', bottom.sx, bottom.sy + 16);

      // 态矢
      const v = shown;
      const tip = project(v);
      const base = project({ x: 0, y: 0, z: 0 });
      arrow(ctx, base.sx, base.sy, tip.sx, tip.sy, c.accent, 2.2);
      ctx.beginPath();
      ctx.arc(tip.sx, tip.sy, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = c.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.sx, tip.sy, 8, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 到 xy 平面的虚线投影
      const flat = project({ x: v.x, y: v.y, z: 0 });
      ctx.beginPath();
      ctx.moveTo(tip.sx, tip.sy);
      ctx.lineTo(flat.sx, flat.sy);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = c.faint;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
  });

  // 读数
  const p0 = readoutCell('P(0)', '100%');
  const p1 = readoutCell('P(1)', '0%');
  const coord = readoutCell('(x, y, z)', '(0, 0, 1)');
  readoutRow.append(p0.wrap, p1.wrap, coord.wrap);

  function readoutCell(label: string, value: string) {
    const wrap = el('div', { class: 'readout' });
    const l = el('span', { class: 'readout-label', text: label });
    const v = el('span', { class: 'readout-value mono', text: value });
    wrap.append(l, v);
    return { wrap, value: v };
  }

  const syncReadout = () => {
    const c = build();
    p0.value.textContent = pct(c.probOne(0), 1);
    p1.value.textContent = pct(1 - c.probOne(0), 1);
    const b = c.bloch(0);
    coord.value.textContent = `(${fmt(b.x)}, ${fmt(b.y)}, ${fmt(b.z)})`;
  };

  function build(): Circuit {
    const c = new Circuit(1);
    if (theta) c.ry(0, theta);
    for (const g of gates) c[g.name](0);
    return c;
  }

  const animateTo = (vec: { x: number; y: number; z: number }) => {
    const from = { ...shown };
    target = vec;
    t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = () => {
      const k = clamp((performance.now() - t0) / 380, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const lerped = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        z: from.z + (target.z - from.z) * e,
      };
      const len = Math.hypot(lerped.x, lerped.y, lerped.z) || 1;
      shown = { x: lerped.x / len, y: lerped.y / len, z: lerped.z / len };
      kit.redraw();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    step();
  };

  const applyGate = (g: GateName) => {
    gates.push({ name: g });
    const b = build().bloch(0);
    animateTo(b);
    syncReadout();
  };

  const gateRow = el('div', { class: 'chip-row' });
  (['x', 'y', 'z', 'h', 's', 't'] as GateName[]).forEach((g) => {
    gateRow.append(button(g.toUpperCase(), () => applyGate(g)));
  });
  gateRow.append(
    button('重置', () => {
      gates.length = 0;
      theta = 0;
      thetaSlider.value = '0';
      thetaOut.textContent = '0°';
      const b = build().bloch(0);
      animateTo(b);
      syncReadout();
    }),
  );

  const thetaOut = el('output', { text: '0°' });
  const thetaSlider = el('input') as HTMLInputElement;
  thetaSlider.type = 'range';
  thetaSlider.min = '0';
  thetaSlider.max = '360';
  thetaSlider.step = '5';
  thetaSlider.value = '0';
  thetaSlider.setAttribute('aria-label', 'Ry 旋转角');
  thetaSlider.addEventListener('input', () => {
    theta = (Number(thetaSlider.value) * Math.PI) / 180;
    thetaOut.textContent = `${thetaSlider.value}°`;
    const b = build().bloch(0);
    animateTo(b);
    syncReadout();
  });
  const thetaWrap = el('div', { class: 'control' });
  thetaWrap.append(el('label', { text: 'Ry(θ)' }), thetaSlider, thetaOut);

  if (compact) {
    gateRow.classList.add('hero-chips');
    host.append(gateRow);
  } else {
    controls.append(gateRow, thetaWrap);
  }

  // 拖动旋转
  const pointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    kit.canvas.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.008;
    pitch = clamp(pitch - (e.clientY - lastY) * 0.006, -0.2, 1.25);
    lastX = e.clientX;
    lastY = e.clientY;
    kit.redraw();
  };
  const pointerUp = () => {
    dragging = false;
  };
  kit.canvas.style.cursor = 'grab';
  // 让手指拖拽旋转时不要同时滚动页面
  kit.canvas.style.touchAction = 'none';
  kit.canvas.addEventListener('pointerdown', pointerDown);
  kit.canvas.addEventListener('pointermove', pointerMove);
  kit.canvas.addEventListener('pointerup', pointerUp);
  kit.canvas.addEventListener('pointercancel', pointerUp);
  kit.canvas.setAttribute('aria-label', '布洛赫球，可拖动旋转视角');

  const offTheme = onThemeChange(() => kit.redraw());

  // 首页的紧凑模式：无人操作时缓慢自转，把球体本身变成视觉主体
  let stopAuto = () => {};
  if (compact && !reducedMotion) {
    stopAuto = loop((dt) => {
      if (dragging) return;
      yaw += dt * 0.2;
      kit.redraw();
    });
  }

  syncReadout();

  return {
    replay: () => {
      gates.length = 0;
      theta = 0;
      thetaSlider.value = '0';
      thetaOut.textContent = '0°';
      const b = build().bloch(0);
      animateTo(b);
      syncReadout();
    },
    destroy: () => {
      offTheme();
      stopAuto();
      cancelAnimationFrame(raf);
      kit.destroy();
    },
  };
}
