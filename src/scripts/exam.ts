/** 自测中心：按篇章抽题、即时判分、给回链。 */

interface Item {
  slug: string;
  title: string;
  part: string;
  partTitle: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

interface Payload {
  total: number;
  items: Item[];
}

const COUNT = 10;
const stage = document.getElementById('examStage');
const result = document.getElementById('examResult');
const partsBar = document.getElementById('examParts');
const startBtn = document.getElementById('examStart') as HTMLButtonElement | null;

let payload: Payload | null = null;
let activePart = 'all';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderQuiz(items: Item[]) {
  if (!stage || !result) return;
  result.innerHTML = '';
  stage.innerHTML = '';

  const wrap = el('section', 'quiz');
  const head = el('div', 'quiz-head');
  const title = el('div', 'quiz-title', `随机卷 · ${items.length} 题`);
  const score = el('div', 'quiz-score', '未作答');
  score.setAttribute('data-score', '');
  head.append(title, score);
  const list = el('div', 'quiz-list');
  wrap.append(head, list);
  stage.append(wrap);

  let answered = 0;
  let correct = 0;

  items.forEach((item, i) => {
    const row = el('div', 'quiz-item');
    row.dataset.answer = String(item.answer);
    const q = el('div', 'quiz-q');
    const qText = el('span');
    qText.innerHTML = item.q;
    q.append(el('span', 'quiz-num', String(i + 1).padStart(2, '0')), qText);
    const opts = el('div', 'quiz-options');
    const explain = el('div', 'quiz-explain', '');
    explain.hidden = true;

    const buttons: HTMLButtonElement[] = item.options.map((text, oi) => {
      const b = el('button', 'quiz-option') as HTMLButtonElement;
      b.type = 'button';
      b.dataset.opt = String(oi);
      const optText = el('span');
      optText.innerHTML = text;
      b.append(el('span', 'key', 'ABCD'[oi]), optText);
      b.addEventListener('click', () => {
        if (row.dataset.done === 'true') return;
        row.dataset.done = 'true';
        buttons.forEach((other, oi2) => {
          other.disabled = true;
          if (oi2 === item.answer) other.dataset.state = 'correct';
          else if (oi2 === oi) other.dataset.state = 'wrong';
        });
        if (oi === item.answer) correct += 1;
        answered += 1;
        const b1 = el('b', '', '解析 · ');
        const ex = el('span');
        ex.innerHTML = item.explain;
        explain.replaceChildren(b1, ex);
        explain.hidden = false;
        score.textContent = `${correct} / ${items.length} 正确`;
        if (answered === items.length) showResult(items, correct);
      });
      return b;
    });

    opts.append(...buttons);
    row.append(q, opts, explain);
    list.append(row);
  });
}

function showResult(items: Item[], correct: number) {
  if (!result) return;
  const ratio = correct / items.length;
  let verdict = '再读一遍这一篇吧，别急着往后走。';
  if (ratio >= 0.9) verdict = '这一篇基本稳了，可以往前推。';
  else if (ratio >= 0.7) verdict = '大方向对，个别概念还虚，回去补那两节。';
  else if (ratio >= 0.5) verdict = '一半对一半错，说明有系统性误解，建议重读演示部分。';

  const box = el('div', 'exam-result');
  const scoreEl = el('div', 'score', `${correct} / ${items.length}`);
  const p = el('p', '', verdict);
  p.style.margin = '8px 0 0';
  p.style.color = 'var(--sub)';
  const again = el('button', 'btn btn-ghost btn-sm', '换一批题') as HTMLButtonElement;
  again.type = 'button';
  again.style.marginTop = '16px';
  again.addEventListener('click', () => start());
  box.append(scoreEl, p, again);
  result.append(box);
  result.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function start() {
  if (!payload) return;
  const pool = activePart === 'all' ? payload.items : payload.items.filter((i) => i.part === activePart);
  if (!pool.length) {
    if (stage) stage.innerHTML = '<p class="muted">这一篇还没有题。</p>';
    return;
  }
  renderQuiz(shuffle(pool).slice(0, Math.min(COUNT, pool.length)));
}

async function boot() {
  try {
    const res = await fetch('/exam.json');
    payload = (await res.json()) as Payload;
  } catch {
    if (stage) stage.textContent = '题库加载失败，请刷新重试。';
    return;
  }
  startBtn?.addEventListener('click', start);
  partsBar?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-part]');
    if (!btn) return;
    activePart = btn.dataset.part || 'all';
    partsBar.querySelectorAll<HTMLButtonElement>('[data-part]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
  });
}

void boot();
