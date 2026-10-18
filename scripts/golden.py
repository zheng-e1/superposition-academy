"""用手写的 numpy 状态向量模拟生成基准值，供 vitest 校验 qsim。

刻意不复用 qsim 的任何逻辑：这里按定义逐比特构造矩阵并作用，
如果两边同时写错同一个符号，测试就没有意义了。
"""
import json
import numpy as np

I2 = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)
S = np.array([[1, 0], [0, 1j]], dtype=complex)
T = np.array([[1, 0], [0, np.exp(1j * np.pi / 4)]], dtype=complex)


def rx(t):
    return np.array([[np.cos(t / 2), -1j * np.sin(t / 2)],
                     [-1j * np.sin(t / 2), np.cos(t / 2)]], dtype=complex)


def ry(t):
    return np.array([[np.cos(t / 2), -np.sin(t / 2)],
                     [np.sin(t / 2), np.cos(t / 2)]], dtype=complex)


def rz(t):
    return np.array([[np.exp(-1j * t / 2), 0],
                     [0, np.exp(1j * t / 2)]], dtype=complex)


def pg(t):
    return np.array([[1, 0], [0, np.exp(1j * t)]], dtype=complex)


GATES = {"x": X, "y": Y, "z": Z, "h": H, "s": S, "t": T,
         "rx": rx, "ry": ry, "rz": rz, "p": pg}


class Sim:
    def __init__(self, n):
        self.n = n
        self.psi = np.zeros(2 ** n, dtype=complex)
        self.psi[0] = 1.0

    def apply(self, m, qubits):
        """qubits 的最后一位是目标，前面是控制位（全 1 时生效）。比特 0 是最高位。"""
        target = qubits[-1]
        dim = 2 ** self.n
        out = np.zeros(dim, dtype=complex)
        tbit = 1 << (self.n - 1 - target)
        for i in range(dim):
            if i & tbit:
                continue
            j = i | tbit
            ctrl_ok = all((i >> (self.n - 1 - c)) & 1 for c in qubits[:-1])
            if not ctrl_ok:
                out[i] += self.psi[i]
                out[j] += self.psi[j]
                continue
            a, b = self.psi[i], self.psi[j]
            out[i] += m[0, 0] * a + m[0, 1] * b
            out[j] += m[1, 0] * a + m[1, 1] * b
        self.psi = out

    def gate(self, name, qubits, *args):
        m = GATES[name](*args) if callable(GATES[name]) else GATES[name]
        self.apply(m, qubits)

    def swap(self, a, b):
        out = np.zeros_like(self.psi)
        ba, bb = 1 << (self.n - 1 - a), 1 << (self.n - 1 - b)
        for i in range(2 ** self.n):
            a_on, b_on = bool(i & ba), bool(i & bb)
            j = i ^ ba ^ bb if a_on != b_on else i
            out[j] = self.psi[i]
        self.psi = out

    def probs(self):
        return [float(abs(x) ** 2) for x in self.psi]

    def amps(self):
        return [[float(x.real), float(x.imag)] for x in self.psi]


def bell():
    s = Sim(2)
    s.gate("h", [0])
    s.gate("x", [0, 1])
    return s


CASES = {}


def add(name, build, n):
    s = Sim(n)
    build(s)
    CASES[name] = {
        "n": n,
        "amps": s.amps(),
        "probs": s.probs(),
        "bloch": [bloch(s, q) for q in range(n)],
    }


def bloch(s, q):
    """约化密度矩阵只用「其余比特相同」的振幅对来算。"""
    n = s.n
    bit = 1 << (n - 1 - q)
    r00 = r11 = 0.0
    r01 = 0j
    for i in range(2 ** n):
        if i & bit:
            continue
        j = i | bit
        r00 += abs(s.psi[i]) ** 2
        r11 += abs(s.psi[j]) ** 2
        r01 += s.psi[i] * np.conj(s.psi[j])
    return [float(2 * r01.real), float(-2 * r01.imag), float(r00 - r11)]


add("h1", lambda s: s.gate("h", [0]), 1)
add("x1", lambda s: s.gate("x", [0]), 1)
add("bell", lambda s: (s.gate("h", [0]), s.gate("x", [0, 1])), 2)
add("plus_plus", lambda s: (s.gate("h", [0]), s.gate("h", [1])), 2)
add("t_after_h", lambda s: (s.gate("h", [0]), s.gate("t", [0])), 1)
add("ry60", lambda s: s.gate("ry", [0], np.pi / 3), 1)
add("ghz3", lambda s: (s.gate("h", [0]), s.gate("x", [0, 1]), s.gate("x", [1, 2])), 3)
add("grover2", lambda s: (
    s.gate("h", [0]), s.gate("h", [1]),
    s.gate("z", [0, 1]),                                  # 神谕：给 |11⟩ 加 -1
    s.gate("h", [0]), s.gate("h", [1]),                   # 扩散算子
    s.gate("x", [0]), s.gate("x", [1]),
    s.gate("z", [0, 1]),
    s.gate("x", [0]), s.gate("x", [1]),
    s.gate("h", [0]), s.gate("h", [1]),
), 2)
add("mixed2", lambda s: (
    s.gate("h", [0]),
    s.gate("rz", [1], 0.7),
    s.gate("x", [0, 1]),
    s.gate("ry", [0], 1.1),
    s.gate("p", [0, 1], 0.4),
), 2)
add("swap_test", lambda s: (
    s.gate("x", [0]), s.gate("h", [1]), s.swap(0, 1),
), 2)

with open("tests/golden.json", "w", encoding="utf-8") as f:
    json.dump(CASES, f, indent=1)

print("wrote", len(CASES), "cases")
for k, v in CASES.items():
    print(k, "probs=", [round(p, 4) for p in v["probs"]])
