/** 「我的」：收藏、笔记、继续阅读。数据只存在当前浏览器。 */

import {
  LIBRARY_KEY,
  emptyLibrary,
  exportLibrary,
  importLibrary,
  isBookmarked,
  parseLibrary,
  setNote,
  toggleBookmark,
  type Library,
} from '../lib/library';
import { readProgress } from '../lib/progress';

function readLibrary(): Library {
  try {
    return parseLibrary(localStorage.getItem(LIBRARY_KEY));
  } catch {
    return emptyLibrary();
  }
}

function writeLibrary(lib: Library) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch {
    /* 隐私模式：本次会话内仍可用，只是不持久化 */
  }
  window.dispatchEvent(new CustomEvent('sa:library', { detail: lib }));
}

const clock = (ts: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* ── 课节页：收藏 + 笔记 ─────────────────────────────────── */
function initLessonTools() {
  const article = document.querySelector<HTMLElement>('[data-lesson]');
  const slug = article?.dataset.slug;
  if (!slug) return;

  const bookmark = document.querySelector<HTMLButtonElement>('[data-bookmark]');
  const paintBookmark = () => {
    if (!bookmark) return;
    const on = isBookmarked(readLibrary(), slug);
    bookmark.setAttribute('aria-pressed', String(on));
    const label = bookmark.querySelector('[data-bookmark-label]');
    if (label) label.textContent = on ? '已收藏' : '收藏';
  };

  bookmark?.addEventListener('click', () => {
    writeLibrary(toggleBookmark(readLibrary(), slug));
    paintBookmark();
  });

  const panel = document.querySelector<HTMLElement>('[data-note-panel]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-note-toggle]');
  const input = document.querySelector<HTMLTextAreaElement>('[data-note-input]');
  const status = document.querySelector<HTMLElement>('[data-note-status]');
  const count = document.querySelector<HTMLElement>('[data-note-count]');
  const clear = document.querySelector<HTMLButtonElement>('[data-note-clear]');

  const paintCount = () => {
    if (count && input) count.textContent = `${input.value.length} / 4000`;
  };

  const openPanel = (open: boolean) => {
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      input?.focus();
      paintCount();
    }
  };

  if (panel && input) {
    const lib = readLibrary();
    input.value = lib.notes[slug]?.text ?? '';
    paintCount();
    if (status) status.textContent = lib.notes[slug] ? `上次保存 ${clock(lib.notes[slug].updated)}` : '自动保存到本机';
  }

  toggle?.addEventListener('click', () => openPanel(panel?.hidden ?? true));

  // 从「我的」页点「继续编辑」会带 #note，直接展开面板
  if (location.hash === '#note') openPanel(true);

  let timer: number | undefined;
  input?.addEventListener('input', () => {
    paintCount();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const lib = setNote(readLibrary(), slug, input.value);
      writeLibrary(lib);
      if (status) {
        status.textContent = lib.notes[slug] ? `已保存 ${clock(lib.notes[slug].updated)}` : '已清空';
      }
    }, 400);
  });

  clear?.addEventListener('click', () => {
    if (!input) return;
    input.value = '';
    paintCount();
    const lib = setNote(readLibrary(), slug, '');
    writeLibrary(lib);
    if (status) status.textContent = '已清空';
    input.focus();
  });

  document.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      bookmark?.click();
    } else if (key === 'n') {
      e.preventDefault();
      openPanel(panel?.hidden ?? true);
    }
  });

  paintBookmark();
  window.addEventListener('sa:library', paintBookmark);
}

/* ── 首页：继续阅读 ─────────────────────────────────────── */
function initContinue() {
  const box = document.querySelector<HTMLElement>('[data-continue]');
  if (!box) return;
  const progress = readProgress();
  let best: { slug: string; at: number } | null = null;
  for (const [slug, entry] of Object.entries(progress)) {
    const at = typeof entry?.at === 'number' ? entry.at : 0;
    if (!best || at > best.at) best = { slug, at };
  }
  if (!best) return;
  const link = box instanceof HTMLAnchorElement ? box : box.querySelector<HTMLAnchorElement>("a");
  const title = box.querySelector<HTMLElement>('[data-continue-title]');
  const map = JSON.parse(document.getElementById("lessonMap")?.textContent || "{}") as Record<string, { title: string; href: string }>;
  const meta = map?.[best.slug];
  if (!link) return;
  link.href = meta?.href ?? `/learn/${best.slug}`;
  if (title) title.textContent = meta?.title ?? best.slug;
  box.hidden = false;
}

