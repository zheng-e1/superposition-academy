import { describe, expect, it } from 'vitest';
import golden from './golden.json';
import { Circuit, basisLabel, formatAngle, mulberry32 } from '../src/lib/qsim';

type Case = { n: number; amps: number[][]; probs: number[]; bloch: number[][] };
const cases = golden as unknown as Record<string, Case>;

/** 与 numpy 参照值逐条比对，容差 1e-9 */
function build(name: string): Circuit {
  switch (name) {
    case 'h1':
      return new Circuit(1).h(0);
    case 'x1':
      return new Circuit(1).x(0);
    case 'bell':
      return new Circuit(2).h(0).cx(0, 1);
    case 'plus_plus':
      return new Circuit(2).h(0).h(1);
    case 't_after_h':
      return new Circuit(1).h(0).t(0);
    case 'ry60':
      return new Circuit(1).ry(0, Math.PI / 3);
    case 'ghz3':
      return new Circuit(3).h(0).cx(0, 1).cx(1, 2);
    case 'grover2':
      return new Circuit(2)
        .h(0).h(1)
        .cz(0, 1)
        .h(0).h(1)
        .x(0).x(1)
        .cz(0, 1)
        .x(0).x(1)
        .h(0).h(1);
    case 'mixed2':
      return new Circuit(2)
        .h(0)
        .rz(1, 0.7)
        .cx(0, 1)
        .ry(0, 1.1)
        .cp(0, 1, 0.4);
    case 'swap_test':
      return new Circuit(2).x(0).h(1).swap(0, 1);
    default:
      throw new Error(`未知基准 ${name}`);
  }
}

describe('qsim 与 numpy 参照值一致', () => {
  for (const [name, expected] of Object.entries(cases)) {
    it(name, () => {
      const c = build(name);
      const amps = c.amplitudes();
      expect(amps).toHaveLength(expected.amps.length);
      amps.forEach((a, i) => {
        expect(a.re).toBeCloseTo(expected.amps[i][0], 9);
        expect(a.im).toBeCloseTo(expected.amps[i][1], 9);
      });

      c.probabilities().forEach((p, i) => {
        expect(p).toBeCloseTo(expected.probs[i], 9);
      });

      expected.bloch.forEach((b, q) => {
        const got = c.bloch(q);
        expect(got.x).toBeCloseTo(b[0], 9);
        expect(got.y).toBeCloseTo(b[1], 9);
        expect(got.z).toBeCloseTo(b[2], 9);
      });
    });
  }
});

describe('语义与边界', () => {
  it('概率归一', () => {
    const c = new Circuit(3).h(0).ry(1, 0.9).cx(1, 2).cp(0, 2, 0.3);
    const sum = c.probabilities().reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
  });

  it('|+⟩ 的布洛赫矢量指向 +x', () => {
    const b = new Circuit(1).h(0).bloch(0);
    expect(b.x).toBeCloseTo(1, 12);
    expect(b.y).toBeCloseTo(0, 12);
    expect(b.z).toBeCloseTo(0, 12);
  });

  it('S 门把 |+⟩ 转到 +y', () => {
    const b = new Circuit(1).h(0).s(0).bloch(0);
    expect(b.x).toBeCloseTo(0, 12);
    expect(b.y).toBeCloseTo(1, 12);
  });

  it('纠缠态的单比特纯度降到 1/2', () => {
    const c = new Circuit(2).h(0).cx(0, 1);
    expect(c.purity(0)).toBeCloseTo(0.5, 12);
    expect(c.purity(1)).toBeCloseTo(0.5, 12);
    const product = new Circuit(2).h(0);
    expect(product.purity(1)).toBeCloseTo(1, 12);
  });

  it('Bell 态的 ZZ 关联为 1，XX 也为 1', () => {
    const c = new Circuit(2).h(0).cx(0, 1);
    expect(c.expectation('ZZ')).toBeCloseTo(1, 12);
    expect(c.expectation('XX')).toBeCloseTo(1, 12);
    expect(c.expectation('ZI')).toBeCloseTo(0, 12);
  });

  it('采样结果满足统计分布', () => {
    const c = new Circuit(1).h(0);
    const out = c.sample(20000, 42);
    expect(Object.keys(out).sort()).toEqual(['0', '1']);
    expect(out['0'] / 20000).toBeGreaterThan(0.47);
    expect(out['0'] / 20000).toBeLessThan(0.53);
  });

  it('同种子采样完全可复现', () => {
    const c = new Circuit(3).h(0).cx(0, 1).cx(1, 2);
    expect(c.sample(500, 7)).toEqual(c.sample(500, 7));
  });

  it('测量会把态投影到结果上', () => {
    const c = new Circuit(1).h(0);
    const out = c.measure(0);
    const p = c.probabilities();
    expect(p[out]).toBeCloseTo(1, 12);
    expect(p[1 - out]).toBeCloseTo(0, 12);
  });

  it('对零概率结果坍缩会报错而不是静默出错', () => {
    const c = new Circuit(1); // |0⟩
    expect(() => c.collapse(0, 1)).toThrow(/概率为 0/);
  });

  it('比特越界要报错', () => {
    const c = new Circuit(2);
    expect(() => c.h(2)).toThrow(RangeError);
    expect(() => new Circuit(0)).toThrow(RangeError);
    expect(() => new Circuit(99)).toThrow(RangeError);
  });

  it('受控门只在控制位为 1 时生效', () => {
    const c = new Circuit(2).x(0).cx(0, 1);
    expect(c.probabilities()[3]).toBeCloseTo(1, 12); // |11⟩
  });

  it('swap 交换两个比特', () => {
    const c = new Circuit(2).x(0).swap(0, 1);
    expect(c.probabilities()[1]).toBeCloseTo(1, 12); // |01⟩
  });

  it('Toffoli 需要两个控制位都为 1', () => {
    const half = new Circuit(3).x(0).ccx(0, 1, 2);
    expect(half.probabilities()[4]).toBeCloseTo(1, 12); // |100⟩，未触发
    const full = new Circuit(3).x(0).x(1).ccx(0, 1, 2);
    expect(full.probabilities()[7]).toBeCloseTo(1, 12); // |111⟩
  });

  it('stepStates 给出逐步概率且首项为初始态', () => {
    const steps = new Circuit(2).h(0).cx(0, 1).stepStates();
    expect(steps).toHaveLength(3);
    expect(steps[0].probs[0]).toBeCloseTo(1, 12);
    expect(steps[2].probs[3]).toBeCloseTo(0.5, 12);
  });

  it('基态标签从高位到低位', () => {
    expect(basisLabel(1, 2)).toBe('01');
    expect(basisLabel(2, 3)).toBe('010');
  });

  it('角度格式化输出 QASM 友好的写法', () => {
    expect(formatAngle(Math.PI / 2)).toBe('pi/2');
    expect(formatAngle(Math.PI)).toBe('pi');
  });

  it('导出合法 OpenQASM 2.0', () => {
    const c = new Circuit(2).h(0).cx(0, 1);
    c.measure(0, 0);
    c.measure(1, 1);
    const qasm = c.toQASM();
    expect(qasm).toContain('OPENQASM 2.0;');
    expect(qasm).toContain('qreg q[2];');
    expect(qasm).toContain('creg c[2];');
    expect(qasm).toContain('h q[0];');
    expect(qasm).toContain('cx q[0],q[1];');
    expect(qasm).toContain('measure q[1] -> c[1];');
  });

  it('PRNG 同种子序列一致且落在 [0,1)', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
