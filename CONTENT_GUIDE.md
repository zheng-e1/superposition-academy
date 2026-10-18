# 内容规范（CONTENT_GUIDE）

这份文档是「叠加学堂」所有课节的写作与格式约定。新增一节前先读一遍，再照着 `src/content/lessons/01-intuition/01-polarizer.mdx` 写。

## 一、一节课的形状

每节只服务**一条主张**（frontmatter 里的 `thesis`），结构固定：

1. **开场**：2–4 句，从一个具体现象或反直觉事实切入。不要「自古以来」「随着科技发展」。
2. `## 小节 1`：把现象讲清楚，给出关键对比或数字。
3. **演示**（如果有）：`<Demo kind="…" caption="…" />`，前后各有一句话引导。
4. `## 小节 2`：机制解释。允许一个公式，最多两个。公式必须服务于理解，不做推导。
5. **常见误解**：`<Misconception>`，一条「错」+ 一条「对」+ 一句说明差在哪。
6. **一句话结论**：`<Conclusion>` 包裹，2–3 句。
7. 自测 3–4 题（frontmatter 里写）。

正文字数 **500–750 字**（不含公式、题目、来源）。宁可短，不要凑。

## 二、语气与禁忌

- 用「你」，不用「同学们」「大家」。像一个人给另一个人讲，不用「让我们……」「接下来我们将……」。
- 每个概念只用一个比喻，并且要说明它在哪失效。
- 不写「众所周知」「显然」「毋庸置疑」「不难发现」。
- 不吹不黑：涉及量子优势、产业进展，必须写清适用条件。禁止「秒杀经典计算机」「彻底颠覆」。
- 不编数字。要写数字就写「量级」，或者给出能对上的标准来源。
- 「量子」不能当形容词乱用（量子水、量子鞋垫一律不写）。
- 中文标点：句子用「」，引号内不再嵌套英文引号；数字与英文之间加空格（`3 个比特`、`Grover 算法`）。

## 三、Frontmatter（严格遵守 schema）

```yaml
---
slug: double-slit            # 小写 + 连字符，全站唯一
title: 双缝：一个光子自己和自己干涉
thesis: 单光子也干涉，但它一次只落一个点
part: p-intuition            # 只能是 p-start p-intuition p-math p-qubit p-entangle p-algo p-hw p-app p-lab p-sweet
topic: t-interfere           # 必须属于该篇章的主题 id
tag: 动画                     # 概念 | 交互 | 动画 | 反例 | 深入 | 实战
minutes: 6
order: 111                   # 上课程序号，见分配表
demos: ['interference']      # 与正文里的 <Demo kind> 一致
quiz:
  - q: 题干
    options: ['A', 'B', 'C', 'D']   # 必须正好 4 个
    answer: 1                        # 正确项下标 0–3
    explain: 解析，2 句以上，说清为什么错项错
  - …
sources:
  - 'Nielsen & Chuang, 2010, Quantum Computation and Quantum Information, §1.2'
  - 'Feynman, 1985, QED, 第 1 讲'
---
```

`quiz` 至少 2 题，建议 3 题；`sources` 至少 1 条。

## 四、组件

每节开头（frontmatter 之后）按需 import，路径固定为三层上跳：

```mdx
import Demo from '../../../components/Demo.astro';
import Callout from '../../../components/Callout.astro';
import Misconception from '../../../components/Misconception.astro';
import Conclusion from '../../../components/Conclusion.astro';
import Term from '../../../components/Term.astro';
```

- `<Demo kind="…" caption="…" />`：kind 只能取 `polarizer amplitude interference bloch circuit grover bell bb84 bitflip noise hardware`。两比特振幅图用 `<Demo kind="amplitude" props={{ qubits: 2 }} caption="…" />`。
- `<Callout title="…" tone="phase|warn|teal">…</Callout>`：强调块，一节最多一个。
- `<Misconception note="…"><Fragment slot="wrong">…</Fragment><Fragment slot="right">…</Fragment></Misconception>`：一节最多一个。
- `<Term id="…">显示文字</Term>`：术语。id 必须来自 `src/data/glossary.ts`（可先读该文件确认）。
- 公式用 `$…$`（行内）或 `$$…$$`（独立），KaTeX 已配好。不要写 HTML。

## 五、事实与来源

- 只引标准、可核对的来源：Nielsen & Chuang（章节号）、Feynman《QED》、Preskill 讲义、原始论文（作者+年份+标题）、IBM/Qiskit 官方文档、NIST 后量子密码标准。
- **不要编造页码、卷号、DOI、具体实验数值。**
- 涉及「目前进展」的句子，写成「截至 2026 年，公开报道的量级是……」并且不给出单一厂商的排名。
- 每条数值断言都要能追到 `sources` 里的一条。

## 六、自测题

- 考理解，不考记忆。题干给一个具体场景，让读者判断。
- 四个选项都要像真的，错误项要是常见误解，不能一眼假。
- 解析必须说明「为什么对」和「为什么其他项不对」，至少 2 句。
- `answer` 下标务必数对（0 开始）。

## 七、检查清单（交稿前逐条过）

- [ ] 字数 500–750
- [ ] 有且只有一条主张，`thesis` ≤ 40 字
- [ ] 演示 kind 在允许列表里，且 `demos` 与正文一致
- [ ] 至少一个 `<Misconception>` 和一个 `<Conclusion>`
- [ ] 3 道题的 `answer` 与 `explain` 对得上
- [ ] 所有 `<Term id>` 都在 glossary 里
- [ ] 没有未定义组件、没有 HTML、没有图片
- [ ] `order` 与分配表一致，`slug` 未重复
