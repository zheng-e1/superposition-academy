import { describe, expect, it } from 'vitest';
import {
  decodeCircuit,
  encodeCircuit,
  insertOp,
  normalizeCircuit,
  removeOp,
  tokenFromHash,
} from '../src/lib/lab-codec';

const bell = {
  n: 2,
  ops: [
    { g: 'h' as const, q: 0 },
    { g: 'cx' as const, q: 0, t: 1 },
  ],
};

describe('线路编码', () => {
  it('往返不丢信息', () => {
    const token = encodeCircuit(bell);
    expect(decodeCircuit(token)).toEqual(bell);
  });

  it('编码是 URL 安全的', () => {
    const token = encodeCircuit({ n: 3, ops: [
      { g: 'h', q: 0 }, { g: 't', q: 1 }, { g: 'cz', q: 1, t: 2 }, { g: 's', q: 2 },
    ] });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('能处理空线路', () => {
    const empty = { n: 3, ops: [] };
    expect(decodeCircuit(encodeCircuit(empty))).toEqual(empty);
  });

  it('拒绝非法比特数', () => {
    expect(normalizeCircuit({ n: 0, ops: [] })).toBeNull();
    expect(normalizeCircuit({ n: 99, ops: [] })).toBeNull();
    expect(normalizeCircuit({ n: 2.5, ops: [] })).toBeNull();
  });

  it('拒绝未知门与越界下标', () => {
    expect(normalizeCircuit({ n: 2, ops: [{ g: 'u3', q: 0 }] })).toBeNull();
    expect(normalizeCircuit({ n: 2, ops: [{ g: 'h', q: 2 }] })).toBeNull();
    expect(normalizeCircuit({ n: 2, ops: [{ g: 'cx', q: 0, t: 0 }] })).toBeNull();
    expect(normalizeCircuit({ n: 2, ops: [{ g: 'cx', q: 0 }] })).toBeNull();
  });

  it('拒绝过长线路', () => {
    const ops = Array.from({ length: 61 }, () => ({ g: 'h' as const, q: 0 }));
    expect(normalizeCircuit({ n: 1, ops })).toBeNull();
  });

  it('坏 token 返回 null 而不是抛错', () => {
    expect(decodeCircuit('')).toBeNull();
    expect(decodeCircuit('!!!!')).toBeNull();
    expect(decodeCircuit(btoa('{"n":2,"o":[["bad",0]]}'))).toBeNull();
    expect(decodeCircuit(btoa('not json'))).toBeNull();
  });

  it('从 hash 中取载荷', () => {
    expect(tokenFromHash('#c=abc_-123')).toBe('abc_-123');
    expect(tokenFromHash('#c=abc&x=1')).toBe('abc');
    expect(tokenFromHash('#top')).toBeNull();
    expect(tokenFromHash('')).toBeNull();
  });
});

describe('编辑操作', () => {
  it('在指定位置插入，不覆盖原有门', () => {
    const c = insertOp(bell, 1, 'x', 1);
    expect(c.ops.map((o) => o.g)).toEqual(['h', 'x', 'cx']);
    expect(c.ops[1]).toEqual({ g: 'x', q: 1 });
  });

  it('插入位置越界时夹到两端', () => {
    expect(insertOp(bell, -5, 'z', 0).ops[0].g).toBe('z');
    expect(insertOp(bell, 99, 'z', 0).ops.at(-1)?.g).toBe('z');
  });

  it('两比特门自动取下一行作目标', () => {
    const c = insertOp({ n: 3, ops: [] }, 0, 'cx', 1);
    expect(c.ops[0]).toEqual({ g: 'cx', q: 1, t: 2 });
  });

  it('删除指定门', () => {
    const c = removeOp(bell, 0);
    expect(c.ops).toHaveLength(1);
    expect(c.ops[0].g).toBe('cx');
  });

  it('删除越界下标时原样返回', () => {
    expect(removeOp(bell, 9)).toBe(bell);
    expect(removeOp(bell, -1)).toBe(bell);
  });
});
