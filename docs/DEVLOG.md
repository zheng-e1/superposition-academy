# 开发日志（DEVLOG）

> 用途：这是项目的「外部记忆」。任何人（包括下一次会话里的 AI）读完这一份，就能在不翻聊天记录的情况下接着干。
> 最后更新：2026-10-18 22:25

## 1. 一句话状态

「叠加学堂」是一个纯静态的中文量子计算学习站：80 节正文、241 道自测题、11 个浏览器内交互演示，Astro 7 构建，部署在 Cloudflare Workers 静态资源上，push 即自动发布。域名 `diejiacademy.com` 已购买，等待实名/注册审核。

- 线上：`https://superposition-academy.481828896.workers.dev`（国内直连需代理）
- 仓库：`github.com/zheng-e1/superposition-academy`（分支 `main`）
- 本地：`D:\liangzikeou\quantum-site`

## 2. 时间线（2026-10-18 一天内完成）

| 时间 | 阶段 | 产出 |
|---|---|---|
| 17:35 | 方案 | `D:\liangzikeou\量子计算学习站-开发方案.md`（对标拆解、大纲、技术栈、排期） |
| 17:44 | 脚手架 | Astro 7 + MDX + KaTeX；内容集合 schema；`qsim` 引擎与 numpy 基准（28 测试） |
| 17:50 | 垂直切片 | 设计令牌、`LessonLayout` 十段式、首节《偏振片》跑通 |
| 17:56 | 演示与页面 | 11 个演示组件、门户/目录/路线/实验室/自测/术语/关于 |
| 17:57 | 内容 39 节 | 6 个子 agent 并行写作 + 内容闸门 |
| 19:02 | 内容 60 节 | 第二批 21 节（CHSH、QFT、相位估计、BQP、表面码……） |
| 19:07 | 两轮审校 | 45 条问题，修掉 Bell 关联公式、偏振片口径、纠错演示 bug 等 |
| 19:16 | 实验室深化 | 插门/删除/分享链接、2–4 比特、编码层 13 项测试 |
| 20:23 | 首次提交 | `f1f4640`，GitHub 推送（SSH over 443） |
| 21:36 | 部署适配 | Workers 静态资源 `wrangler.jsonc`，push 自动部署 |
| 22:22 | 域名准备 | `set-domain.ps1`、等待期手册 `docs/DEPLOY.md` |
| 22:35 | 内容 80 节 | 第三批 20 节（中性原子、光子、拓扑、HHL、玻色采样、QKD 设备、量子互联网……） |
| 22:56 | 第三轮审校 | 一致性核对 80 节；修 BB84 假阴性、排序方向、结论绝对化等 20 处 |

## 3. 关键决策（及为什么）

| 决策 | 理由 | 放弃的方案 |
|---|---|---|
| Astro 7 静态输出 + MDX | 默认零 JS、岛屿化演示、构建期 zod 校验 | Next/VitePress（重、或交互弱） |
| 自研 `qsim` 而非引第三方 | 15KB 级、API 可按教学需要裁剪；可导出 QASM | qiskit.js（体积大）、纯公式讲解（不可交互） |
| 演示用原生 TS，不上 React | 每个组件独立懒加载，无框架运行时 | React/Svelte 岛（体积与心智负担） |
| 一节 = 一条主张 + 一个演示 + 三道题 | 对齐参照站的节奏，也是内容闸门能机械校验的前提 | 长文教程（难维护、难校验） |
| 无账号体系 | 避免登录/后端拖住内容；进度存 localStorage | Supabase 登录（V1 不需要） |
| 品牌「叠加学堂」保留 | 学堂感 + superposition 双关；靠标题与眉标补「量子计算」品类词 | 量子夜校 / 量子小课（更直白但更普通） |
| canonical 由 `PUBLIC_SITE_URL` 控制 | 换域名只改环境变量或两处回退值 | 写死域名（换域名要全局搜替换） |
| Cloudflare Workers 静态资源 | 账号被灰度到 Workers 流程，Pages 入口不可见 | Pages（账号没有入口）、Vercel（未试） |
| SSH over 443 推送 | 本机 `github.com:443` TLS 被阻断，`ssh.github.com:443` 可通 | HTTPS（超时）、ghproxy（只读，不能 push） |

## 4. 架构地图

```
src/
├─ content/lessons/        60 个 MDX（10 个篇章目录）
├─ data/course.ts          篇章→主题定义（lesson 的 part/topic 必须命中）
├─ data/glossary.ts        49 条术语（<Term id> 引用）
├─ lib/qsim/               状态向量引擎（Circuit/gates/bloch/sample/QASM）
├─ lib/lab-codec.ts        线路序列化（分享链接、插入/删除，13 测试）
├─ lib/course.ts           加载、排序、上下节、篇章聚合
├─ lib/math.ts            服务端 KaTeX 渲染（自测题里的公式）
├─ layouts/                BaseLayout（SEO/主题）、LessonLayout（十段式）
├─ components/             Demo/Quiz/Sidebar/Callout/Misconception/Conclusion/Term
├─ scripts/demos/          11 个演示 + kit + loader
├─ scripts/                theme/search/sidebar/progress/quiz/exam
├─ styles/                 tokens/base/reader/demo/portal
└─ pages/                  首页、learn/[slug]、lab、exam、glossary、roadmap、about、404
```

工程脚本：`check-content.mjs`（内容闸门）、`fix-frontmatter.mjs`（YAML 引号修复）、`set-domain.ps1`（换域名）、`make_assets.py`（OG/favicon）、`golden.py`（numpy 基准）。

## 5. 质量保障

