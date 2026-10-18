/**
 * qsim —— 叠加学堂的量子线路仿真引擎
 * 零依赖、纯 TS、浏览器与 Node 通用。
 *
 * 表示：
 *  - 态矢为两个 Float64Array（实部/虚部），长度 2^n，索引 0 对应 |00…0⟩。
 *  - qubit 0 是最高位（与 Qiskit 的字符串顺序一致），便于基态标签直接读。
 *  - 2×2 门矩阵按行存成 8 个数字：[a.re,a.im,b.re,b.im,c.re,c.im,d.re,d.im]，
 *    即 [[a,b],[c,d]]，避免对象分配。
 */

export type Mat2 = readonly [
  number, number, number, number,
  number, number, number, number,
];

export interface BlochVector {
  x: number;
  y: number;
  z: number;
}

/** 一个门操作：qubits 的最后一位是目标位，前面都是控制位（全 1 时生效）。 */
export interface GateOp {
  kind: 'gate';
  name: string;
  qubits: number[];
  matrix: Mat2;
  angle?: number;
}

export interface SwapOp {
  kind: 'swap';
  qubits: [number, number];
}

export interface MeasureOp {
  kind: 'measure';
  qubit: number;
  bit: number;
  outcome?: number;
}

export interface BarrierOp {
  kind: 'barrier';
}

export type Op = GateOp | SwapOp | MeasureOp | BarrierOp;

export const MAX_QUBITS = 14;

/** 指数格式的复数：长度 2^n 的基态标签 */
export function basisLabel(index: number, n: number): string {
  return index.toString(2).padStart(n, '0');
}

export class Circuit {
  readonly n: number;
  private re: Float64Array;
  private im: Float64Array;
  private ops: Op[] = [];
  private pending: Op[] = [];
  private collapsed = false;

  constructor(qubits: number) {
    if (!Number.isInteger(qubits) || qubits < 1 || qubits > MAX_QUBITS) {
      throw new RangeError(`qubit 数必须是 1–${MAX_QUBITS} 的整数，收到 ${qubits}`);
    }
    this.n = qubits;
    const dim = 1 << qubits;
    this.re = new Float64Array(dim);
    this.im = new Float64Array(dim);
    this.re[0] = 1; // |00…0⟩
  }

  /** 当前是 |0…0⟩，且没有测量过 */
  get pristine(): boolean {
    return this.ops.length === 0;
  }

  get history(): readonly Op[] {
    return this.ops;
  }

  get totalGates(): number {
    return this.ops.filter((o) => o.kind !== 'barrier').length;
  }

  // ── 单比特门 ────────────────────────────────────────────────
  i(q: number) { return this.gate('i', [q], ID); }
  x(q: number) { return this.gate('x', [q], X); }
  y(q: number) { return this.gate('y', [q], Y); }
  z(q: number) { return this.gate('z', [q], Z); }
  h(q: number) { return this.gate('h', [q], H); }
  s(q: number) { return this.gate('s', [q], S); }
  sdg(q: number) { return this.gate('sdg', [q], SDG); }
  t(q: number) { return this.gate('t', [q], T); }
  tdg(q: number) { return this.gate('tdg', [q], TDG); }
  rx(q: number, theta: number) { return this.gate('rx', [q], rx(theta), theta); }
  ry(q: number, theta: number) { return this.gate('ry', [q], ry(theta), theta); }
  rz(q: number, theta: number) { return this.gate('rz', [q], rz(theta), theta); }
  p(q: number, theta: number) { return this.gate('p', [q], phaseGate(theta), theta); }

  // ── 受控门 ──────────────────────────────────────────────────
  cx(control: number, target: number) { return this.gate('cx', [control, target], X); }
  cy(control: number, target: number) { return this.gate('cy', [control, target], Y); }
  cz(control: number, target: number) { return this.gate('cz', [control, target], Z); }
  ch(control: number, target: number) { return this.gate('ch', [control, target], H); }
  cp(control: number, target: number, theta: number) {
    return this.gate('cp', [control, target], phaseGate(theta), theta);
  }
  ccx(a: number, b: number, target: number) {
    return this.gate('ccx', [a, b, target], X);
  }
  swap(a: number, b: number) {
    this.assertQubit(a);
    this.assertQubit(b);
    if (a === b) return this;
    const op: SwapOp = { kind: 'swap', qubits: [a, b] };
    this.ops.push(op);
    this.pending.push(op);
    return this;
  }

  barrier() {
    const op: BarrierOp = { kind: 'barrier' };
    this.ops.push(op);
    return this;
  }

