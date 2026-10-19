/**
 * 本地「我的」数据：收藏与笔记。
 * 纯函数，便于在 Node 里测试；DOM 读写放在 scripts/library.ts。
 */

export interface Note {
  text: string;
  updated: number;
}

export interface Library {
  bookmarks: string[];
  notes: Record<string, Note>;
}

export const LIBRARY_KEY = 'sa_library_v1';
export const NOTE_MAX = 4000;

export function emptyLibrary(): Library {
  return { bookmarks: [], notes: {} };
}

/** 宽松解析：坏数据一律降级为空，绝不让页面崩。 */
export function parseLibrary(raw: string | null | undefined): Library {
  if (!raw) return emptyLibrary();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyLibrary();
  }
  if (!value || typeof value !== 'object') return emptyLibrary();
  const obj = value as Record<string, unknown>;

  const bookmarks = Array.isArray(obj.bookmarks)
    ? Array.from(new Set(obj.bookmarks.filter((s): s is string => typeof s === 'string' && s.length > 0)))
    : [];

  const notes: Record<string, Note> = {};
  if (obj.notes && typeof obj.notes === 'object') {
    for (const [slug, note] of Object.entries(obj.notes as Record<string, unknown>)) {
      if (!slug || !note || typeof note !== 'object') continue;
      const n = note as Record<string, unknown>;
      if (typeof n.text !== 'string' || !n.text.trim()) continue;
      notes[slug] = {
        text: n.text.slice(0, NOTE_MAX),
        updated: typeof n.updated === 'number' && Number.isFinite(n.updated) ? n.updated : 0,
      };
    }
  }

  return { bookmarks, notes };
}

export function isBookmarked(lib: Library, slug: string): boolean {
  return lib.bookmarks.includes(slug);
}

export function toggleBookmark(lib: Library, slug: string): Library {
  const has = lib.bookmarks.includes(slug);
  return {
    ...lib,
    bookmarks: has ? lib.bookmarks.filter((s) => s !== slug) : [...lib.bookmarks, slug],
  };
}

/** 空文本等于删除笔记。 */
export function setNote(lib: Library, slug: string, text: string, now = Date.now()): Library {
  const trimmed = text.slice(0, NOTE_MAX);
  const notes = { ...lib.notes };
  if (!trimmed.trim()) {
    delete notes[slug];
    return { ...lib, notes };
  }
  notes[slug] = { text: trimmed, updated: now };
  return { ...lib, notes };
}

export function exportLibrary(lib: Library): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...lib }, null, 2);
}

export type ImportResult =
  | { ok: true; library: Library }
  | { ok: false; error: string };

export function importLibrary(raw: string): ImportResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: '不是合法的 JSON 文件' };
  }
  if (!value || typeof value !== 'object') {
    return { ok: false, error: '文件内容不是对象' };
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.bookmarks) && (!obj.notes || typeof obj.notes !== 'object')) {
    return { ok: false, error: '找不到 bookmarks 或 notes 字段' };
  }
  return { ok: true, library: parseLibrary(JSON.stringify(obj)) };
}

/** 进度里 last read 的 slug（按 at 最大），没有返回 null。 */
export function lastReadSlug(progress: Record<string, { read?: boolean; at?: number }>): string | null {
  let best: { slug: string; at: number } | null = null;
  for (const [slug, entry] of Object.entries(progress)) {
    if (!slug) continue;
    const at = typeof entry?.at === 'number' ? entry.at : 0;
    if (!best || at > best.at) best = { slug, at };
  }
  return best ? best.slug : null;
}
