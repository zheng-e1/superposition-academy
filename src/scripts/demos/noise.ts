import { canvasKit, el, onThemeChange, pct, themeColors } from './kit';

/**
 * 保真度与深度：每一门都 99.9%，一千门之后还剩多少。
 * 曲线用对数纵轴，让「差一点点」的代价看得见。
 */
export function mount(host: HTMLElement) {
  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage, readoutRow, controls);

  let fidelity = 99.9; // %
  let depth = 100;

  const kit = canvasKit(stage, {
    height: 220,
    draw: (ctx, w, h) => {
      const c = themeColors();
      const padL = 44;
      const padB = 26;
      const padT = 16;
      const plotW = w - padL - 12;
      const plotH = h - padB - padT;

      ctx.clearRect(0, 0, w, h);

      // 网格与纵轴（对数刻度 1 → 1e-4）
      ctx.font = '9.5px ui-monospace, monospace';
      ctx.textAlign = 'right';
      for (let e = 0; e <= 4; e++) {
        const y = padT + (e / 4) * plotH;
        ctx.beginPath();
        ctx.moveTo(padL, y + 0.5);
        ctx.lineTo(padL + plotW, y + 0.5);
        ctx.strokeStyle = c.line;
        ctx.stroke();
        ctx.fillStyle = c.faint;
        ctx.fillText(e === 0 ? '1' : `1e-${e}`, padL - 6, y + 3);
      }

      // 曲线
      const f = fidelity / 100;
      const maxDepth = 2000;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const d = 1 + (i / 120) * (maxDepth - 1);
        const p = Math.pow(f, d);
        const x = padL + ((d - 1) / (maxDepth - 1)) * plotW;
        const y = padT + (1 - Math.min(Math.max(Math.log10(p) / -4, 0), 1)) * plotH;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 当前点
      const p = Math.pow(f, depth);
      const cx = padL + ((depth - 1) / (maxDepth - 1)) * plotW;
      const cy = padT + (1 - Math.min(Math.max(Math.log10(p) / -4, 0), 1)) * plotH;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = c.phase;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.strokeStyle = c.phase;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, cy);
      ctx.lineTo(cx, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, padT + plotH);
      ctx.strokeStyle = c.faint;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'center';
      ctx.fillStyle = c.faint;
      ctx.fillText('线路深度（门数）', padL + plotW / 2, h - 8);
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
  const success = cell('整条线路成功率', '90.5%');
  const per = cell('注入错误数（期望）', '0.1');
  readoutRow.append(success.wrap, per.wrap);

  const sync = () => {
    const p = Math.pow(fidelity / 100, depth);
    success.value.textContent = pct(p, p < 0.01 ? 2 : 1);
    per.value.textContent = (depth * (1 - fidelity / 100)).toFixed(2);
    kit.redraw();
  };

  const fOut = el('output', { text: '99.9%' });
  const fRange = el('input') as HTMLInputElement;
  fRange.type = 'range';
  fRange.min = '98';
  fRange.max = '99.99';
  fRange.step = '0.01';
  fRange.value = '99.9';
  fRange.setAttribute('aria-label', '单门保真度');
  fRange.addEventListener('input', () => {
    fidelity = Number(fRange.value);
    fOut.textContent = `${fidelity}%`;
    sync();
  });
  const fWrap = el('div', { class: 'control' });
  fWrap.append(el('label', { text: '单门保真度' }), fRange, fOut);

  const dOut = el('output', { text: '100' });
  const dRange = el('input') as HTMLInputElement;
  dRange.type = 'range';
  dRange.min = '1';
  dRange.max = '2000';
  dRange.step = '1';
  dRange.value = '100';
  dRange.setAttribute('aria-label', '线路深度');
  dRange.addEventListener('input', () => {
    depth = Number(dRange.value);
    dOut.textContent = String(depth);
    sync();
  });
  const dWrap = el('div', { class: 'control' });
  dWrap.append(el('label', { text: '线路深度' }), dRange, dOut);

  controls.append(fWrap, dWrap);
  sync();

  const offTheme = onThemeChange(() => sync());

  return {
    replay: () => {
      fidelity = 99.9;
      depth = 100;
      fRange.value = '99.9';
      dRange.value = '100';
      fOut.textContent = '99.9%';
      dOut.textContent = '100';
      sync();
    },
    destroy: () => {
      offTheme();
      kit.destroy();
    },
  };
}