  // ── 测量（会坍缩状态） ──────────────────────────────────────
  /** 测一个比特，返回 0/1，并把态投影到该结果上。 */
  measure(qubit: number, bit = qubit): number {
    this.assertQubit(qubit);
    this.flush();
    const p1 = this.probOne(qubit);
    const outcome = Math.random() < p1 ? 1 : 0;
    this.project(qubit, outcome);
    this.collapsed = true;
    this.ops.push({ kind: 'measure', qubit, bit, outcome });
    return outcome;
  }

  /** 按给定结果坍缩（用于教材演示的确定性回放）。 */
  collapse(qubit: number, outcome: 0 | 1): this {
    this.assertQubit(qubit);
    this.flush();
    this.project(qubit, outcome);
    this.collapsed = true;
    this.ops.push({ kind: 'measure', qubit, bit: qubit, outcome });
    return this;
  }

  // ── 读取结果 ────────────────────────────────────────────────
  /** 复振幅，返回 [{re, im}, …]，长度 2^n */
  amplitudes(): { re: number; im: number }[] {
    this.flush();
    const out = new Array(this.re.length);
    for (let i = 0; i < this.re.length; i++) out[i] = { re: this.re[i], im: this.im[i] };
    return out;
  }

  probabilities(): number[] {
    this.flush();
    const out = new Array(this.re.length);
    for (let i = 0; i < this.re.length; i++) {
      out[i] = this.re[i] * this.re[i] + this.im[i] * this.im[i];
    }
    return out;
  }

  /** 单比特约化密度矩阵 → 布洛赫矢量 */
  bloch(qubit: number): BlochVector {
    this.assertQubit(qubit);
    this.flush();
    const n = this.n;
    const bit = 1 << (n - 1 - qubit);
    let r00 = 0;
    let r11 = 0;
    let r01re = 0;
    let r01im = 0;
    for (let i = 0; i < this.re.length; i++) {
      if (i & bit) continue;
      const j = i | bit;
      r00 += this.re[i] * this.re[i] + this.im[i] * this.im[i];
      r11 += this.re[j] * this.re[j] + this.im[j] * this.im[j];
      // ρ01 = Σ ψ(i) ψ*(j)
      r01re += this.re[i] * this.re[j] + this.im[i] * this.im[j];
      r01im += this.im[i] * this.re[j] - this.re[i] * this.im[j];
    }
    return {
      x: 2 * r01re,
      y: -2 * r01im,
      z: r00 - r11,
    };
  }

  /** 纯度 0.5–1：低于 1 说明该比特与别的比特纠缠了 */
  purity(qubit: number): number {
    const b = this.bloch(qubit);
    return (1 + b.x * b.x + b.y * b.y + b.z * b.z) / 2;
  }

  probOne(qubit: number): number {
    this.flush();
    const bit = 1 << (this.n - 1 - qubit);
    let p = 0;
    for (let i = 0; i < this.re.length; i++) {
      if (i & bit) p += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    }
    return p;
  }

  /** 期望值 ⟨ψ|P|ψ⟩，P 用泡利串表示，如 'ZZ'、'XI'、'XY' */
  expectation(pauli: string): number {
    if (pauli.length !== this.n) throw new RangeError(`泡利串长度应为 ${this.n}`);
    this.flush();
    const { re, im } = this.applyPauliToCopy(pauli);
    let acc = 0;
    for (let i = 0; i < re.length; i++) {
      // ⟨ψ|φ⟩ 的实部
      acc += this.re[i] * re[i] + this.im[i] * im[i];
    }
    return acc;
  }

  /** 采样 shots 次，返回 { '01': 512, … }。不改变状态。 */
  sample(shots: number, seed?: number): Record<string, number> {
    const probs = this.probabilities();
    const rand = mulberry32(seed ?? 0x9e3779b9);
    const out: Record<string, number> = {};
    for (let s = 0; s < shots; s++) {
      const r = rand();
      let acc = 0;
      let picked = probs.length - 1;
      for (let i = 0; i < probs.length; i++) {
        acc += probs[i];
        if (r < acc) {
          picked = i;
          break;
        }
      }
      const label = basisLabel(picked, this.n);
      out[label] = (out[label] ?? 0) + 1;
    }
    return out;
  }

