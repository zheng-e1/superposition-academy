/** 站内通用交互：侧栏抽屉、阅读进度、已读标记、搜索浮层。 */

import { readProgress, writeProgress } from '../lib/progress';

function markRead(slug: string) {
  const map = readProgress();
  if (map[slug]?.read) return;
  map[slug] = { ...map[slug], read: true, at: Date.now() };
  writeProgress(map);
  const item = document.querySelector(`.side-lesson[data-slug="${slug}"]`);
  item?.setAttribute('data-read', 'true');
  paintRing();
}

function paintRing() {
  const ring = document.querySelector<SVGCircleElement>('[data-progress-fill]');
  const label = document.querySelector('[data-progress-label]');
  if (!ring) return;
  const items = Array.from(document.querySelectorAll<HTMLElement>('.side-lesson[data-slug]'));
  const map = readProgress();
  const done = items.filter((el) => map[el.dataset.slug || '']?.read).length;
  const ratio = items.length ? done / items.length : 0;
  const c = 2 * Math.PI * 15.5;
  ring.style.strokeDasharray = `${c}`;
  ring.style.strokeDashoffset = `${c * (1 - ratio)}`;
  if (label) label.textContent = `${done} / ${items.length}`;
}

/* ── 侧栏抽屉 ─────────────────────────────────────────────── */
function initDrawer() {
  const btn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!btn || !sidebar) return;

  const set = (open: boolean) => {
    sidebar.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
    if (backdrop) backdrop.dataset.open = String(open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      // 打开抽屉时把当前课节滚到视线中间，手机上不用再找
      requestAnimationFrame(() => {
        const cur = sidebar.querySelector<HTMLElement>('.side-lesson[aria-current="page"]');
        if (!cur) return;
        const top = cur.getBoundingClientRect().top - sidebar.getBoundingClientRect().top + sidebar.scrollTop;
        sidebar.scrollTop = Math.max(0, top - sidebar.clientHeight / 2);
      });
    }
  };

  btn.addEventListener('click', () => set(sidebar.dataset.open !== 'true'));
  backdrop?.addEventListener('click', () => set(false));
  sidebar.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.dataset.open === 'true') set(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && sidebar.dataset.open === 'true') set(false);
  });
}

/* ── 篇章折叠 ─────────────────────────────────────────────── */
function initSideGroups() {
  document.querySelectorAll<HTMLElement>('[data-side-group]').forEach((group) => {
    const head = group.querySelector<HTMLButtonElement>('[data-side-toggle]');
    if (!head) return;
    head.addEventListener('click', () => {
      const open = group.dataset.open !== 'false';
      group.dataset.open = String(!open);
      head.setAttribute('aria-expanded', String(!open));
    });
  });
}

