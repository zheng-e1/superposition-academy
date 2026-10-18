# 上线手册：从本地到公网

目标：不买域名，先拿到一个能访问的网址，之后每次 `git push` 自动更新。

推荐路线：**GitHub 仓库 → Cloudflare（Pages 或 Workers 静态资源）**。免费，国内可访问（速度一般），绑定自定义域名随时加。

> 2026 年的 Cloudflare 控制台把 Pages 的创建入口并进了 Workers：新建项目时只看到 “Configure your Worker project”、没有 “Build output directory” 字段，就走第 3.5 节的 **Workers 静态资源**，效果一样（免费、push 自动部署），只是网址是 `*.workers.dev`。

---

## 0. 前置

- 一个 GitHub 账号（你已有）
- 本机 Node.js 20+（当前是 24，够用）
- 仓库已经在本地初始化并提交（这一条我已经做完，见文末「本地状态」）

---

## 1. 在 GitHub 建一个空仓库

1. 打开 https://github.com/new
2. **Repository name** 填 `superposition-academy`（或你喜欢的名字）
3. 可见性选 **Private** 或 **Public**（Private 也能部署到 Cloudflare，免费额度一样）
4. **不要**勾选 “Add a README file”“Add .gitignore”“Choose a license”——本地已有文件，勾了会冲突
5. 点 **Create repository**

创建后页面会显示仓库地址，形如：

```
https://github.com/<你的用户名>/superposition-academy.git
```

---

## 2. 把本地代码推上去

在项目目录打开 PowerShell：

```powershell
cd D:\liangzikeou\quantum-site

# 把 <你的用户名> 换成实际的
git remote add origin https://github.com/<你的用户名>/superposition-academy.git
git branch -M main
git push -u origin main
```

第一次 push 会弹窗要求登录。三种方式任选：

| 方式 | 操作 |
|---|---|
| 浏览器登录（最省事） | Git for Windows 自带的 Credential Manager 会弹 GitHub 登录页，点授权即可 |
| Personal Access Token | GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → 勾 `repo` → 生成，粘贴到密码框（用户名填 GitHub 用户名） |
| SSH | 已有 SSH key 的话把 remote 换成 `git@github.com:<用户名>/<仓库>.git` |

推送成功后刷新 GitHub 页面，应该能看到 `src/`、`public/`、`package.json` 等文件。

> 之后每次改完内容：
> ```powershell
> git add -A
> git commit -m "写清楚改了什么"
> git push
> ```

---

## 3. 在 Cloudflare Pages 建项目

1. 打开 https://dash.cloudflare.com/ 并注册/登录（不用先买域名，免费账号即可）
2. 左侧 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权 GitHub，选中刚建的仓库 → **Begin setup**
4. 构建配置填：

| 字段 | 值 |
|---|---|
| Project name | `superposition-academy`（决定默认网址 `<name>.pages.dev`） |
| Production branch | `main` |
| Framework preset | `Astro`（没有就选 `None`） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空 |

5. 展开 **Environment variables**，添加：

```
PUBLIC_SITE_URL = https://<project-name>.pages.dev
```

（把 `<project-name>` 换成第 4 行填的名字。这个变量决定 canonical、sitemap、RSS、分享链接里的域名。）

6. 点 **Save and Deploy**，等 1–3 分钟。

首次构建会做三件事：`astro build` 生成静态页 → `pagefind` 建全文索引 → 上传 `dist`。日志里能看到 `68 page(s) built` 和 `Indexed ... pages`。

---

## 3.5 Workers 静态资源（控制台只有 Workers 时走这里）

如果创建页只显示 “Configure your **Worker** project”、没有 **Build output directory**，说明 Pages 入口已被并入 Workers。仓库里已经放了 `wrangler.jsonc`，它把 `./dist` 声明成静态资源，不需要你写任何 Worker 代码。

