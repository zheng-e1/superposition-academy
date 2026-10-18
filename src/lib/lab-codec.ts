/** 线路的序列化：把 {n, ops} 压成 URL 安全的短串，供分享链接使用。 */

export type LabGate = 'h' | 'x' | 'y' | 'z' | 's' | 't' | 'cx' | 'cz';

export interface LabOp {
  g: LabGate;
  q: number;
  t?: number;
}

export interface LabCircuit {
  n: number;
  ops: LabOp[];
}

const GATES: LabGate[] = ['h', 'x', 'y', 'z', 's', 't', 'cx', 'cz'];
const TWO_QUBIT: LabGate[] = ['cx', 'cz'];
const MAX_QUBITS = 8;
const MAX_OPS = 60;

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** 校验并规范化一份线路；任何越界或未知门都返回 null。 */
export function normalizeCircuit(input: unknown): LabCircuit | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as { n?: unknown; ops?: unknown };
  if (!isInt(raw.n) || raw.n < 1 || raw.n > MAX_QUBITS) return null;
  if (!Array.isArray(raw.ops) || raw.ops.length > MAX_OPS) return null;
  const n = raw.n;
  const ops: LabOp[] = [];
  for (const item of raw.ops) {
    if (!item || typeof item !== 'object') return null;
    const { g, q, t } = item as { g?: unknown; q?: unknown; t?: unknown };
    if (typeof g !== 'string' || !GATES.includes(g as LabGate)) return null;
    if (!isInt(q) || q < 0 || q >= n) return null;
    const gate = g as LabGate;
    if (TWO_QUBIT.includes(gate)) {
      if (!isInt(t) || t < 0 || t >= n || t === q) return null;
      ops.push({ g: gate, q, t });
    } else {
      ops.push({ g: gate, q });
    }
  }
  return { n, ops };
}

/** 紧凑编码：{"n":2,"ops":[["h",0],["cx",0,1]]} → base64url */
export function encodeCircuit(circuit: LabCircuit): string {
  const payload = {
    n: circuit.n,
    o: circuit.ops.map((op) => (op.t === undefined ? [op.g, op.q] : [op.g, op.q, op.t])),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

/** 解码；格式不对、越界或含未知门一律返回 null，不抛异常。 */
export function decodeCircuit(token: string): LabCircuit | null {
  if (!token || token.length > 2000) return null;
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json) as { n?: unknown; o?: unknown };
    if (!parsed || !Array.isArray(parsed.o)) return null;
    const ops = parsed.o.map((entry) => {
      if (!Array.isArray(entry)) return null;
      const [g, q, t] = entry as [unknown, unknown, unknown];
      return t === undefined ? { g, q } : { g, q, t };
    });
    if (ops.some((x) => x === null)) return null;
    return normalizeCircuit({ n: parsed.n, ops });
  } catch {
    return null;
  }
}

/** 从 location.hash 里取出 #c=… 的载荷 */
export function tokenFromHash(hash: string): string | null {
  const m = hash.match(/(?:^#|&)c=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** 在指定位置插入一个门；两比特门的目标位默认取下一行。 */
export function insertOp(circuit: LabCircuit, index: number, gate: LabGate, qubit: number): LabCircuit {
  const at = Math.max(0, Math.min(index, circuit.ops.length));
  const op: LabOp =
    TWO_QUBIT.includes(gate) && circuit.n > 1
      ? { g: gate, q: qubit, t: (qubit + 1) % circuit.n }
      : { g: gate, q: qubit };
  const ops = [...circuit.ops.slice(0, at), op, ...circuit.ops.slice(at)];
  return { n: circuit.n, ops };
}

export function removeOp(circuit: LabCircuit, index: number): LabCircuit {
  if (index < 0 || index >= circuit.ops.length) return circuit;
  const ops = [...circuit.ops.slice(0, index), ...circuit.ops.slice(index + 1)];
  return { n: circuit.n, ops };
}

export { MAX_QUBITS, MAX_OPS };