/* ── 阅读进度与已读 ───────────────────────────────────────── */
function initReading() {
  const article = document.querySelector<HTMLElement>('[data-lesson]');
  const bar = document.getElementById('readingProgress');
  if (!article) return;

  const slug = article.dataset.slug || '';
  let marked = false;

  const update = () => {
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight * 0.6;
    const passed = Math.min(Math.max(-rect.top + window.innerHeight * 0.3, 0), Math.max(total, 1));
    const ratio = total > 0 ? passed / total : 1;
    if (bar) bar.style.width = `${Math.min(ratio, 1) * 100}%`;
    if (!marked && (ratio > 0.75 || rect.bottom < window.innerHeight * 0.9)) {
      marked = true;
      markRead(slug);
    }
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/* ── 搜索 ─────────────────────────────────────────────────── */
interface SearchDoc {
  slug: string;
  title: string;
  thesis: string;
  part: string;
  partTitle: string;
  text?: string;
}

function initSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput') as HTMLInputElement | null;
  const results = document.getElementById('searchResults');
  const openBtn = document.getElementById('searchBtn');
  if (!overlay || !input || !results) return;

  let docs: SearchDoc[] | null = null;
  let pagefind: any = null;
  let pagefindTried = false;
  let active = -1;
  let items: { href: string; title: string; desc: string; meta: string }[] = [];

  const open = async () => {
    overlay.dataset.open = 'true';
    input.value = '';
    input.focus();
    render([]);
    if (!docs) {
      try {
        const res = await fetch('/search-index.json');
        docs = (await res.json()) as SearchDoc[];
      } catch {
        docs = [];
      }
    }
  };

  const close = () => {
    overlay.dataset.open = 'false';
    active = -1;
  };

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return `${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
  };

  const render = (rows: typeof items) => {
    items = rows;
    active = -1;
    if (!rows.length) {
      results.innerHTML = `<div class="search-empty">${
        input.value ? '没有匹配的课节，换个说法试试。' : '输入关键词，例如「布洛赫」「Grover」「纠错」。'
      }</div>`;
      return;
    }
    results.innerHTML = rows
      .map(
        (r, i) => `<a class="search-result" href="${r.href}" data-i="${i}">
          <div class="t">${r.title}</div>
          <div class="d">${r.desc}</div>
          <div class="p">${r.meta}</div>
        </a>`,
      )
      .join('');
  };

  const localSearch = (q: string) => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length || !docs) return [];
    return docs
      .map((d) => {
        const hay = `${d.title} ${d.thesis} ${d.partTitle} ${d.text ?? ""}`.toLowerCase();
        if (!tokens.every((t) => hay.includes(t))) return null;
        let score = 0;
        for (const t of tokens) {
          if (d.title.toLowerCase().includes(t)) score += 8;
          if (d.thesis.toLowerCase().includes(t)) score += 3;
          if ((d.text ?? '').toLowerCase().includes(t)) score += 1;
        }
        return { d, score };
      })
      .filter((x): x is { d: SearchDoc; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ d }) => ({
        href: `/learn/${d.slug}`,
        title: highlight(d.title, q),
        desc: highlight(d.thesis, q),
        meta: `${d.partTitle} · ${d.slug}`,
      }));
  };

  const remoteSearch = async (q: string) => {
    if (!pagefind) return null;
    const res = await pagefind.search(q);
    const rows = await Promise.all(
      res.results.slice(0, 8).map(async (r: any) => {
        const data = await r.data();
        return {
          href: data.url,
          title: data.meta?.title || data.url,
          desc: (data.excerpt || '').replace(/<[^>]+>/g, ''),
          meta: data.meta?.part || '',
        };
      }),
    );
    return rows;
  };

  const run = async () => {
    const q = input.value.trim();
    if (!q) return render([]);
    if (!pagefindTried) {
      pagefindTried = true;
      try {
        // Pagefind 的索引只有构建后才存在；用 Function 形式的动态 import
        // 避免打包器在开发期尝试解析这个路径。
        const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;
        pagefind = await dynamicImport('/pagefind/pagefind.js');
        await pagefind.options?.({ excerptLength: 18 });
        await pagefind.init?.();
      } catch {
        pagefind = null;
      }
    }
    // 标题/摘要命中优先，Pagefind 的正文命中补在后面；中文分词弱时也不会把本地结果盖掉
    const local = localSearch(q);
    const remote = (await remoteSearch(q)) ?? [];
    const seen = new Set(local.map((r) => r.href));
    const merged = [...local, ...remote.filter((r) => !seen.has(r.href))].slice(0, 8);
    render(merged);
  };

  let timer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 120);
  });

  input.addEventListener('keydown', (e) => {
    const nodes = Array.from(results.querySelectorAll<HTMLAnchorElement>('.search-result'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!nodes.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length;
      nodes.forEach((n, i) => n.setAttribute('data-active', String(i === active)));
      nodes[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0 && nodes[active]) {
      e.preventDefault();
      window.location.href = nodes[active].href;
    }
  });

  openBtn?.addEventListener('click', open);

  // 支持 /?q=grover 这类深链，方便分享一次搜索
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) {
    void open().then(() => {
      input.value = initial;
      void run();
    });
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.dataset.open === 'true' ? close() : open();
    } else if (e.key === 'Escape' && overlay.dataset.open === 'true') {
      close();
    } else if (e.key === '/' && overlay.dataset.open !== 'true') {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      open();
    }
  });
}

/* ── 启动 ─────────────────────────────────────────────────── */
initDrawer();
initSideGroups();
initReading();
initSearch();
paintRing();
