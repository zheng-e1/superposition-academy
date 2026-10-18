export interface GlossaryEntry {
  id: string;
  term: string;
  en: string;
  def: string;
  part?: string;
}

/** 术语表：课节里用 <Term id="…"> 引用，构建期检查 id 是否存在。 */
export const GLOSSARY: GlossaryEntry[] = [
  { id: 'qubit', term: '量子比特', en: 'qubit', def: '量子信息的基本单位，状态是二维复希尔伯特空间里的单位向量，可写为 α|0⟩+β|1⟩。' },
  { id: 'superposition', term: '叠加', en: 'superposition', def: '态写成多个基态的复系数线性组合；系数是概率幅，不是"同时存在几个值"的清单。' },
  { id: 'amplitude', term: '概率幅', en: 'amplitude', def: '展开式中每个基态前的复数系数；模平方给出测量概率，相位在干涉中起作用。' },
  { id: 'phase', term: '相位', en: 'phase', def: '复数的辐角。全局相位不可观测，相对相位决定干涉结果。' },
  { id: 'measurement', term: '测量', en: 'measurement', def: '把态投影到测量基上，得到一个本征值，并按模平方的概率更新态。' },
  { id: 'collapse', term: '坍缩', en: 'collapse', def: '测量后态变为对应本征态（或投影后的归一化态）这一非酉过程的俗称。' },
  { id: 'interference', term: '干涉', en: 'interference', def: '多条路径的概率幅相加后再取模平方，因而出现增强与相消。' },
  { id: 'entanglement', term: '纠缠', en: 'entanglement', def: '多比特态不能写成各比特态张量积的性质；此时单比特没有纯态描述。' },
  { id: 'bell-state', term: 'Bell 态', en: 'Bell state', def: '两比特最大纠缠态的四个正交基，如 (|00⟩+|11⟩)/√2。' },
  { id: 'bloch-sphere', term: '布洛赫球', en: 'Bloch sphere', def: '单比特纯态与球面点一一对应，球内点对应混态；z 轴上下分别是 |0⟩ 与 |1⟩。' },
  { id: 'density-matrix', term: '密度矩阵', en: 'density matrix', def: '描述混态与子系统状态的工具 ρ=Σp|ψ⟩⟨ψ|；纯态满足 Tr(ρ²)=1。' },
  { id: 'purity', term: '纯度', en: 'purity', def: 'Tr(ρ²)，取值 1/2 到 1（单比特）；小于 1 说明该比特与外界或其他比特纠缠。' },
  { id: 'unitary', term: '酉矩阵', en: 'unitary', def: '满足 U†U=I 的矩阵。量子线路中的门都是酉的，因此演化可逆、保内积。' },
  { id: 'tensor-product', term: '张量积', en: 'tensor product', def: '把两个子系统合成一个系统的运算，维数相乘；两比特态空间是 4 维而不是 2+2。' },
  { id: 'hadamard', term: 'H 门', en: 'Hadamard gate', def: '把 |0⟩ 变成 |+⟩、|1⟩ 变成 |−⟩ 的单比特门，矩阵为 (1/√2)[[1,1],[1,−1]]。' },
  { id: 'pauli', term: '泡利矩阵', en: 'Pauli matrices', def: 'X、Y、Z 三个厄米酉矩阵，对应布洛赫球三个轴上的 180° 旋转。' },
  { id: 'cnot', term: 'CNOT', en: 'controlled-NOT', def: '控制位为 1 时翻转目标位的两比特门，是造纠缠的基本零件。' },
  { id: 'cphase', term: '受控相位门', en: 'controlled phase', def: '控制位为 1 时给目标位加相位 e^{iθ}；θ=π 时即 CZ。' },
  { id: 'universal-gate', term: '通用门集', en: 'universal gate set', def: '能逼近任意酉变换的有限门集合，如 {H, T, CNOT}。' },
  { id: 'decoherence', term: '退相干', en: 'decoherence', def: '系统与环境纠缠导致相位信息泄漏、干涉能力下降的过程，是当前量子计算的主要敌人。' },
  { id: 'coherence-time', term: '相干时间', en: 'coherence time', def: '量子态保持相位关系的时间尺度，常以 T₁（能量弛豫）与 T₂（相位弛豫）描述。' },
  { id: 'fidelity', term: '保真度', en: 'fidelity', def: '实际实现与理想操作（或理想态）的接近程度，常用随机基准测试给出单门保真度。' },
  { id: 'quantum-volume', term: '量子体积', en: 'quantum volume', def: '综合比特数、门保真度与连通性的一项基准指标，不能直接换算成"算力"。' },
  { id: 'no-cloning', term: '不可克隆定理', en: 'no-cloning theorem', def: '不存在能把任意未知量子态精确复制一份的酉操作，因此量子信息不能像文件一样拷贝。' },
  { id: 'teleportation', term: '量子隐形传态', en: 'quantum teleportation', def: '借一对纠缠态和两个经典比特，把一个未知量子态转移到远处，原态被销毁。' },
  { id: 'oracle', term: '神谕', en: 'oracle', def: '算法里被当作黑箱调用的酉操作，通常用来标记某个解或计算某个函数。' },
  { id: 'qft', term: '量子傅里叶变换', en: 'QFT', def: '在振幅上做离散傅里叶变换的线路，O(n²) 个门，是相位估计与 Shor 算法的核心。' },
  { id: 'phase-estimation', term: '相位估计', en: 'phase estimation', def: '估计酉算符本征值的相位，是 Shor、量子模拟等算法的公共子程序。' },
  { id: 'amplitude-amplification', term: '振幅放大', en: 'amplitude amplification', def: 'Grover 迭代的实质：把解的概率幅反复旋转放大，√N 次后以高概率测到解。' },
  { id: 'grover', term: 'Grover 算法', en: "Grover's algorithm", def: '无结构搜索，用 O(√N) 次神谕查询找到唯一解；不是"比经典快平方倍"的笼统说法，而是查询次数的平方根。' },
  { id: 'shor', term: 'Shor 算法', en: "Shor's algorithm", def: '用量子傅里叶变换做周期查找，从而在多项式时间内分解大整数，威胁 RSA 等公钥体系。' },
  { id: 'nisq', term: 'NISQ', en: 'NISQ', def: '含噪声中等规模量子（Noisy Intermediate-Scale Quantum）阶段，指当前几十到几千比特、无纠错的时代。' },
  { id: 'error-correction', term: '量子纠错', en: 'quantum error correction', def: '用多个物理比特编码一个逻辑比特，通过测量综合征发现并纠正错误而不破坏量子信息。' },
  { id: 'surface-code', term: '表面码', en: 'surface code', def: '一种高阈值、只需近邻耦合的纠错码，是超导路线的主流选择。' },
  { id: 'logical-qubit', term: '逻辑比特', en: 'logical qubit', def: '纠错编码后的比特，错误率随物理比特数指数下降；容错计算的基本单位。' },
  { id: 'threshold', term: '容错阈值', en: 'threshold', def: '物理错误率低于该值时，增加编码规模才能真正降低逻辑错误率。' },
  { id: 'transmon', term: '超导量子比特', en: 'transmon', def: '用约瑟夫森结构成的非谐振荡器，工作在毫开温度，用微波脉冲操控。' },
  { id: 'ion-trap', term: '离子阱', en: 'trapped ion', def: '用电磁场囚禁离子，以离子内部能级作比特，门保真度高但门速度较慢。' },
  { id: 'neutral-atom', term: '中性原子', en: 'neutral atom', def: '用光镊阵列排布原子，激发到里德堡态产生强相互作用，易于大规模并行。' },
  { id: 'photonic', term: '光子路线', en: 'photonic', def: '以光子偏振或路径编码比特，室温运行、易传输，但双比特门与损耗是难点。' },
  { id: 'topological', term: '拓扑量子比特', en: 'topological qubit', def: '用任意子的编织而非局部态编码信息，理论上对局部噪声免疫，尚在实验早期。' },
  { id: 'qkd', term: '量子密钥分发', en: 'QKD', def: '用物理原理而非计算复杂度保证密钥安全的分发方式；与"量子计算机破解密码"是两件事。' },
  { id: 'bb84', term: 'BB84', en: 'BB84', def: '1984 年 Bennett 与 Brassard 提出的四态 QKD 协议，窃听会引入可检测的误码率。' },
  { id: 'pqc', term: '后量子密码', en: 'post-quantum cryptography', def: '能在量子计算机面前保持安全的经典算法（如格密码），与量子计算是不同领域。' },
  { id: 'quantum-advantage', term: '量子优势', en: 'quantum advantage', def: '在某个明确任务上，量子设备超过已知最好的经典算法；不等同于全面超越。' },
  { id: 'hamiltonian', term: '哈密顿量', en: 'Hamiltonian', def: '决定系统能量与时间演化的厄米算符；量子模拟的目标就是实现给定的哈密顿量演化。' },
  { id: 'vqe', term: 'VQE', en: 'variational quantum eigensolver', def: '用参数化线路加经典优化器估计基态能量的混合算法，适合近期含噪设备。' },
  { id: 'qaoa', term: 'QAOA', en: 'quantum approximate optimization algorithm', def: '针对组合优化的变分线路，交替施加代价哈密顿量与混合哈密顿量。' },
  { id: 'shot', term: '采样次数', en: 'shots', def: '同一线路重复测量取统计的次数；概率估计误差按 1/√shots 下降。' },
];

export const GLOSSARY_BY_ID = new Map(GLOSSARY.map((g) => [g.id, g]));