  /** 逐步状态快照：第 k 项是执行前 k 个门之后的状态 */
  stepStates(): { label: string; probs: number[]; amplitudes: { re: number; im: number }[] }[] {
    const states = [];
    const probe = new Circuit(this.n);
    states.push({
      label: '初始',
      probs: probe.probabilities(),
      amplitudes: probe.amplitudes(),
    });
    for (const op of this.ops) {
      if (op.kind === 'barrier') continue;
      if (op.kind === 'measure') continue;
      if (op.kind === 'swap') {
        probe.swap(op.qubits[0], op.qubits[1]);
      } else {
        probe.gate(op.name, op.qubits, op.matrix, op.angle);
      }
      states.push({
        label: op.kind === 'swap' ? 'swap' : op.name,
        probs: probe.probabilities(),
        amplitudes: probe.amplitudes(),
      });
    }
    return states;
  }

  /** 导出 OpenQASM 2.0（可直接粘到 IBM Quantum / 本源量子云） */
  toQASM(): string {
    const lines = ['OPENQASM 2.0;', 'include "qelib1.inc";', '', `qreg q[${this.n}];`];
    const needC = this.ops.some((o) => o.kind === 'measure');
    if (needC) lines.push(`creg c[${this.n}];`);
    lines.push('');
    for (const op of this.ops) {
      if (op.kind === 'barrier') { lines.push(`barrier ${range(this.n)};`); continue; }
      if (op.kind === 'measure') {
        lines.push(`measure q[${op.qubit}] -> c[${op.bit}];`);
        continue;
      }
      if (op.kind === 'swap') {
        lines.push(`swap q[${op.qubits[0]}],q[${op.qubits[1]}];`);
        continue;
      }
      const args = op.angle !== undefined ? `(${formatAngle(op.angle)}) ` : ' ';
      const qargs = op.qubits.map((q) => `q[${q}]`).join(',');
      lines.push(`${op.name}${args}${qargs};`);
    }
    return lines.join('\n');
  }

  // ── 内部 ────────────────────────────────────────────────────
  private gate(name: string, qubits: number[], matrix: Mat2, angle?: number) {
    for (const q of qubits) this.assertQubit(q);
    if (new Set(qubits).size !== qubits.length) {
      throw new RangeError(`门 ${name} 的目标位不能重复：${qubits.join(',')}`);
    }
    const op: GateOp = { kind: 'gate', name, qubits, matrix, ...(angle !== undefined ? { angle } : {}) };
    this.ops.push(op);
    this.pending.push(op);
    return this;
  }

  private flush() {
    if (this.pending.length === 0) return;
    for (const op of this.pending) this.apply(op);
    this.pending = [];
  }

  private apply(op: Op) {
    if (op.kind === 'gate') {
      this.applyMatrix(op.matrix, op.qubits);
    } else if (op.kind === 'swap') {
      const [a, b] = op.qubits;
      const ba = 1 << (this.n - 1 - a);
      const bb = 1 << (this.n - 1 - b);
      for (let i = 0; i < this.re.length; i++) {
        const aOn = (i & ba) !== 0;
        const bOn = (i & bb) !== 0;
        if (aOn === bOn) continue;
        const j = i ^ ba ^ bb;
        if (i > j) continue;
        [this.re[i], this.re[j]] = [this.re[j], this.re[i]];
        [this.im[i], this.im[j]] = [this.im[j], this.im[i]];
      }
    }
  }

  private applyMatrix(m: Mat2, qubits: number[]) {
    const target = qubits[qubits.length - 1];
    const bit = 1 << (this.n - 1 - target);
    let controlMask = 0;
    let controlValue = 0;
    for (let k = 0; k < qubits.length - 1; k++) {
      const cb = 1 << (this.n - 1 - qubits[k]);
      controlMask |= cb;
      controlValue |= cb;
    }
    const [ar, ai, br, bi, cr, ci, dr, di] = m;
    for (let i = 0; i < this.re.length; i++) {
      if (i & bit) continue;
      if ((i & controlMask) !== controlValue) continue;
      const j = i | bit;
      const xr = this.re[i];
      const xi = this.im[i];
      const yr = this.re[j];
      const yi = this.im[j];
      this.re[i] = ar * xr - ai * xi + br * yr - bi * yi;
      this.im[i] = ar * xi + ai * xr + br * yi + bi * yr;
      this.re[j] = cr * xr - ci * xi + dr * yr - di * yi;
      this.im[j] = cr * xi + ci * xr + dr * yi + di * yr;
    }
  }