/* ── 「我的」页 ─────────────────────────────────────────── */
function initLibraryPage() {
  const root = document.querySelector<HTMLElement>('[data-library-page]');
  if (!root) return;

  const catalog = JSON.parse(document.getElementById('lessonCatalog')?.textContent || '{}') as Record<
    string,
    { title: string; part: string; href: string }
  >;
  const bookmarksBox = root.querySelector<HTMLElement>('[data-bookmarks]');
  const notesBox = root.querySelector<HTMLElement>('[data-notes]');
  const statBookmarks = root.querySelector<HTMLElement>('[data-stat-bookmarks]');
  const statNotes = root.querySelector<HTMLElement>('[data-stat-notes]');
  const statRead = root.querySelector<HTMLElement>('[data-stat-read]');
  const status = root.querySelector<HTMLElement>('[data-import-status]');

  const render = () => {
    const lib = readLibrary();
    const progress = readProgress();
    const readCount = Object.values(progress).filter((x) => x?.read).length;
    if (statBookmarks) statBookmarks.textContent = String(lib.bookmarks.length);
    if (statNotes) statNotes.textContent = String(Object.keys(lib.notes).length);
    if (statRead) statRead.textContent = String(readCount);

    if (bookmarksBox) {
      if (!lib.bookmarks.length) {
        bookmarksBox.innerHTML = '<p class="lib-empty">还没有收藏。在任意课节点右上角的「收藏」，或按 <kbd>b</kbd>。</p>';
      } else {
        bookmarksBox.innerHTML = lib.bookmarks
          .map((slug) => {
            const item = catalog[slug];
            if (!item) return '';
            return `<a class="lib-row" href="${item.href}">
              <span class="lib-title">${item.title}</span>
              <span class="lib-meta">${item.part}</span>
            </a>`;
          })
          .join('');
      }
    }

    if (notesBox) {
      const entries = Object.entries(lib.notes).sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0));
      if (!entries.length) {
        notesBox.innerHTML = '<p class="lib-empty">还没有笔记。课节页按 <kbd>n</kbd> 打开笔记面板，边读边写。</p>';
      } else {
        notesBox.innerHTML = entries
          .filter(([slug]) => !!catalog[slug])
          .map(([slug, note]) => {
            const item = catalog[slug];
            const text = note.text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
            return `<article class="lib-note">
              <a class="lib-title" href="${item.href}">${item.title}</a>
              <p class="lib-note-text">${text}</p>
              <div class="lib-meta">${clock(note.updated)} · <a href="${item.href}#note">继续编辑</a></div>
            </article>`;
          })
          .join('');
      }
    }
  };

  root.querySelector<HTMLButtonElement>('[data-export]')?.addEventListener('click', () => {
    const blob = new Blob([exportLibrary(readLibrary())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '叠加学堂-我的收藏与笔记.json';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const file = root.querySelector<HTMLInputElement>('[data-import]');
  file?.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    const result = importLibrary(await chosen.text());
    if (!result.ok) {
      if (status) status.textContent = `导入失败：${result.error}`;
      return;
    }
    // 合并而不是覆盖：收藏取并集，笔记取更新时间较新的
    const current = readLibrary();
    const incoming = result.library;
    const bookmarks = Array.from(new Set([...current.bookmarks, ...incoming.bookmarks]));
    const notes = { ...current.notes };
    for (const [slug, note] of Object.entries(incoming.notes)) {
      if (!notes[slug] || (note.updated || 0) > (notes[slug].updated || 0)) notes[slug] = note;
    }
    writeLibrary({ bookmarks, notes });
    if (status) status.textContent = `已合并：收藏 ${bookmarks.length} 条，笔记 ${Object.keys(notes).length} 条`;
    file.value = '';
    render();
  });

  root.querySelector<HTMLButtonElement>('[data-clear]')?.addEventListener('click', () => {
    if (!window.confirm('清空收藏与笔记？此操作不可撤销，已读进度也会一起清空。')) return;
    writeLibrary(emptyLibrary());
    try {
      localStorage.removeItem('qc_progress_v1');
    } catch {
      /* ignore */
    }
    if (status) status.textContent = '已清空本机的收藏、笔记与进度';
    render();
    window.dispatchEvent(new Event('sa:cleared'));
  });

  window.addEventListener('sa:library', render);
  render();
}

initLessonTools();
initContinue();
initLibraryPage();