| 字段 | 值 |
|---|---|
| Repository | `<你的用户名>/superposition-academy` |
| Project name | `superposition-academy` |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy`（默认值，保留） |
| Preview command | 建议把 **Enable Preview builds** 关掉（默认的 `npx wrangler preview` 已不是有效命令） |
| Root directory | 留空 |

环境变量（在 **Advanced settings** 里）加一条：

```
PUBLIC_SITE_URL = https://superposition-academy.<你的 workers.dev 子域>.workers.dev
```

不知道子域就**先不填**：部署完成后控制台会显示实际网址，把它填进变量，再点 **Retry deployment**（或随便 push 一次）触发重建。canonical、sitemap 会在那次构建后指向正确域名。

本地等价命令（不想走 Git 集成时）：

```powershell
npm run build
npx wrangler login
npm run deploy
```

---

## 4. 验收清单

部署完成后打开 `https://<project-name>.pages.dev`，逐条检查：

- [ ] 首页布洛赫球能拖动，X/Y/Z 按钮有效
- [ ] `/learn` 显示 60 节，点进去能读
- [ ] 某节课里的演示能加载（偏振片、线路实验室）
- [ ] `/lab` 能插门、删除、单步；点「复制分享链接」得到的 URL 打开后线路一致
- [ ] `/exam` 抽 10 题能作答、判分
- [ ] 搜索框输入「Grover」有结果（这是 Pagefind 全文版，比本地 dev 强）
- [ ] 查看网页源代码，`<link rel="canonical">` 是你的 `pages.dev` 域名，不是 `superposition.academy`
- [ ] 访问 `/sitemap-index.xml`、`/robots.txt`、`/rss.xml` 都正常
- [ ] 手机打开，侧栏能收成抽屉（宽度 < 900px）

任何一条不对，先看 Cloudflare 的构建日志，再看本文最后一节。

---

## 5. 以后想绑自己的域名

1. 买域名（`.com` 约 ¥60–90/年；国内注册商需实名）
2. Cloudflare Pages 项目 → **Custom domains** → **Set up a custom domain** → 输入域名
3. 按提示在域名注册商处改 NS 到 Cloudflare，或在 DNS 里加 CNAME 指向 `<project>.pages.dev`
4. 生效后把环境变量 `PUBLIC_SITE_URL` 改成 `https://你的域名`，**重新部署一次**（Deployments → Retry deployment），否则 canonical 还是旧域名
5. 想同时保留 `pages.dev` 访问也可以，Canonical 只认一个，建议 301 到主域名

> 国内访问与备案：Cloudflare 全球节点免备案，国内延迟通常 100–300 ms。若要国内高速，需要 ICP 备案 + 国内对象存储/CDN，同一份 `dist` 可以双线部署；备案以个人名义约 2–4 周。

---

## 6. 备选平台

| 平台 | 构建命令 | 输出目录 | 备注 |
|---|---|---|---|
| Vercel | `npm run build` | `dist` | 免费额度够用，国内访问一般 |
| Netlify | `npm run build` | `dist` | 配置同上，支持 `_headers` |
| GitHub Pages | `npm run build` | `dist` | **需要额外设置**：项目页在子路径下，要在 `astro.config.mjs` 里加 `base: '/<repo>/'`，不如前两个省事 |

---

## 7. 常见问题

**构建失败：`pagefind: not found`**
`pagefind` 在 devDependencies 里，Cloudflare 默认会装；若用了 `npm install --omit=dev`，改成 `npm ci`。

**构建失败：Node 版本太低**
Cloudflare 项目 → Settings → Environment variables 加 `NODE_VERSION = 22`，重新部署。

**页面能开但样式全丢**
检查 Build output directory 是否填了 `dist`（不是 `dist/` 以外的目录）。

**canonical / sitemap 还是 `superposition.academy`**
`PUBLIC_SITE_URL` 没设，或设了但没重新部署。改完变量必须 Retry deployment。

**搜索没结果**
Pagefind 索引只在 `npm run build` 后生成；确认构建日志里有 `Indexed ... pages`，且访问 `/pagefind/pagefind-entry.json` 不是 404。

**分享链接打开是空的**
线路编码在 `#c=` 后面，部分聊天软件会截断长链接；链接不超过 2 KB 时浏览器能正常还原。

---

## 本地状态

- 仓库已在 `D:\liangzikeou\quantum-site` 初始化并完成首次提交（分支 `main`）
- `.gitignore` 已排除 `node_modules/`、`dist/`、`.astro/`、截图与临时目录
- CI 在 `.github/workflows/ci.yml`：每次 push 跑测试 + 内容闸门 + 构建
- 站点域名由 `PUBLIC_SITE_URL` 控制；本地不设也能跑（回退到占位域名）
