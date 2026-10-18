import { button, el, pct, toggle } from './kit';

/**
 * BB84：Alice 随机选比特与基，Bob 随机选基，基相同时保留。
 * 打开 Eve 后，她也要随机选基测量再转发，筛后误码率会跳到 25%。
 */
export function mount(host: HTMLElement) {
  const table = el('div', { class: 'bb-table' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  const verdict = el('div', { class: 'bb-verdict' });
  host.append(table, verdict, readoutRow, controls);

  const ROUNDS = 8;
  let eve = false;
  let rows: {
    bit: number;
    ab: number;
    bb: number;
    bbit: number;
    kept: boolean;
    err: boolean;
  }[] = [];

  const run = () => {
    rows = [];
    for (let i = 0; i < ROUNDS; i++) {
      const bit = Math.random() < 0.5 ? 0 : 1;
      const ab = Math.random() < 0.5 ? 0 : 1;
      let carriedBit = bit;
      let carriedBasis = ab;
      if (eve) {
        const eb = Math.random() < 0.5 ? 0 : 1;
        carriedBit = eb === ab ? bit : Math.random() < 0.5 ? 0 : 1;
        carriedBasis = eb;
      }
      const bb = Math.random() < 0.5 ? 0 : 1;
      const bbit = bb === carriedBasis ? carriedBit : Math.random() < 0.5 ? 0 : 1;
      const kept = bb === ab;
      rows.push({ bit, ab, bb, bbit, kept, err: kept && bbit !== bit });
    }
    paint();
  };

  const cell = (label: string, value: string) => {
    const wrap = el('div', { class: 'readout' });
    wrap.append(
      el('span', { class: 'readout-label', text: label }),
      el('span', { class: 'readout-value mono', text: value }),
    );
    return { wrap, value: wrap.lastElementChild as HTMLElement };
  };
  const sifted = cell('筛后密钥长度', '0');
  const qber = cell('误码率 QBER', '—');
  readoutRow.append(sifted.wrap, qber.wrap);

  const paint = () => {
    const keptRows = rows.filter((r) => r.kept);
    const errs = keptRows.filter((r) => r.err).length;
    const rate = keptRows.length ? errs / keptRows.length : 0;

    sifted.value.textContent = `${keptRows.length} / ${ROUNDS} 位`;
    qber.value.textContent = keptRows.length ? pct(rate, 0) : '—';

    table.innerHTML = `
      <div class="bb-row bb-head">
        <span>#</span><span>Alice 比特</span><span>Alice 基</span>
        <span>Bob 基</span><span>筛后保留</span><span>Bob 结果</span>
      </div>
      ${rows
        .map(
          (r, i) => `
        <div class="bb-row ${r.kept ? (r.err ? 'bb-bad' : 'bb-good') : 'bb-skip'}">
          <span class="mono">${String(i + 1).padStart(2, '0')}</span>
          <span class="mono">${r.bit}</span>
          <span class="mono">${r.ab ? '×' : '+'}</span>
          <span class="mono">${r.bb ? '×' : '+'}</span>
          <span class="mono">${r.kept ? '保留' : '丢弃'}</span>
          <span class="mono">${r.kept ? r.bbit : '·'}${r.err ? ' ✕' : ''}</span>
        </div>`,
        )
        .join('')}
    `;

    if (!keptRows.length) {
      verdict.dataset.tone = 'idle';
      verdict.textContent = '还没有保留位。点「再跑一批」。';
    } else if (rate > 0.11) {
      verdict.dataset.tone = 'bad';
      verdict.textContent = `误码率 ${pct(rate, 0)} 超过 11% 阈值 —— 这一批密钥必须丢弃，信道上有窃听者。`;
    } else {
      verdict.dataset.tone = 'good';
      verdict.textContent = `误码率 ${pct(rate, 0)} 低于 11% 阈值 —— 可以继续做保密性放大，生成最终密钥。`;
    }
  };

  const eveToggle = toggle('Eve 在线窃听', {
    value: false,
    onChange: (v) => {
      eve = v;
      run();
    },
  });

  controls.append(eveToggle, button('再跑一批', run));
  run();

  return {
    replay: () => {
      eve = false;
      eveToggle.setAttribute('aria-pressed', 'false');
      run();
    },
  };
}
