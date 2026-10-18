import { Circuit } from '../../lib/qsim';
import { decodeCircuit, encodeCircuit, insertOp, removeOp, tokenFromHash } from '../../lib/lab-codec';
import { button, el, onThemeChange, pct, themeColors } from './kit';

type GateName = 'h' | 'x' | 'y' | 'z' | 's' | 't' | 'cx' | 'cz';
interface Op {
  g: GateName;
  q: number;
  t?: number;
}

const PRESETS: Record<string, { label: string; ops: Op[]; n: number }> = {
  bell: {
    label: 'Bell 态',
    n: 2,
    ops: [
      { g: 'h', q: 0 },
      { g: 'cx', q: 0, t: 1 },
    ],
  },
  ghz: {
    label: 'GHZ 三比特',
    n: 3,
    ops: [
      { g: 'h', q: 0 },
      { g: 'cx', q: 0, t: 1 },
      { g: 'cx', q: 1, t: 2 },
    ],
  },
  phase: {
    label: '相位回踢',
    n: 2,
    ops: [
      { g: 'h', q: 0 },
      { g: 'x', q: 1 },
      { g: 'h', q: 1 },
      { g: 'cx', q: 0, t: 1 },
      { g: 'h', q: 1 },
    ],
  },
  grover: {
    label: 'Grover 一步',
    n: 2,
    ops: [
      { g: 'h', q: 0 },
      { g: 'h', q: 1 },
      { g: 'cz', q: 0, t: 1 },
      { g: 'h', q: 0 },
      { g: 'h', q: 1 },
      { g: 'x', q: 0 },
      { g: 'x', q: 1 },
      { g: 'cz', q: 0, t: 1 },
      { g: 'x', q: 0 },
      { g: 'x', q: 1 },
      { g: 'h', q: 0 },
      { g: 'h', q: 1 },
    ],
  },
};

const GATES: { g: GateName; label: string; two?: boolean }[] = [
  { g: 'h', label: 'H' },
  { g: 'x', label: 'X' },
  { g: 'y', label: 'Y' },
  { g: 'z', label: 'Z' },
  { g: 's', label: 'S' },
  { g: 't', label: 'T' },
  { g: 'cx', label: 'CNOT', two: true },
  { g: 'cz', label: 'CZ', two: true },
];

