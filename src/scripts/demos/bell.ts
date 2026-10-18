import { Circuit } from '../../lib/qsim';
import { button, el, pct } from './kit';

/**
 * Bell 态的两端测量：A 端固定 Z 基，B 端可以旋转。
 * 旋转角为 0 时两端永远同号；90° 时同号只剩一半、关联强度归零；180° 才永远反号。
 */
export function mount(host: HTMLElement) {
  const shared = el('div', { class: 'bell-shared mono', text: '共享态 |Φ+⟩ = (|00⟩ + |11⟩)/√2' });
  const board = el('div', { class: 'bell-board' });
  const station = (name: string) => {
    const box = el('div', { class: 'bell-station' });
    const title = el('div', { class: 'bell-station-name mono', text: name });
    const bit = el('div', { class: 'bell-bit mono', text: '—' });
    box.append(title, bit);
    return { box, bit };
  };
  const a = station('A · Z 基');
  const b = station('B · 可旋转');
  const link = el('div', { class: 'bell-link' });
  board.append(a.box, link, b.box);

  const stats = el('div', { class: 'bell-stats' });
  const sameBar = el('div', { class: 'bell-bar' });
  const sameFill = el('div', { class: 'bell-bar-fill' });
  sameBar.append(sameFill);
  const statsText = el('div', { class: 'bell-stats-text mono', text: '同号 0 · 异号 0' });
  stats.append(sameBar, statsText);

  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(shared, board, stats, readoutRow, controls);

  let phi = 0;
  let same = 0;
  let diff = 0;
  let last = { a: '—', b: '—' };

  const cell = (label: string, value: string) => {
    const wrap = el('div', { class: 'readout' });
    wrap.append(
      el('span', { class: 'readout-label', text: label }),
      el('span', { class: 'readout-value mono', text: value }),
    );
    return { wrap, value: wrap.lastElementChild as HTMLElement };
  };
  const measured = cell('同号占比', '—');
  const corr = cell('关联强度 E = 同 − 异', '—');
  const theory = cell('理论 cos²(φ/2)', '100%');
  readoutRow.append(measured.wrap, corr.wrap, theory.wrap);

  const circuit = () => {
    const c = new Circuit(2).h(0).cx(0, 1);
    if (phi) c.ry(1, (phi * Math.PI) / 180);
    return c;
  };

  const run = (trials: number) => {
    const c = circuit();
    const counts = c.sample(trials, Math.floor(Math.random() * 4294967296));
    for (const [label, count] of Object.entries(counts)) {
      if (label[0] === label[1]) same += count;
      else diff += count;
    }
    if (Object.keys(counts).length) {
      const label = Object.keys(counts)[0];
      last = { a: label[0], b: label[1] };
    }
    paint();
  };

  const paint = () => {
    a.bit.textContent = last.a;
    b.bit.textContent = last.b;
    a.bit.dataset.match = String(last.a === last.b);
    b.bit.dataset.match = String(last.a === last.b);
    link.dataset.match = String(last.a === last.b);
    const total = same + diff;
    const ratio = total ? same / total : 0;
    sameFill.style.width = `${ratio * 100}%`;
    statsText.textContent = `同号 ${same} · 异号 ${diff}${total ? ` · 共 ${total} 对` : ''}`;
    measured.value.textContent = total ? pct(ratio, 1) : '—';
    // E = P(同) − P(异) = cos φ；这一项才是贝尔不等式里用的关联强度
    corr.value.textContent = total ? (2 * ratio - 1).toFixed(2) : '—';
    // |Φ+⟩ 在相对转角 φ 下的同号概率是 cos²(φ/2)
    theory.value.textContent = pct(Math.cos((phi * Math.PI) / 360) ** 2, 1);
  };

  const angleOut = el('output', { text: '0°' });
  const angle = el('input') as HTMLInputElement;
  angle.type = 'range';
  angle.min = '0';
  angle.max = '180';
  angle.step = '15';
  angle.value = '0';
  angle.setAttribute('aria-label', 'B 端测量角度');
  angle.addEventListener('input', () => {
    phi = Number(angle.value);
    angleOut.textContent = `${phi}°`;
    same = 0;
    diff = 0;
    last = { a: '—', b: '—' };
    paint();
  });
  const angleWrap = el('div', { class: 'control' });
  angleWrap.append(el('label', { text: 'B 基转角 φ' }), angle, angleOut);

  const once = button('测一对', () => run(1));
  const many = button('测 200 对', () => run(200));
  const reset = button('清零', () => {
    same = 0;
    diff = 0;
    last = { a: '—', b: '—' };
    paint();
  });

  controls.append(angleWrap, once, many, reset);
  paint();
  // 打开就先测一对，避免画面空着
  run(2);

  return {
    replay: () => {
      phi = 0;
      angle.value = '0';
      angleOut.textContent = '0°';
      same = 0;
      diff = 0;
      last = { a: '—', b: '—' };
      paint();
    },
  };
}