- **引擎**：41 项 Vitest，其中 10 组线路与手写 numpy 参照逐振幅比对（容差 1e-9）。
- **内容闸门**：字数 350–900、thesis ≤40 字、≥2 题/4 选项/解析 ≥20 字、≥1 来源、演示与正文一致、术语 id 存在、禁词、slug/order 唯一。
- **构建期**：死链检查（脚本临时跑）、sitemap、RSS、robots、JSON-LD。
- **两轮 AI 审校**：39 节 + 21 节各一轮，共 45 条问题，已修严重/中等项。

## 6. 已知问题与技术债

| 级别 | 问题 | 位置 |
|---|---|---|
| 高 | 内容无外部物理审读，Shor/VQE/纠错三节建议请人通读 | `src/content/lessons/05-algo`、`06-hw` |
| 高 | 国内直连 `workers.dev` 不通，等域名审核 | 部署层 |
| 中 | Pagefind 对中文不分词，搜索主要靠标题/摘要 JSON 回退 | `scripts/site.ts` |
| 中 | 演示的点击/拖拽没有自动化测试，只有渲染与恢复验证 | `src/scripts/demos` |
| ~~中~~ | ~~移动端触控目标偏小~~ 已修：滑块 24px 拇指、chip 40px、线路图门命中区 +11px、抽屉自动定位当前课节 | `28f637e` |
| 低 | 无 i18n、无 PWA、无云同步进度 | — |
| 低 | PowerShell 5.1 会把无 BOM 的 UTF-8 `.ps1` 当 ANSI，脚本必须纯 ASCII | `scripts/*.ps1` |
| 低 | dev server 运行时改大文件偶发 `EIO` 文件锁，先停服务再改 | 开发流程 |

## 7. 下一步队列

1. **域名上线**（审核通过后）：Cloudflare Connect a domain → 改 NS → Active → `npm run set-domain -- -Domain diejiacademy.com` → Worker Add custom domain → 验证证书/canonical/robots。
2. **外部物理审读**：三轮 AI 审校已完成（45 条 + 18 条 + 20 条），仍缺真人复核；建议优先通读 Shor、VQE、表面码、HHL 四节。
3. **移动端打磨**：触控目标 ≥44px、布洛赫球手势、抽屉滚动。
4. **内容再扩**（可选）：100 节以上时补「量子控制」「低温工程」「评测方法」等工程细节；先把现有 80 节的完成度做满。

## 8. 如何恢复工作

```powershell
cd D:\liangzikeou\quantum-site
npm install          # 已装过可跳过
npm run dev          # http://127.0.0.1:4321
npm test             # 41 项
npm run check:content
npm run build        # 生成 dist + Pagefind
```

推送（SSH 已配好，`~/.ssh/config` 把 github.com 指向 ssh.github.com:443）：

```powershell
git add -A
git commit -m "改了什么"
git push             # 触发 Cloudflare 自动构建
```

给下一次会话的提示词可以直接写：

> 先读 `docs/DEVLOG.md`、`docs/DEPLOY.md`、`CONTENT_GUIDE.md`，再继续。

## 9. 变更记录

| 提交 | 内容 |
|---|---|
| `f1f4640` | 初始提交：60 节、qsim、演示、页面、测试 |
| `dd3279c` | 部署辅助脚本与 DEPLOY 手册 |
| `1895c2f` | push 脚本改纯 ASCII（兼容 PS 5.1） |
| `6b5e0d2` | Workers 静态资源配置（wrangler.jsonc） |
| `4f992db` | canonical 指向 workers.dev |
| `da7c1ae` | 记录线上地址与自动部署状态 |
| `0e70f0a` | 标题与眉标强化「量子计算」品类词 |
| `112ee71` | 域名切换脚本与等待期手册 |
| `c9a2a9b` | 新增开发日志 DEVLOG |
| `1177fa5` | 状态自检脚本、方案文档入库、连续性约定 |
| `ffd885a` | 内容扩到 80 节 + 新内容审校修复 |
| `v0.1.0` | 第一个可用版本的 Git tag（60 节上线当天） |
| `v0.2.0` | 80 节版本 tag |
| `53208b2` | DEVLOG 记录移动端打磨 |
| `a7d7108` | 第三轮审校收尾：BB84 累计统计、排序方向、结论绝对化、TeX 包装等 20 处 |
| `28f637e` | 移动端打磨：触控、滑块、线路图命中区、抽屉定位 |

## 10. 项目外部的资料

- 方案文档：仓库内 `docs/PLAN.md`（原文件在 `D:\liangzikeou\量子计算学习站-开发方案.md`）
- 参照站抓取：`D:\liangzikeou\_reference\`（小山学堂的 course-data、learn.html、lesson.css 等）
- 域名：`diejiacademy.com`（阿里云，审核中）
- Cloudflare：账号 `481828896`，Worker `superposition-academy`，子域 `481828896.workers.dev`

## 11. 连续性约定（每次改动都照做）

为了避免「开发只活在聊天记录里」，每次改动按这个顺序收尾：

1. `npm run check:content && npm test`（内容与引擎都不能退化）
2. `npm run build`（确保能构建）
3. `git commit` + `git push`（push 会自动部署）
4. 在本文第 9 节追加一行变更记录；涉及决策的，补进第 3 节
5. 遇到新坑，写进第 6 节「已知问题」

状态自检（新会话/换机器时先跑这个）：

```powershell
npm run status
```

它一次性输出：分支、最后一次提交、工作区是否干净、课节数、题目数、构建产物与搜索索引状态。tag `v0.1.0` 是第一个可用版本的检查点，出问题可以 `git checkout v0.1.0` 对照。

