export const site = {
  name: '叠加学堂',
  latinName: 'Superposition Academy',
  tagline: '量子计算，从一块偏振片开始',
  description:
    '叠加学堂：面向中文读者的量子计算学习与科普站。不用装软件，每个概念都能在浏览器里跑一遍——布洛赫球、量子线路、Grover 搜索、BB84 窃听。60 节正文，从偏振片讲到量子纠错。',
  url: (import.meta.env.PUBLIC_SITE_URL as string | undefined) || 'https://superposition.academy',
  author: '叠加学堂编辑部',
  email: 'hi@superposition.academy',
  repo: 'https://github.com/superposition-academy/site',
  locale: 'zh-CN',
  startYear: 2026,
} as const;

export const routes = [
  {
    id: 'know',
    name: '只想搞懂',
    desc: '看得懂新闻，不被营销带着走',
    parts: ['p-start', 'p-intuition', 'p-qubit'],
    weeks: 2,
  },
  {
    id: 'exam',
    name: '考试与竞赛',
    desc: '会算、会读线路图、能上手写门',
    parts: ['p-start', 'p-intuition', 'p-math', 'p-qubit', 'p-entangle', 'p-algo'],
    weeks: 8,
  },
  {
    id: 'build',
    name: '动手做',
    desc: '自己搭线路，导出 QASM 上真机',
    parts: ['p-start', 'p-qubit', 'p-entangle', 'p-algo', 'p-lab'],
    weeks: 6,
  },
  {
    id: 'judge',
    name: '要判断力',
    desc: '识别夸大宣传，评估技术成熟度',
    parts: ['p-start', 'p-intuition', 'p-hw', 'p-app'],
    weeks: 4,
  },
] as const;

export type RouteId = (typeof routes)[number]['id'];
