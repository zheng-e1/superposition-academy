import { Circuit } from '../../lib/qsim';
import { button, el, fmt } from './kit';

/**
 * 3 比特重复码：编码 α|000⟩+β|111⟩，任何单比特翻转都能被
 * 两个 ZZ 综合征定位，再打一个 X 修回来。
 */
export function mount(host: HTMLElement) {
  const board = el('div', { class: 'bf-board' });
  const readoutRow = el('div', { class: 'readout-row' });
  const controls = el('div', { class: 'controls' });
  const banner = el('div', { class: 'bf-banner' });
  host.append(board, banner, readoutRow, controls);

  let theta = Math.PI / 2; // α=β=1/√2
  let errorQubit = -1; // -1 = 无错
  let corrected = false;

  const chips = [0, 1, 2].map((q) => {
    const box = el('div', { class: 'bf-qubit' });
    const label = el('div', { class: 'bf-qubit-name mono', text: `q${q}` });
    const state = el('div', { class: 'bf-qubit-state mono', text: '0' });
    box.append(label, state);
    board.append(box);
    return { box, state };
  });
  const plus = el('div', { class: 'bf-plus mono', text: '+' });
  board.insertBefore(plus, chips[1].box);

  const cell = (label: string, value: string) => {
    const wrap = el('div', { class: 'readout' });
    wrap.append(
      el('span', { class: 'readout-label', text: label }),
      el('span', { class: 'readout-value mono', text: value }),
    );
    return { wrap, value: wrap.lastElementChild as HTMLElement };
  };
  const s1 = cell('⟨Z₀Z₁⟩', '+1');
  const s2 = cell('⟨Z₁Z₂⟩', '+1');
  const logic = cell('逻辑态', 'α=0.71, β=0.71');
  readoutRow.append(s1.wrap, s2.wrap, logic.wrap);

  const encoded = () => {
    const c = new Circuit(3);
    c.ry(0, theta).cx(0, 1).cx(0, 2);
    return c;
  };

  const paint = () => {
    const c = encoded();
    if (errorQubit >= 0 && !corrected) c.x(errorQubit);

    const z1 = c.expectation('ZZI');
    const z2 = c.expectation('IZZ');
    s1.value.textContent = z1 > 0 ? '+1' : '−1';
    s2.value.textContent = z2 > 0 ? '+1' : '−1';

    let detected = -1;
    if (z1 < 0 && z2 > 0) detected = 0;
    else if (z1 < 0 && z2 < 0) detected = 1;
    else if (z1 > 0 && z2 < 0) detected = 2;

    chips.forEach((chip, q) => {
      const flipped = errorQubit === q && !corrected;
      chip.box.dataset.error = String(flipped);
      chip.state.textContent = flipped ? '1' : '0';
    });

    // 逻辑态与物理错误无关：始终按编码后的逻辑振幅显示
    const logicalProbs = encoded().probabilities();
    const alpha = Math.sqrt(logicalProbs[0]);
    const beta = Math.sqrt(logicalProbs[7]);
    logic.value.textContent = `α=${fmt(alpha)}, β=${fmt(beta)}`;

    if (errorQubit < 0) {
      banner.dataset.tone = 'idle';
      banner.textContent = '没有错误。两个 ZZ 综合征都是 +1。';
    } else if (!corrected) {
      banner.dataset.tone = 'bad';
      banner.textContent = `检测到 q${detected} 被翻转（综合征 ${z1 > 0 ? '+' : '−'}${z2 > 0 ? '+' : '−'}）。点「纠正」把它翻回来。`;
    } else {
      const after = encoded();
      const ok = Math.abs(after.probabilities()[0] - c.probabilities()[0]) < 1e-9;
      banner.dataset.tone = ok ? 'good' : 'bad';
      banner.textContent = ok
        ? '纠正完成：逻辑态与编码后的原始态一致，单比特错误被挡住。'
        : '仍有残余错误，检查是否注入了多个翻转。';
    }
  };

  const errorRow = el('div', { class: 'chip-row' });
  errorRow.append(el('span', { class: 'cj-mini-label mono', text: '注入错误' }));
  const noErr = button('无错', () => {
    errorQubit = -1;
    corrected = false;
    paint();
  });
  errorRow.append(noErr);
  [0, 1, 2].forEach((q) => {
    errorRow.append(
      button(`X on q${q}`, () => {
        errorQubit = q;
        corrected = false;
        paint();
      }),
    );
  });

  const fix = button('纠正', () => {
    if (errorQubit < 0) return;
    corrected = true;
    paint();
  });

  const thetaOut = el('output', { text: '90°' });
  const slider = el('input') as HTMLInputElement;
  slider.type = 'range';
  slider.min = '0';
  slider.max = '180';
  slider.step = '5';
  slider.value = '90';
  slider.setAttribute('aria-label', '逻辑态旋转角');
  slider.addEventListener('input', () => {
    theta = (Number(slider.value) * Math.PI) / 180;
    thetaOut.textContent = `${slider.value}°`;
    paint();
  });
  const thetaWrap = el('div', { class: 'control' });
  thetaWrap.append(el('label', { text: 'Ry(θ)' }), slider, thetaOut);

  controls.append(errorRow, fix, thetaWrap);
  paint();

  return {
    replay: () => {
      theta = Math.PI / 2;
      slider.value = '90';
      thetaOut.textContent = '90°';
      errorQubit = -1;
      corrected = false;
      paint();
    },
  };
}