/** 线路实验室：加门、单步执行、看概率、导出 QASM。 */
export function mount(host: HTMLElement, props: Record<string, unknown> = {}) {
  const share = Boolean(props.share);
  const restored = decodeCircuit(tokenFromHash(location.hash) ?? '');
  let n = restored?.n ?? 2;
  let ops: Op[] = restored ? [...restored.ops] : [];
  let armed: GateName = 'h';
  let selected = 0;
  let step = ops.length;
  let playing = false;
  let playTimer = 0;
  let sampleMode = false;

  const stage = el('div', { class: 'demo-stage' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  host.append(stage, readoutRow, controls);

  const board = el('div', { class: 'cj-board' });
  const hist = el('div', { class: 'cj-hist' });
  const stageInner = el('div', { class: 'cj-wrap' }, [board, hist]);
  stage.append(stageInner);

  const qasmBox = el('pre', { class: 'cj-qasm mono' });
  const qasmWrap = el('details', { class: 'cj-qasm-wrap' });
  qasmWrap.append(el('summary', { text: 'OpenQASM 2.0' }), qasmBox);
  stage.append(qasmWrap);

  const cell = (label: string, value: string) => {
    const wrap = el('div', { class: 'readout' });
    wrap.append(
      el('span', { class: 'readout-label', text: label }),
      el('span', { class: 'readout-value mono', text: value }),
    );
    return { wrap, value: wrap.lastElementChild as HTMLElement };
  };
  const stepLabel = cell('当前步', '0 / 0');
  const peak = cell('最大概率', '—');
  readoutRow.append(stepLabel.wrap, peak.wrap);

  const build = (upto = ops.length) => {
    const c = new Circuit(n);
    for (const op of ops.slice(0, upto)) {
      if (op.g === 'cx') c.cx(op.q, op.t ?? 1);
      else if (op.g === 'cz') c.cz(op.q, op.t ?? 1);
      else c[op.g](op.q);
    }
    return c;
  };

  const syncHash = () => {
    if (!share) return;
    try {
      history.replaceState(null, '', `#c=${encodeCircuit({ n, ops })}`);
    } catch {
      /* 隐私模式或 file:// 下忽略 */
    }
  };

  const insertAt = (index: number) => {
    const next = insertOp({ n, ops }, index, armed, selected);
    n = next.n;
    ops = next.ops;
    step = Math.min(index + 1, ops.length);
    syncHash();
    render();
  };

  const removeAt = (index: number) => {
    ops = removeOp({ n, ops }, index).ops;
    step = Math.min(step, ops.length);
    syncHash();
    render();
  };

  const render = () => {
    const colors = themeColors();
    const colW = 52;
    const rowH = 46;
    const cols = Math.max(4, ops.length + 1);
    board.style.width = '100%';
    board.style.minWidth = `${cols * colW + 16}px`;
    board.style.height = `${n * rowH + 16}px`;
    board.innerHTML = '';

    // 线
    for (let q = 0; q < n; q++) {
      const wire = el('div', { class: 'cj-wire' });
      wire.style.top = `${8 + q * rowH + rowH / 2 - 0.5}px`;
      const label = el('span', { class: 'cj-wire-label mono', text: `q${q}` });
      wire.append(label);
      board.append(wire);
    }

    // 门（点一下删除）
    ops.forEach((op, i) => {
      const x = 34 + i * colW;
      if (op.g === 'cx' || op.g === 'cz') {
        const y1 = 8 + op.q * rowH + rowH / 2;
        const y2 = 8 + (op.t ?? 1) * rowH + rowH / 2;
        const link = el('div', { class: 'cj-link' });
        link.style.left = `${x + 15}px`;
        link.style.top = `${Math.min(y1, y2)}px`;
        link.style.height = `${Math.abs(y2 - y1)}px`;
        board.append(link);
        const dot = el('button', { class: 'cj-dot' }) as HTMLButtonElement;
        dot.type = 'button';
        dot.style.left = `${x + 12}px`;
        dot.style.top = `${y1 - 3}px`;
        dot.title = '点一下删除这个门';
        dot.dataset.step = String(i);
        dot.addEventListener('click', () => removeAt(i));
        board.append(dot);
        const tgt = el('button', {
          class: 'cj-gate cj-target',
          text: op.g === 'cx' ? '+' : 'Z',
        }) as HTMLButtonElement;
        tgt.type = 'button';
        tgt.style.left = `${x}px`;
        tgt.style.top = `${y2 - 15}px`;
        tgt.title = '点一下删除这个门';
        tgt.dataset.step = String(i);
        tgt.addEventListener('click', () => removeAt(i));
        board.append(tgt);
      } else {
        const g = el('button', { class: 'cj-gate', text: op.g.toUpperCase() }) as HTMLButtonElement;
        g.type = 'button';
        g.style.left = `${x}px`;
        g.style.top = `${8 + op.q * rowH + rowH / 2 - 15}px`;
        g.title = '点一下删除这个门';
        g.dataset.step = String(i);
        g.addEventListener('click', () => removeAt(i));
        board.append(g);
      }
    });

    // 插入位：列与列之间的细条；点一下把当前选中的门插到这里，也接受拖拽
    for (let c = 0; c <= ops.length; c++) {
      const strip = el('button', { class: 'cj-insert' }) as HTMLButtonElement;
      if (c === ops.length) strip.classList.add('cj-insert-end');
      strip.type = 'button';
      strip.style.left = `${34 + c * colW - 14}px`;
      strip.style.height = `${n * rowH + 16}px`;
      strip.setAttribute('aria-label', `在第 ${c + 1} 个位置插入 ${armed.toUpperCase()}`);
      strip.title = `插入 ${armed.toUpperCase()} · 第 ${c + 1} 位`;
      strip.addEventListener('click', () => insertAt(c));
      strip.addEventListener('dragover', (e) => {
        e.preventDefault();
        strip.dataset.drop = 'true';
      });
      strip.addEventListener('dragleave', () => {
        delete strip.dataset.drop;
      });
      strip.addEventListener('drop', (e) => {
        e.preventDefault();
        delete strip.dataset.drop;
        const g = e.dataTransfer?.getData('text/plain') as GateName | undefined;
        if (g && GATES.some((x) => x.g === g)) {
          armed = g;
          insertAt(c);
        }
      });
      board.append(strip);
    }

    // 单步高亮
    board.querySelectorAll<HTMLElement>('[data-step]').forEach((g) => {
      g.dataset.active = String(Number(g.dataset.step) === step - 1);
    });

    // 直方图
    const c = build(step);
    const probs = c.probabilities();
    let counts: number[] | null = null;
    if (sampleMode) {
      const s = c.sample(1000, Math.floor(Math.random() * 4294967296));
      counts = probs.map((_, i) => s[i.toString(2).padStart(n, '0')] ?? 0);
    }
    hist.innerHTML = '';
    hist.style.gridTemplateColumns = `repeat(${1 << n}, minmax(0, 1fr))`;
    probs.forEach((p, i) => {
      const bit = i.toString(2).padStart(n, '0');
      const bar = el('div', { class: 'cj-bar' });
      const fill = el('div', { class: 'cj-bar-fill' });
      const v = counts ? counts[i] / 1000 : p;
      fill.style.height = `${Math.max(v * 100, 0.8)}%`;
      const val = el('span', { class: 'cj-bar-val mono', text: counts ? String(counts[i]) : pct(p, 1) });
      const lab = el('span', { class: 'cj-bar-label mono', text: `|${bit}⟩` });
      bar.append(val, fill, lab);
      hist.append(bar);
    });

    let best = 0;
    probs.forEach((p, i) => {
      if (p > probs[best]) best = i;
    });
    stepLabel.value.textContent = `${step} / ${ops.length}`;
    peak.value.textContent = `${(best >>> 0).toString(2).padStart(n, '0')} · ${pct(probs[best], 1)}`;

    // QASM
    try {
      qasmBox.textContent = build().toQASM();
    } catch {
      qasmBox.textContent = '// 线路暂时无法导出';
    }

    board.style.setProperty('--cj-accent', colors.accent);
  };

  // 比特选择
  const qubitRow = el('div', { class: 'chip-row' });
  const rebuildQubitChips = () => {
    qubitRow.innerHTML = '';
    qubitRow.append(el('span', { class: 'cj-mini-label mono', text: 'TARGET' }));
    for (let q = 0; q < n; q++) {
      const b = button(`q${q}`, () => {
        selected = q;
        rebuildQubitChips();
      });
      b.setAttribute('aria-pressed', String(q === selected));
      qubitRow.append(b);
    }
  };
  rebuildQubitChips();

  // 门选择：点一下加到末尾并设为「待插入」，也可以直接拖到线路里的插入位
  const gateRow = el('div', { class: 'chip-row' });
  const gateButtons: HTMLButtonElement[] = [];
  const syncArmed = () => {
    gateButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gate === armed)));
  };
  for (const gate of GATES) {
    const b = button(gate.label, () => {
      armed = gate.g;
      if (gate.two) {
        if (n < 2) {
          syncArmed();
          return;
        }
        ops.push({ g: gate.g, q: selected, t: (selected + 1) % n });
      } else {
        ops.push({ g: gate.g, q: selected });
      }
      step = ops.length;
      syncHash();
      syncArmed();
      render();
    });
    b.dataset.gate = gate.g;
    b.draggable = true;
    b.title = '点一下加到末尾；也可以拖到线路中间的插入位';
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', gate.g);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
    });
    gateButtons.push(b);
    gateRow.append(b);
  }

  const undo = button('撤销', () => {
    ops.pop();
    step = Math.min(step, ops.length);
    syncHash();
    render();
  });
  const clear = button('清空', () => {
    ops = [];
    step = 0;
    syncHash();
    render();
  });
  const prev = button('上一步', () => {
    step = Math.max(0, step - 1);
    render();
  });
  const next = button('下一步', () => {
    step = Math.min(ops.length, step + 1);
    render();
  });
  const play = button('播放', () => {
    playing = !playing;
    play.textContent = playing ? '暂停' : '播放';
    window.clearInterval(playTimer);
    if (playing) {
      if (step >= ops.length) step = 0;
      playTimer = window.setInterval(() => {
        step += 1;
        render();
        if (step >= ops.length) {
          playing = false;
          play.textContent = '播放';
          window.clearInterval(playTimer);
        }
      }, 620);
    }
  });
  const sampleBtn = button('采样 1000 次', () => {
    sampleMode = !sampleMode;
    sampleBtn.setAttribute('aria-pressed', String(sampleMode));
    render();
  });

  const presetRow = el('div', { class: 'chip-row' });
  const sizeButtons: HTMLButtonElement[] = [];
  const syncSize = () => {
    sizeButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.size) === n)));
  };
  presetRow.append(el('span', { class: 'cj-mini-label mono', text: 'PRESET' }));
  for (const [key, preset] of Object.entries(PRESETS)) {
    presetRow.append(
      button(preset.label, () => {
        n = preset.n;
        ops = preset.ops.map((o) => ({ ...o }));
        selected = 0;
        step = 0;
        syncHash();
        syncSize();
        rebuildQubitChips();
        render();
      }),
    );
  }

  const sizeRow = el('div', { class: 'chip-row' });
  sizeRow.append(el('span', { class: 'cj-mini-label mono', text: 'QUBITS' }));
  for (const size of [2, 3, 4]) {
    const b = button(`${size} 比特`, () => {
      n = size;
      ops = ops.filter((op) => op.q < n && (op.t === undefined || op.t < n));
      selected = Math.min(selected, n - 1);
      step = Math.min(step, ops.length);
      syncHash();
      syncSize();
      rebuildQubitChips();
      render();
    });
    b.dataset.size = String(size);
    sizeButtons.push(b);
    sizeRow.append(b);
  }
  syncSize();

  const stepRow = el('div', { class: 'chip-row' });
  stepRow.append(prev, next, play, sampleBtn, undo, clear);

  const copyBtn = button('复制 QASM', async () => {
    try {
      await navigator.clipboard.writeText(qasmBox.textContent || '');
      copyBtn.textContent = '已复制';
      window.setTimeout(() => (copyBtn.textContent = '复制 QASM'), 1400);
    } catch {
      copyBtn.textContent = '复制失败';
    }
  });
  const shareBtn = button('复制分享链接', async () => {
    const token = encodeCircuit({ n, ops });
    const url = `${location.origin}${location.pathname}#c=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = '链接已复制';
      window.setTimeout(() => (shareBtn.textContent = '复制分享链接'), 1600);
    } catch {
      shareBtn.textContent = '复制失败';
    }
  });
  const qasmRow = el('div', { class: 'chip-row' });
  qasmRow.append(copyBtn, shareBtn);

  controls.append(qubitRow, gateRow, stepRow, sizeRow, presetRow, qasmRow);

  if (!restored) {
    ops = PRESETS.bell.ops.map((o) => ({ ...o }));
    n = PRESETS.bell.n;
  }
  step = 0;
  rebuildQubitChips();
  syncArmed();
  syncSize();
  syncHash();
  render();

  const offTheme = onThemeChange(() => render());

  return {
    replay: () => {
      ops = PRESETS.bell.ops.map((o) => ({ ...o }));
      n = 2;
      selected = 0;
      step = 0;
      sampleMode = false;
      sampleBtn.setAttribute('aria-pressed', 'false');
      rebuildQubitChips();
      syncHash();
      render();
    },
    destroy: () => {
      offTheme();
      window.clearInterval(playTimer);
    },
  };
}