  private project(qubit: number, outcome: 0 | 1) {
    const bit = 1 << (this.n - 1 - qubit);
    let norm = 0;
    for (let i = 0; i < this.re.length; i++) {
      const on = (i & bit) !== 0;
      if (on !== (outcome === 1)) {
        this.re[i] = 0;
        this.im[i] = 0;
      } else {
        norm += this.re[i] * this.re[i] + this.im[i] * this.im[i];
      }
    }
    if (norm < 1e-15) {
      throw new Error(`测量结果 |${outcome}⟩ 的概率为 0，无法坍缩（检查线路）`);
    }
    const inv = 1 / Math.sqrt(norm);
    for (let i = 0; i < this.re.length; i++) {
      this.re[i] *= inv;
      this.im[i] *= inv;
    }
  }

  private applyPauliToCopy(pauli: string) {
    const re = Float64Array.from(this.re);
    const im = Float64Array.from(this.im);
    for (let q = 0; q < this.n; q++) {
      const p = pauli[q].toUpperCase();
      if (p === 'I') continue;
      const m = p === 'X' ? X : p === 'Y' ? Y : p === 'Z' ? Z : null;
      if (!m) throw new RangeError(`不认识的泡利算符 ${pauli[q]}`);
      applyToBuffer(m, [q], this.n, re, im);
    }
    return { re, im };
  }

  private assertQubit(q: number) {
    if (!Number.isInteger(q) || q < 0 || q >= this.n) {
      throw new RangeError(`比特编号 ${q} 越界（共 ${this.n} 个比特）`);
    }
  }
}

function applyToBuffer(m: Mat2, qubits: number[], n: number, re: Float64Array, im: Float64Array) {
  const target = qubits[qubits.length - 1];
  const bit = 1 << (n - 1 - target);
  let controlMask = 0;
  for (let k = 0; k < qubits.length - 1; k++) controlMask |= 1 << (n - 1 - qubits[k]);
  const [ar, ai, br, bi, cr, ci, dr, di] = m;
  for (let i = 0; i < re.length; i++) {
    if (i & bit) continue;
    if ((i & controlMask) !== controlMask) continue;
    const j = i | bit;
    const xr = re[i], xi = im[i], yr = re[j], yi = im[j];
    re[i] = ar * xr - ai * xi + br * yr - bi * yi;
    im[i] = ar * xi + ai * xr + br * yi + bi * yr;
    re[j] = cr * xr - ci * xi + dr * yr - di * yi;
    im[j] = cr * xi + ci * xr + dr * yi + di * yr;
  }
}

function range(n: number) {
  return Array.from({ length: n }, (_, i) => `q[${i}]`).join(',');
}

export function formatAngle(theta: number): string {
  const EPS = 1e-12;
  const ratio = theta / Math.PI;
  const nice = [
    [0, '0'], [1, 'pi'], [-1, '-pi'], [0.5, 'pi/2'], [-0.5, '-pi/2'],
    [0.25, 'pi/4'], [-0.25, '-pi/4'], [2, '2*pi'], [1.5, '3*pi/2'],
  ] as const;
  for (const [r, label] of nice) {
    if (Math.abs(ratio - r) < EPS) return label;
  }
  return ratio.toPrecision(6).replace(/\.?0+$/, '') + '*pi';
}

// ── 门矩阵 ────────────────────────────────────────────────────
export const ID: Mat2 = [1, 0, 0, 0, 0, 0, 1, 0];
export const X: Mat2 = [0, 0, 1, 0, 1, 0, 0, 0];
export const Y: Mat2 = [0, 0, 0, -1, 0, 1, 0, 0];
export const Z: Mat2 = [1, 0, 0, 0, 0, 0, -1, 0];
export const H: Mat2 = [Math.SQRT1_2, 0, Math.SQRT1_2, 0, Math.SQRT1_2, 0, -Math.SQRT1_2, 0];
export const S: Mat2 = [1, 0, 0, 0, 0, 0, 0, 1];
export const SDG: Mat2 = [1, 0, 0, 0, 0, 0, 0, -1];
export const T: Mat2 = [1, 0, 0, 0, 0, 0, Math.SQRT1_2, Math.SQRT1_2];
export const TDG: Mat2 = [1, 0, 0, 0, 0, 0, Math.SQRT1_2, -Math.SQRT1_2];

export function rx(theta: number): Mat2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [c, 0, 0, -s, 0, -s, c, 0];
}

export function ry(theta: number): Mat2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [c, 0, -s, 0, s, 0, c, 0];
}

export function rz(theta: number): Mat2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [c, -s, 0, 0, 0, 0, c, s];
}

export function phaseGate(theta: number): Mat2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [1, 0, 0, 0, 0, 0, c, s];
}

// ── 伪随机：固定种子让演示可复现 ─────────────────────────────
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
