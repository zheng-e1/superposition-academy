import { describe, expect, it } from 'vitest';
import {
  emptyLibrary,
  exportLibrary,
  importLibrary,
  isBookmarked,
  lastReadSlug,
  parseLibrary,
  setNote,
  toggleBookmark,
} from '../src/lib/library';

describe('library: parse', () => {
  it('空值返回空库', () => {
    expect(parseLibrary(null)).toEqual(emptyLibrary());
    expect(parseLibrary('')).toEqual(emptyLibrary());
    expect(parseLibrary('not json')).toEqual(emptyLibrary());
    expect(parseLibrary('[]')).toEqual(emptyLibrary());
  });

  it('过滤非法项并去重', () => {
    const lib = parseLibrary(
      JSON.stringify({
        bookmarks: ['a', 'a', 3, null, 'b'],
        notes: { a: { text: 'hi', updated: 5 }, b: { text: '   ' }, c: { nope: 1 } },
      }),
    );
    expect(lib.bookmarks).toEqual(['a', 'b']);
    expect(Object.keys(lib.notes)).toEqual(['a']);
    expect(lib.notes.a).toEqual({ text: 'hi', updated: 5 });
  });

  it('笔记超长会被截断', () => {
    const lib = parseLibrary(JSON.stringify({ bookmarks: [], notes: { a: { text: 'x'.repeat(9000) } } }));
    expect(lib.notes.a.text.length).toBe(4000);
  });
});

describe('library: bookmarks', () => {
  it('切换收藏', () => {
    let lib = emptyLibrary();
    expect(isBookmarked(lib, 'grover')).toBe(false);
    lib = toggleBookmark(lib, 'grover');
    expect(isBookmarked(lib, 'grover')).toBe(true);
    lib = toggleBookmark(lib, 'grover');
    expect(isBookmarked(lib, 'grover')).toBe(false);
  });

  it('不修改原对象', () => {
    const lib = emptyLibrary();
    const next = toggleBookmark(lib, 'x');
    expect(lib.bookmarks).toEqual([]);
    expect(next.bookmarks).toEqual(['x']);
  });
});

describe('library: notes', () => {
  it('写入与删除', () => {
    let lib = setNote(emptyLibrary(), 'hhl', '读出是瓶颈', 100);
    expect(lib.notes.hhl).toEqual({ text: '读出是瓶颈', updated: 100 });
    lib = setNote(lib, 'hhl', '   ');
    expect(lib.notes.hhl).toBeUndefined();
  });

  it('保留其他笔记', () => {
    let lib = setNote(emptyLibrary(), 'a', 'one', 1);
    lib = setNote(lib, 'b', 'two', 2);
    lib = setNote(lib, 'a', '', 3);
    expect(Object.keys(lib.notes)).toEqual(['b']);
  });
});

describe('library: export/import', () => {
  it('导出再导入是同一个库', () => {
    const lib = setNote(toggleBookmark(emptyLibrary(), 'bell-state'), 'bell-state', '笔记', 7);
    const result = importLibrary(exportLibrary(lib));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.library).toEqual(lib);
  });

  it('拒绝坏文件并给出原因', () => {
    expect(importLibrary('{').ok).toBe(false);
    expect(importLibrary('{"foo":1}').ok).toBe(false);
    const fail = importLibrary('[]');
    expect(fail.ok).toBe(false);
    if (!fail.ok) expect(fail.error.length).toBeGreaterThan(0);
  });
});

describe('library: last read', () => {
  it('取 at 最大的课节', () => {
    expect(lastReadSlug({})).toBeNull();
    expect(lastReadSlug({ a: { at: 1 }, b: { at: 5 }, c: { read: true } })).toBe('b');
  });
});
