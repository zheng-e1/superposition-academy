import { button, canvasKit, el, onThemeChange, pct, themeColors } from './kit';

/**
 * Grover：振幅放大。直接演示「神谕取反 + 关于均值翻转」两步迭代，
 * 柱高是概率幅，标记项在每一步之后肉眼可见地长起来。
 */
export function mount(host: HTMLElement) {
  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage, readoutRow, controls);

  let n = 3;
  let iters = 0;
  const maxIters = 8;

  const target = () => (1 << n) - 1;

  const ampsAt = (k: number) => {
    const N = 1 << n;
    let amps = new Array(N).fill(1 / Math.sqrt(N));
    const m = target();
    for (let step = 0; step < k; step++) {
      amps[m] = -amps[m];
      const mean = amps.reduce((a, b) => a + b, 0) / N;
      amps = amps.map((a) => 2 * mean - a);
    }
    return amps;
  };

  const successAt = (k: number) => {
    const a = ampsAt(k);
    return a[target()] ** 2;
  };

  const kit = canvasKit(stage, {
    height: 250,
    draw: (ctx, w, h) => {
      const c = themeColors();
      const N = 1 << n;
      const amps = ampsAt(iters);
      const baseY = h - 46;
      const barMax = h - 96;
      const slot = w / N;
      const bw = Math.min(46, slot * 0.55);
      const m = target();

      ctx.beginPath();
      ctx.moveTo(0, baseY + 0.5);
      ctx.lineTo(w, baseY + 0.5);
      ctx.strokeStyle = c.line;
      ctx.stroke();

      for (let i = 0; i < N; i++) {
        const cx = slot * (i + 0.5);
        const a = amps[i];
        const bh = Math.max(Math.abs(a) * barMax, 1.5);
        const pos = a >= 0;
        const x = cx - bw / 2;
        const y = pos ? baseY - bh : baseY;
        ctx.fillStyle = i === m ? c.accent : c.faint;
        ctx.globalAlpha = i === m ? 0.85 : 0.28;
        ctx.fillRect(x, y, bw, bh);
        ctx.globalAlpha = 1;
        if (i === m) {
          ctx.strokeStyle = c.accent;
          ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
        }
        ctx.fillStyle = i === m ? c.ink : c.faint;
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`|${i.toString(2).padStart(n, '0')}⟩`, cx, baseY + 16);
      }

      // 均值线：扩散算子围绕它翻转
      const mean = amps.reduce((x, y) => x + y, 0) / N;
      const my = baseY - mean * barMax;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, my);
      ctx.lineTo(w, my);
      ctx.strokeStyle = c.phase;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.phase;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('均值', w - 6, my - 6);
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
  const pCell = cell('命中概率', '12.5%');
  const qCell = cell('查询次数', '0');
  const classicCell = cell('经典期望', '4.0 次');
  readoutRow.append(pCell.wrap, qCell.wrap, classicCell.wrap);

  const curve = el('canvas', { class: 'cj-curve' });
  stage.append(curve);
  const drawCurve = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = curve.clientWidth || 320;
    const h = 54;
    curve.width = w * dpr;
    curve.height = h * dpr;
    const ctx = curve.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const c = themeColors();
    const N = 1 << n;
    ctx.beginPath();
    for (let k = 0; k <= maxIters; k++) {
      const p = successAt(k);
      const x = (k / maxIters) * (w - 16) + 8;
      const y = h - 6 - p * (h - 12);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = c.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 当前迭代点
    const x = (iters / maxIters) * (w - 16) + 8;
    const y = h - 6 - successAt(iters) * (h - 12);
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = c.phase;
    ctx.fill();

    ctx.fillStyle = c.faint;
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('P(命中) 随迭代次数变化', 8, 12);
    ctx.textAlign = 'right';
    ctx.fillText(`N = ${N}`, w - 8, 12);
  };

  const sync = () => {
    const N = 1 << n;
    pCell.value.textContent = pct(successAt(iters), 1);
    qCell.value.textContent = String(iters);
    classicCell.value.textContent = `${(N / 2).toFixed(1)} 次`;
    kit.redraw();
    drawCurve();
  };

  const out = el('output', { text: '0' });
  const range = el('input') as HTMLInputElement;
  range.type = 'range';
  range.min = '0';
  range.max = String(maxIters);
  range.step = '1';
  range.value = '0';
  range.setAttribute('aria-label', 'Grover 迭代次数');
  range.addEventListener('input', () => {
    iters = Number(range.value);
    out.textContent = range.value;
    sync();
  });
  const iterWrap = el('div', { class: 'control' });
  iterWrap.append(el('label', { text: '迭代 k' }), range, out);

  const sizeRow = el('div', { class: 'chip-row' });
  for (const q of [2, 3, 4]) {
    const b = button(`${1 << q} 项`, () => {
      n = q;
      iters = 0;
      range.value = '0';
      out.textContent = '0';
      sizeRow.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      sync();
    });
    b.setAttribute('aria-pressed', String(q === n));
    sizeRow.append(b);
  }

  const optimal = button('跳到最优步数', () => {
    const k = Math.max(0, Math.round((Math.PI / 4) * Math.sqrt(1 << n) - 0.5));
    iters = Math.min(k, maxIters);
    range.value = String(iters);
    out.textContent = String(iters);
    sync();
  });

  controls.append(sizeRow, iterWrap, optimal);
  sync();

  const offTheme = onThemeChange(() => sync());
  const ro = new ResizeObserver(() => drawCurve());
  ro.observe(stage);

  return {
    replay: () => {
      n = 3;
      iters = 0;
      range.value = '0';
      out.textContent = '0';
      sizeRow.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(i === 1)));
      sync();
    },
    destroy: () => {
      offTheme();
      ro.disconnect();
      kit.destroy();
    },
  };
}
