const KEY = 'qc_theme';
const root = document.documentElement;

function current(): 'light' | 'dark' {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}

function syncButton() {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  const dark = current() === 'dark';
  btn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
  btn.setAttribute('title', dark ? '切换到浅色模式' : '切换到深色模式');
}

export function setTheme(theme: 'light' | 'dark') {
  root.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* 隐私模式：不持久化，但当前会话仍生效 */
  }
  syncButton();
}

const btn = document.getElementById('themeBtn');
btn?.addEventListener('click', () => setTheme(current() === 'dark' ? 'light' : 'dark'));
syncButton();

try {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (!stored) root.dataset.theme = e.matches ? 'dark' : 'light';
  });
} catch {
  /* 老浏览器没有 matchMedia 事件 */
}
