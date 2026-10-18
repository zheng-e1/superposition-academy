import { canvasKit, el, onThemeChange, pct, themeColors, toggle } from './kit';

/**
 * 三片偏振片：A 竖直 → B 可旋转 → C 水平。
 * 光子逐个穿过，每次过片做一次投影判定；读数同时给理论值与实测计数。
 */
export function mount(host: HTMLElement) {
  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage, readoutRow, controls);

  let angleB = 45; // 度
  let useB = true;
  let passed = 0;
  let total = 0;
  let recent: boolean[] = [];

  type Photon = { x: number; pol: number; alive: boolean; fade: number };
  const photons: Photon[] = [];

  const H = 250;
  const cy = H / 2;

  const filters = (w: number) => {
    const list = [{ x: w * 0.34, angle: 0, letter: 'A' }];
    if (useB) list.push({ x: w * 0.55, angle: angleB, letter: 'B' });
    list.push({ x: w * 0.76, angle: 90, letter: 'C' });
    return list;
  };

  const kit = canvasKit(stage, {
    height: H,
    draw: (ctx, w) => {
      const c = themeColors();
      const fs = filters(w);

      // 屏幕底色
      ctx.fillStyle = c.card;
      ctx.fillRect(0, 0, w, H);

      // 光束
      const y = cy;
      const beamEnd = w * 0.9;

      const segs = [0, ...fs.map((f) => f.x), beamEnd];
      for (let i = 0; i < segs.length - 1; i++) {
        const a = segs[i];
        const b = segs[i + 1];
        const level = i === 0 ? 1 : fs.slice(0, i).reduce((acc, f, j) => {
          const prev = j === 0 ? 0 : fs[j - 1].angle;
          return acc * Math.cos(((f.angle - prev) * Math.PI) / 180) ** 2;
        }, 1);
        ctx.beginPath();
        ctx.moveTo(a, y);
        ctx.lineTo(b, y);
        ctx.strokeStyle = c.phase;
        ctx.globalAlpha = 0.12 + 0.5 * level;
        ctx.lineWidth = 3 + 6 * level;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 光源
      ctx.beginPath();
      ctx.arc(22, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = c.phase;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(22, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = c.phase;
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.globalAlpha = 1;

      // 偏振片
      for (const f of fs) {
        const halfH = 78;
        ctx.save();
        ctx.translate(f.x, y);
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-5, -halfH, 10, halfH * 2, 5) : ctx.rect(-5, -halfH, 10, halfH * 2);
        ctx.fillStyle = c.card;
        ctx.fill();
        ctx.strokeStyle = c.line;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.rect(-5, -halfH, 10, halfH * 2);
        ctx.clip();
        ctx.strokeStyle = c.accent;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        const a = (f.angle * Math.PI) / 180;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        for (let t = -90; t <= 90; t += 7) {
          const px = t * dy;
          const py = t * dx;
          ctx.beginPath();
          ctx.moveTo(px - dx * 12, py - dy * 12);
          ctx.lineTo(px + dx * 12, py + dy * 12);
          ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.restore();

        // 标签
        ctx.textAlign = 'center';
        ctx.fillStyle = c.ink;
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.fillText(f.letter, f.x, y - halfH - 9);
        ctx.fillStyle = c.sub;
        ctx.font = '10.5px ui-monospace, monospace';
        ctx.fillText(`${f.angle}°`, f.x, y + halfH + 16);
      }

      // 光子
      for (const p of photons) {
        ctx.beginPath();
        ctx.arc(p.x, y + Math.sin(p.x * 0.35) * 3, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = p.alive ? c.phase : c.faint;
        ctx.globalAlpha = p.alive ? 0.95 : Math.max(p.fade, 0);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 结论读数画在左上
      const theory = useB
        ? Math.cos((angleB * Math.PI) / 180) ** 2 * Math.sin((angleB * Math.PI) / 180) ** 2
        : 0;
      ctx.textAlign = 'left';
      ctx.fillStyle = c.faint;
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('PASS RATE (after A)', 18, 22);
      ctx.fillStyle = theory > 0.01 ? c.accent : c.danger;
      ctx.font = '600 20px ui-monospace, monospace';
      ctx.fillText(pct(theory, 1), 18, 44);
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
  const empirical = cell('实测通过率', '—');
  const samples = cell('样本数', '0');
  readoutRow.append(empirical.wrap, samples.wrap);

  const syncReadout = () => {
    empirical.value.textContent = recent.length ? pct(recent.filter(Boolean).length / recent.length, 1) : '—';
    samples.value.textContent = String(total);
  };

  // 光子流
  const spawn = (): Photon => ({
    x: 26 + Math.random() * 10,
    pol: 0,
    alive: true,
    fade: 1,
  });

  for (let i = 0; i < 26; i++) {
    const p = spawn();
    p.x = 26 + Math.random() * (kit.width - 60);
    photons.push(p);
  }

  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const w = kit.width;
    const fs = filters(w);
    const speed = Math.min(w, 720) * 0.34;

    for (const p of photons) {
      if (!p.alive) {
        p.fade -= dt * 2.2;
        if (p.fade <= 0) {
          const np = spawn();
          Object.assign(p, np);
        }
        continue;
      }
      const prevX = p.x;
      p.x += speed * dt;
      for (const f of fs) {
        if (prevX < f.x && p.x >= f.x) {
          const d = ((f.angle - (p.pol * 180) / Math.PI) * Math.PI) / 180;
          const pass = Math.random() < Math.cos(d) ** 2;
          if (pass) {
            p.pol = (f.angle * Math.PI) / 180;
          } else {
            p.alive = false;
            p.fade = 1;
            p.x = f.x;
            total += 1;
            recent.push(false);
            if (recent.length > 60) recent.shift();
            break;
          }
        }
      }
      if (p.alive && p.x > w - 26) {
        total += 1;
        recent.push(true);
        if (recent.length > 60) recent.shift();
        Object.assign(p, spawn());
      }
    }
    syncReadout();
    kit.redraw();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // 控件
  const out = el('output', { text: '45°' });
  const range = el('input') as HTMLInputElement;
  range.type = 'range';
  range.min = '0';
  range.max = '90';
  range.step = '5';
  range.value = '45';
  range.setAttribute('aria-label', '中间偏振片角度');
  range.addEventListener('input', () => {
    angleB = Number(range.value);
    out.textContent = `${angleB}°`;
  });
  const angleWrap = el('div', { class: 'control' });
  angleWrap.append(el('label', { text: 'B 角度' }), range, out);

  const removeB = toggle('移除 B 片', {
    value: false,
    onChange: (v) => {
      useB = !v;
    },
  });

  controls.append(angleWrap, removeB);

  const offTheme = onThemeChange(() => kit.redraw());

  return {
    replay: () => {
      angleB = 45;
      range.value = '45';
      out.textContent = '45°';
      useB = true;
      removeB.setAttribute('aria-pressed', 'false');
      total = 0;
      recent = [];
      photons.length = 0;
      for (let i = 0; i < 26; i++) photons.push(spawn());
      syncReadout();
    },
    destroy: () => {
      offTheme();
      cancelAnimationFrame(raf);
      kit.destroy();
    },
  };
}
