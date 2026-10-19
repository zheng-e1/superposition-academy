import { Circuit } from '../../lib/qsim';
import {
  button,
  canvasKit,
  clamp,
  el,
  fmt,
  onThemeChange,
  pct,
  themeColors,
} from './kit';

/**
 * 振幅图：柱高 = 概率幅的模，柱顶的指针 = 相位。
 * 支持 1 比特与 2 比特两种模式（2 比特用来看张量积与纠缠）。
 */
export function mount(host: HTMLElement, props: Record<string, unknown> = {}) {
  const n = props.qubits === 2 ? 2 : 1;

  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage, readoutRow, controls);

  type Op = { g: string; q?: number; t?: number };
  let ops: Op[] = [];
  let theta = 0;

  const build = () => {
    const c = new Circuit(n);
    for (const op of ops) {
      if (op.g === 'cnot') c.cx(op.q ?? 0, op.t ?? 1);
      else if (op.g === 'cz') c.cz(op.q ?? 0, op.t ?? 1);
      else (c as any)[op.g](op.q ?? 0);
    }
    // 滑块是「在已选的门外，再对第 0 位做一次 Ry(θ)」。
    // 早先只在 ops 里出现 ry 时才用 theta，但没有任何按钮会 push 它，滑块因此失效。
    if (theta !== 0) c.ry(0, theta);
    return c;
  };

  let shown: number[] = new Array(1 << n).fill(0);
  let shownPhase: number[] = new Array(1 << n).fill(0);
  let raf = 0;

  const kit = canvasKit(stage, {
    height: n === 2 ? 250 : 240,
    draw: (ctx, w, h) => {
      const c = themeColors();
      const states = 1 << n;
      const baseY = h - 52;
      const barMax = h - 108;
      const slot = w / states;
      const bw = Math.min(56, slot * 0.46);

      // 基线
      ctx.beginPath();
      ctx.moveTo(0, baseY + 0.5);
      ctx.lineTo(w, baseY + 0.5);
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 0; i < states; i++) {
        const cx = slot * (i + 0.5);
        const mag = shown[i];
        const phase = shownPhase[i];
        const bh = Math.max(mag * barMax, 1.5);

        // 柱体
        ctx.beginPath();
        const r = 5;
        const x = cx - bw / 2;
        const y = baseY - bh;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + bw, y, x + bw, baseY, r);
        ctx.arcTo(x + bw, baseY, x, baseY, 0);
        ctx.arcTo(x, baseY, x, y, 0);
        ctx.arcTo(x, y, x + bw, y, r);
        ctx.closePath();
        ctx.fillStyle = c.accent;
        ctx.globalAlpha = 0.16;
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 相位指针
        const dialY = y - 17;
        const rad = 11;
        ctx.beginPath();
        ctx.arc(cx, dialY, rad, 0, Math.PI * 2);
        ctx.strokeStyle = c.line;
        ctx.stroke();
        const px = cx + Math.cos(-phase) * (rad - 2);
        const py = dialY + Math.sin(-phase) * (rad - 2);
        ctx.beginPath();
        ctx.moveTo(cx, dialY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = c.phase;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = c.phase;
        ctx.fill();

        // 标签
        ctx.textAlign = 'center';
        ctx.fillStyle = c.ink;
        ctx.font = '600 12.5px ui-monospace, monospace';
        ctx.fillText(n === 1 ? `|${i}⟩` : `|${i.toString(2).padStart(n, '0')}⟩`, cx, baseY + 19);
        ctx.fillStyle = c.sub;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(pct(mag * mag, 1), cx, baseY + 35);
      }

      // 纵轴标注
      ctx.save();
      ctx.translate(12, baseY - barMax / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = c.faint;
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('|amplitude|', 0, 0);
      ctx.restore();
    },
  });

  const cell = (label: string, value: string) => {
    const wrap = el('div', { class: 'readout' });
    wrap.append(
      el('span', { class: 'readout-label', text: label }),
      el('span', { class: 'readout-value mono', text: value }),
    );
    return { wrap, value: wrap.lastElementChild as HTMLElement };
  };

  const pTop = cell('最可能结果', '|0⟩');
  const norm = cell('总概率', '100%');
  readoutRow.append(pTop.wrap, norm.wrap);

  const sync = () => {
    const c = build();
    const amps = c.amplitudes();
    const probs = c.probabilities();
    const mags = amps.map((a) => Math.hypot(a.re, a.im));
    const phases = amps.map((a) => Math.atan2(a.im, a.re));
    const first = { mags: shown.slice(), phases: shownPhase.slice() };
    const start = performance.now();
    cancelAnimationFrame(raf);
    const step = () => {
      const k = clamp((performance.now() - start) / 320, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      shown = mags.map((m, i) => first.mags[i] + (m - first.mags[i]) * e);
      shownPhase = phases.map((p, i) => {
        let d = p - first.phases[i];
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return first.phases[i] + d * e;
      });
      kit.redraw();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    step();

    let best = 0;
    probs.forEach((p, i) => {
      if (p > probs[best]) best = i;
    });
    pTop.value.textContent = n === 1 ? `|${best}⟩` : `|${best.toString(2).padStart(n, '0')}⟩`;
    norm.value.textContent = pct(probs.reduce((a, b) => a + b, 0), 0);
  };

  const chipRow = el('div', { class: 'chip-row' });
  const gateButtons: [string, () => void][] = [
    ['H', () => ops.push({ g: 'h', q: 0 })],
    ['X', () => ops.push({ g: 'x', q: 0 })],
    ['Z', () => ops.push({ g: 'z', q: 0 })],
    ['S', () => ops.push({ g: 's', q: 0 })],
    ['T', () => ops.push({ g: 't', q: 0 })],
  ];
  if (n === 2) {
    gateButtons.push(['H₁', () => ops.push({ g: 'h', q: 1 })]);
    gateButtons.push(['CNOT', () => ops.push({ g: 'cnot', q: 0, t: 1 })]);
  }
  gateButtons.push([
    '重置',
    () => {
      ops = [];
      theta = 0;
      rySlider.value = '0';
      ryOut.textContent = '0°';
    },
  ]);

  for (const [label, fn] of gateButtons) {
    chipRow.append(
      button(label, () => {
        fn();
        sync();
      }),
    );
  }

  const ryOut = el('output', { text: '0°' });
  const rySlider = el('input') as HTMLInputElement;
  rySlider.type = 'range';
  rySlider.min = '0';
  rySlider.max = '360';
  rySlider.step = '5';
  rySlider.value = '0';
  rySlider.setAttribute('aria-label', 'Ry 旋转角');
  rySlider.addEventListener('input', () => {
    theta = (Number(rySlider.value) * Math.PI) / 180;
    ryOut.textContent = `${rySlider.value}°`;
    sync();
  });
  const ryWrap = el('div', { class: 'control' });
  ryWrap.append(el('label', { text: 'Ry(θ)' }), rySlider, ryOut);

  controls.append(chipRow, ryWrap);

  // 预设：开局先给一个 H，页面一打开就有东西看
  ops.push({ g: 'h', q: 0 });
  if (n === 2) ops.push({ g: 'h', q: 1 });
  sync();

  const offTheme = onThemeChange(() => kit.redraw());

  return {
    replay: () => {
      ops = [{ g: 'h', q: 0 }];
      if (n === 2) ops.push({ g: 'h', q: 1 });
      theta = 0;
      rySlider.value = '0';
      ryOut.textContent = '0°';
      shown = new Array(1 << n).fill(0);
      shownPhase = new Array(1 << n).fill(0);
      sync();
    },
    destroy: () => {
      offTheme();
      cancelAnimationFrame(raf);
      kit.destroy();
    },
  };
}
