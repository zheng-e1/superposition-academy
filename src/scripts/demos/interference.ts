import { canvasKit, el, onThemeChange, pct, themeColors, toggle } from './kit';

/**
 * 双缝：两条路径的相位差决定亮纹位置。
 * 打开「哪条路探测器」后，相位关系被破坏，条纹消失成均匀分布。
 */
export function mount(host: HTMLElement) {
  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage, readoutRow, controls);

  let spacing = 60; // 缝间距（像素）
  let whichPath = false;
  let phase = 0;
  let hits = 0;

  type Hit = { y: number; a: number };
  const marks: Hit[] = [];

  const H = 300;
  const kit = canvasKit(stage, {
    height: H,
    draw: (ctx, w, h) => {
      const c = themeColors();
      const cy = h / 2;
      const barrierX = w * 0.36;
      const screenX = w - 34;
      const half = Math.min(h / 2 - 12, 130);

      ctx.fillStyle = c.card;
      ctx.fillRect(0, 0, w, h);

      // 屏幕
      ctx.fillStyle = c.card;
      ctx.fillRect(screenX, 10, 16, h - 20);
      ctx.strokeStyle = c.line;
      ctx.strokeRect(screenX + 0.5, 10.5, 15, h - 21);

      // 波前（只画在挡板与屏之间的区域）
      const slits = [cy - spacing / 2, cy + spacing / 2];
      ctx.save();
      ctx.beginPath();
      ctx.rect(barrierX, 0, screenX - barrierX, h);
      ctx.clip();
      for (const sy of slits) {
        for (let k = 0; k < 6; k++) {
          const r = ((phase * 46 + k * 32) % 180) + 6;
          ctx.beginPath();
          ctx.arc(barrierX, sy, r, -Math.PI / 2, Math.PI / 2);
          ctx.strokeStyle = whichPath ? c.faint : c.teal;
          ctx.globalAlpha = Math.max(0, 0.3 * (1 - r / 190));
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();

      // 入射光路
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = c.faint;
      ctx.globalAlpha = 0.45;
      for (const sy of slits) {
        ctx.beginPath();
        ctx.moveTo(28, cy);
        ctx.lineTo(barrierX, sy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // 标注
      ctx.fillStyle = c.faint;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('光子源', 14, cy - 14);
      ctx.textAlign = 'right';
      ctx.fillText('双缝', barrierX - 8, 20);
      ctx.textAlign = 'left';
      ctx.fillText('屏', screenX + 18, 20);

      // 挡板
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barrierX, 10);
      ctx.lineTo(barrierX, slits[0] - 5);
      ctx.moveTo(barrierX, slits[0] + 5);
      ctx.lineTo(barrierX, slits[1] - 5);
      ctx.moveTo(barrierX, slits[1] + 5);
      ctx.lineTo(barrierX, h - 10);
      ctx.stroke();

      // 缝口
      for (const sy of slits) {
        ctx.beginPath();
        ctx.arc(barrierX, sy, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = whichPath ? c.faint : c.teal;
        ctx.fill();
      }

      // 光源
      ctx.beginPath();
      ctx.arc(24, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = c.phase;
      ctx.fill();

      // 命中点
      for (const m of marks) {
        ctx.globalAlpha = m.a * 0.55;
        ctx.fillStyle = c.accent;
        ctx.fillRect(screenX + 3, m.y, 10, 1.6);
      }
      ctx.globalAlpha = 1;

      // 强度曲线
      const x0 = screenX - 4;
      ctx.beginPath();
      for (let yy = 0; yy <= 200; yy++) {
        const t = (yy / 200) * 2 - 1;
        const ypos = cy + t * half;
        const I = whichPath ? 0.5 : Math.cos(t * spacing * 0.021) ** 2;
        const x = x0 - I * 54;
        yy === 0 ? ctx.moveTo(x, ypos) : ctx.lineTo(x, ypos);
      }
      ctx.strokeStyle = whichPath ? c.faint : c.accent;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 探测器标记
      if (whichPath) {
        for (const sy of slits) {
          ctx.beginPath();
          ctx.arc(barrierX + 16, sy, 6, 0, Math.PI * 2);
          ctx.strokeStyle = c.danger;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(barrierX + 16, sy - 3);
          ctx.lineTo(barrierX + 16, sy + 3);
          ctx.stroke();
        }
      }

      // 标注
      ctx.fillStyle = c.faint;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(whichPath ? 'WHICH-PATH: ON' : 'WHICH-PATH: OFF', 14, 18);
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
  const visibility = cell('条纹可见度', '96%');
  const count = cell('累计命中', '0');
  readoutRow.append(visibility.wrap, count.wrap);

  const sample = (): number => {
    const half = 130;
    if (whichPath) return (Math.random() * 2 - 1) * half;
    // 拒绝采样：目标分布 cos²(k t)
    for (let i = 0; i < 24; i++) {
      const t = Math.random() * 2 - 1;
      if (Math.random() < Math.cos(t * spacing * 0.021) ** 2) return t * half;
    }
    return 0;
  };

  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    phase += dt;

    const add = whichPath ? 4 : 3;
    for (let i = 0; i < add; i++) {
      marks.push({ y: kit.height / 2 + sample(), a: 1 });
      hits += 1;
    }
    for (const m of marks) m.a -= dt * 0.12;
    while (marks.length && (marks[0].a <= 0.02 || marks.length > 420)) marks.shift();

    count.value.textContent = String(hits);
    visibility.value.textContent = whichPath ? '0%' : '96%';
    kit.redraw();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const out = el('output', { text: '60' });
  const range = el('input') as HTMLInputElement;
  range.type = 'range';
  range.min = '24';
  range.max = '110';
  range.step = '2';
  range.value = '60';
  range.setAttribute('aria-label', '缝间距');
  range.addEventListener('input', () => {
    spacing = Number(range.value);
    out.textContent = range.value;
    marks.length = 0;
    hits = 0;
  });
  const wrap = el('div', { class: 'control' });
  wrap.append(el('label', { text: '缝间距' }), range, out);

  const det = toggle('哪条路探测器', {
    value: false,
    onChange: (v) => {
      whichPath = v;
      marks.length = 0;
      hits = 0;
    },
  });

  controls.append(wrap, det);

  const offTheme = onThemeChange(() => kit.redraw());

  return {
    replay: () => {
      spacing = 60;
      range.value = '60';
      out.textContent = '60';
      whichPath = false;
      det.setAttribute('aria-pressed', 'false');
      marks.length = 0;
      hits = 0;
      count.value.textContent = '0';
      visibility.value.textContent = '96%';
    },
    destroy: () => {
      offTheme();
      cancelAnimationFrame(raf);
      kit.destroy();
    },
  };
}
