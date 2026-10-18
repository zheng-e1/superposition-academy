/** 自测：答完即时判分并记录到本地。 */

const KEY = 'qc_quiz_v1';

type ScoreMap = Record<string, { correct: number; total: number; at: number }>;

function load(): ScoreMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as ScoreMap;
  } catch {
    return {};
  }
}

function save(map: ScoreMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

document.querySelectorAll<HTMLElement>('[data-quiz]').forEach((quiz) => {
  const slug = quiz.dataset.slug || '';
  const items = Array.from(quiz.querySelectorAll<HTMLElement>('.quiz-item'));
  const scoreEl = quiz.querySelector<HTMLElement>('[data-quiz-score]');
  let answered = 0;
  let correct = 0;

  const paint = () => {
    if (!scoreEl) return;
    scoreEl.textContent = answered === 0 ? '未作答' : `${correct} / ${items.length} 正确`;
  };

  items.forEach((item) => {
    const answer = Number(item.dataset.answer);
    const options = Array.from(item.querySelectorAll<HTMLButtonElement>('.quiz-option'));
    const explain = item.querySelector<HTMLElement>('.quiz-explain');

    options.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (item.dataset.done === 'true') return;
        item.dataset.done = 'true';
        const picked = Number(btn.dataset.opt);
        options.forEach((o, i) => {
          o.disabled = true;
          if (i === answer) o.dataset.state = 'correct';
          else if (i === picked) o.dataset.state = 'wrong';
        });
        if (picked === answer) correct += 1;
        answered += 1;
        if (explain) explain.hidden = false;
        paint();

        const map = load();
        const prev = map[slug];
        map[slug] = {
          correct: (prev?.correct ?? 0) + (picked === answer ? 1 : 0),
          total: (prev?.total ?? 0) + 1,
          at: Date.now(),
        };
        save(map);
      });
    });
  });

  paint();
});
