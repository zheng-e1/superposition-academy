/** 课程结构：篇章 → 主题。课节本身来自 content/lessons 的 MDX frontmatter。 */

export interface TopicDef {
  id: string;
  title: string;
}

export interface PartDef {
  id: PartId;
  num: string;
  title: string;
  short: string;
  desc: string;
  topics: TopicDef[];
}

export type PartId =
  | 'p-start'
  | 'p-intuition'
  | 'p-math'
  | 'p-qubit'
  | 'p-entangle'
  | 'p-algo'
  | 'p-hw'
  | 'p-app'
  | 'p-lab'
  | 'p-sweet';

export const PARTS: PartDef[] = [
  {
    id: 'p-start',
    num: '00',
    title: '开始之前',
    short: '开篇',
    desc: '四条学习路线、一次素养自测、怎么学才真的过脑子，以及 2026 年该抱什么预期。先定位，再出发。',
    topics: [{ id: 't-start', title: '入门与定位' }],
  },
  {
    id: 'p-intuition',
    num: '01',
    title: '量子直觉',
    short: '直觉',
    desc: '不用公式，先用偏振片、双缝和测量把叠加、干涉、坍缩、纠缠跑一遍。这一篇的目标是让你不再觉得量子是玄学。',
    topics: [
      { id: 't-light', title: '光与偏振' },
      { id: 't-interfere', title: '干涉与测量' },
      { id: 't-odd', title: '三个反直觉事实' },
    ],
  },
  {
    id: 'p-math',
    num: '02',
    title: '数学最小必要',
    short: '数学',
    desc: '只讲量子计算真正会用到的部分：复数与相位、内积与酉矩阵、张量积与概率。每个概念都配一个能拖动的演示。',
    topics: [
      { id: 't-complex', title: '复数与相位' },
      { id: 't-linear', title: '向量与矩阵' },
      { id: 't-tensor', title: '张量积与概率' },
      { id: 't-density', title: '混态与密度矩阵' },
    ],
  },
  {
    id: 'p-qubit',
    num: '03',
    title: '单量子比特',
    short: '单比特',
    desc: '一个量子比特的全部状态是一颗球面上的点。学会读布洛赫球、用 H/X/Y/Z 门移动它、理解相对相位为什么重要。',
    topics: [
      { id: 't-state', title: '态与布洛赫球' },
      { id: 't-gates', title: '门与旋转' },
      { id: 't-measure', title: '测量与环境' },
    ],
  },
  {
    id: 'p-entangle',
    num: '04',
    title: '多比特与纠缠',
    short: '纠缠',
    desc: '两个比特不是两个一比特。CNOT 造出相关性，Bell 态让单独看是噪声、一起看是完美相关，隐形传态把态送走而不用寄粒子。',
    topics: [
      { id: 't-two', title: '两比特门' },
      { id: 't-bell', title: '纠缠态' },
      { id: 't-teleport', title: '传送与不可能定理' },
    ],
  },
  {
    id: 'p-algo',
    num: '05',
    title: '线路与算法',
    short: '算法',
    desc: '从读一张线路图开始，到 QFT、相位估计、Deutsch–Jozsa、Grover 与 Shor。每个算法都先问：它到底省了哪一步？',
    topics: [
      { id: 't-read', title: '读线路' },
      { id: 't-qft', title: 'QFT 与相位' },
      { id: 't-oracle', title: '神谕类算法' },
      { id: 't-search', title: '搜索与因数分解' },
      { id: 't-variational', title: '变分与近期算法' },
      { id: 't-complexity', title: '复杂度与边界' },
      { id: 't-linear-algo', title: '线性方程与矩阵算法' },
      { id: 't-simulation', title: '模拟与量子线性代数' },
    ],
  },
  {
    id: 'p-hw',
    num: '06',
    title: '硬件与工程',
    short: '硬件',
    desc: '超导、离子阱、中性原子、光子、拓扑五条技术路线；相干时间、保真度、量子体积这些指标到底在说什么；纠错为什么是生死线。',
    topics: [
      { id: 't-modality', title: '五条技术路线' },
      { id: 't-engineer', title: '工程指标' },
      { id: 't-ec', title: '量子纠错' },
    ],
  },
  {
    id: 'p-app',
    num: '07',
    title: '应用与生态',
    short: '应用',
    desc: '量子化学最可能先有用，密码学已经真受影响，量子机器学习则被吹得最过头。还有：什么时候你不该用量子。',
    topics: [
      { id: 't-chem', title: '科学与材料' },
      { id: 't-crypto', title: '密码与安全' },
      { id: 't-hype', title: '祛魅与判断' },
      { id: 't-tools', title: '工具与平台' },
      { id: 't-network', title: '量子网络' },
      { id: 't-sensing', title: '量子传感' },
    ],
  },
  {
    id: 'p-lab',
    num: '08',
    title: '量子实验室',
    short: '实验',
    desc: '不讲课，只给工具：自己搭线路、看逐步状态、导出 OpenQASM 拿去真机跑。',
    topics: [{ id: 't-lab', title: '动手' }],
  },
  {
    id: 'p-sweet',
    num: '09',
    title: '甜点',
    short: '甜点',
    desc: '正课之外的加餐：人物与历史、二十个常见误区、术语速查。适合碎片时间。',
    topics: [
      { id: 't-history', title: '人物与历史' },
      { id: 't-myth', title: '误区清单' },
      { id: 't-open', title: '开放问题' },
    ],
  },
];

export const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export const TAG_CLASS: Record<string, string> = {
  概念: 'pill-concept',
  交互: 'pill-interactive',
  动画: 'pill-anim',
  反例: 'pill-counter',
  深入: 'pill-deep',
  实战: 'pill-practice',
};
