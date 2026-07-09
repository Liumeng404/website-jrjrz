# 博客站点升级实施计划：Astro + Decap CMS + Cloudflare Pages

> 本文档是给 AI 编码 agent 执行用的任务清单。每个步骤末尾有「验收标准」，做完就检查一下再进入下一步，不要跳步。

## 背景与目标

把 Cloudflare Pages 上现有的纯 HTML 博客，升级为：
**Astro 静态生成 + GitHub 工作流 + Decap CMS 可视化后台写文章**。

工作目录：`E:\个人\website-jrjrz`（当前为空，从零初始化）。

## 已确认的决策

| 决策项 | 选择 |
|---|---|
| Git 托管 | GitHub |
| 博客语言 | 中文为主 |
| 作者数量 | 仅本人 |
| Decap CMS 认证 | **用 Cloudflare Pages Functions 实现 GitHub OAuth，一次做完整，不做临时无认证过渡** |
| 旧 HTML 处理 | 保留现有 HTML 内容/视觉，迁移进 Astro 页面 |
| OAuth 中转 | 不额外起 Cloudflare Worker / 子域名，用同域名下的 Pages Functions（`/api/auth`、`/api/callback`） |

## 最终架构

```
GitHub Repo
│
├── Astro 项目源码
│   ├── astro.config.mjs
│   ├── src/
│   │   ├── content.config.ts        # blog 集合 schema
│   │   ├── content/blog/            # Decap CMS 写入位置（.md）
│   │   ├── pages/
│   │   │   ├── index.astro          # 首页（保留旧 HTML 视觉）
│   │   │   ├── about.astro          # 关于页（保留旧 HTML）
│   │   │   └── blog/
│   │   │       ├── index.astro
│   │   │       └── [...slug].astro
│   │   └── layouts/
│   │       ├── BaseLayout.astro
│   │       └── BlogPost.astro
│   ├── functions/                   # Cloudflare Pages Functions（OAuth 中转）
│   │   └── api/
│   │       ├── auth.js              # 发起 GitHub OAuth
│   │       └── callback.js          # 接收回调，换取 token，回传给 Decap
│   └── public/
│       ├── admin/
│       │   ├── index.html
│       │   └── config.yml
│       ├── _redirects
│       ├── _headers
│       └── (旧静态资源)
│
└── Cloudflare Pages
    ├── Build command: npm run build
    ├── Output: dist
    ├── Node: 22
    └── 环境变量：GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET（加密）
```

写文章流程：作者访问 `你的域名/admin/` → 点击 GitHub 登录 → 走 `/api/auth` → GitHub 授权 → `/api/callback` 换 token → Decap CMS 界面可用 → 新建/编辑 Markdown → 提交 commit → CF Pages 自动构建部署。

---

## 步骤 1：初始化 Astro 项目

```bash
cd "E:\个人\website-jrjrz"
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git --skip-houston
npm install
```

**验收**：`npm run dev` 能启动，浏览器访问 `http://localhost:4321` 能看到 Astro 默认页面。

---

## 步骤 2：定义博客内容集合

创建 `src/content.config.ts`：

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { blog };
```

创建一篇示例文章 `src/content/blog/hello-world.md` 用于测试：

```md
---
title: "第一篇文章"
description: "测试用"
pubDate: 2026-07-09
draft: false
---

这是一篇测试文章，用来验证 Content Collections 跑通了。
```

**验收**：`astro check` 或 `astro build` 不报 schema 相关错误。

---

## 步骤 3：创建布局与页面

| 路径 | 作用 |
|---|---|
| `src/layouts/BaseLayout.astro` | 全站公共布局（head、导航、footer） |
| `src/layouts/BlogPost.astro` | 文章详情布局，套用 BaseLayout |
| `src/pages/index.astro` | 首页（暂用占位内容，步骤 4 再替换成旧 HTML） |
| `src/pages/about.astro` | 关于页（同上） |
| `src/pages/blog/index.astro` | 文章列表，按 `pubDate` 倒序 |
| `src/pages/blog/[...slug].astro` | 文章详情，用 `getStaticPaths` 生成 |

文章详情核心逻辑：

```astro
---
import { getCollection, render } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({ params: { slug: post.id }, props: { post } }));
}
const { post } = Astro.props;
const { Content } = await render(post);
---
<BlogPost frontmatter={post.data}><Content /></BlogPost>
```

**验收**：本地 `npm run dev`，`/blog` 能看到文章列表，点进去能看到步骤 2 那篇测试文章的详情页。

---

## 步骤 4：迁移现有 HTML

从 Cloudflare Pages 项目把现有 HTML 源码下载下来，手动迁移：

- 头部/导航/footer → `BaseLayout.astro`
- 首页内容 → `index.astro`
- 关于页 → `about.astro`
- 旧 CSS → `src/styles/global.css`，在 `BaseLayout.astro` 里 `<link>` 或 `<style>` 引入
- 旧图片等静态资源 → 放到 `public/` 下

**注意**：如果旧 HTML 里资源引用本来就是根相对路径（如 `/images/logo.png`），大概率可以原样搬进 `public/` 直接用，不用逐个改路径；只有引用了外部绝对路径或构建工具生成的 hash 路径时才需要调整。

**验收**：本地跑起来，首页/关于页视觉和旧站点基本一致。

---

## 步骤 5：配置 Decap CMS

创建 `public/admin/index.html`：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>内容管理</title>
  </head>
  <body>
    <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  </body>
</html>
```

（不需要 `npm install decap-cms-app`，用 CDN 脚本这一种方式即可，避免重复。）

创建 `public/admin/config.yml`：

```yaml
backend:
  name: github
  repo: <你的用户名>/<仓库名>      # 实施时填入
  branch: main
  base_url: https://<你的域名>     # 与站点同域名
  auth_endpoint: /api/auth         # 对应 functions/api/auth.js

media_folder: "public/uploads"
public_folder: "/uploads"

collections:
  - name: "blog"
    label: "博客文章"
    folder: "src/content/blog"
    create: true
    slug: "{{slug}}"
    extension: "md"
    format: "frontmatter"
    fields:
      - { name: "title", label: "标题", widget: "string" }
      - { name: "description", label: "描述", widget: "text" }
      - { name: "pubDate", label: "发布日期", widget: "datetime" }
      - { name: "updatedDate", label: "更新日期", widget: "datetime", required: false }
      - { name: "draft", label: "草稿", widget: "boolean", default: false }
      - { name: "body", label: "正文", widget: "markdown" }
```

**重要**：`config.yml` 是公开可访问的静态文件，**绝对不要**在里面写任何 client secret。secret 只能放在 Cloudflare Pages 的环境变量里，由步骤 7 的 Pages Function 读取。

---

## 步骤 6：SPA fallback + 安全头

`public/_redirects`：
```
/admin/*   /admin/index.html   200
```

`public/_headers`：
```
/admin/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## 步骤 7：实现 GitHub OAuth（Cloudflare Pages Functions）

创建 `functions/api/auth.js`：

```js
export async function onRequestGet(context) {
  const { env, request } = context;
  const redirectUri = new URL('/api/callback', request.url).toString();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('scope', 'repo,user');
  url.searchParams.set('redirect_uri', redirectUri);
  return Response.redirect(url.toString(), 302);
}
```

创建 `functions/api/callback.js`：

```js
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();

  const status = tokenData.error ? 'error' : 'success';
  const message =
    status === 'success'
      ? `authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' })}`
      : `authorization:github:error:${JSON.stringify(tokenData)}`;

  const html = `<!DOCTYPE html><html><body><script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage('${message}', e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
```

> 这段代码基于 Decap 的 `postMessage` 授权协议实现（popup 与 opener 之间通过 `authorizing:github` / `authorization:github:success:...` 消息通信）。如果实测登录后 Decap 界面没反应，对照官方文档 `https://decapcms.org/docs/external-oauth-clients/` 核对协议细节，可能需要微调消息格式。

**验收**：先不急着测，等步骤 9/10 环境变量和 GitHub OAuth App 配好后一起验证。

---

## 步骤 8：初始化 GitHub 仓库

```bash
git init
git add .
git commit -m "init: astro blog with decap cms"
gh repo create <repo-name> --public --source=. --remote=origin --push
```

（没装 `gh` CLI 就手动在 GitHub 建仓库，再 `git remote add origin ...` + `git push`。）

记得创建 `.gitignore`，包含 `node_modules`、`dist`、`.astro`。

---

## 步骤 9：创建 GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：

- Homepage URL: `https://<你的域名>`
- Authorization callback URL: `https://<你的域名>/api/callback`

创建后拿到 `Client ID` 和 `Client Secret`，留着下一步用。

---

## 步骤 10：连接 Cloudflare Pages

1. Cloudflare Dashboard → Pages → 当前项目（或新建）
2. Connect to Git → 选 GitHub → 选刚建的仓库
3. Build settings：
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: 留空
4. Settings → Environment variables，添加：
   - `NODE_VERSION` = `22`
   - `GITHUB_CLIENT_ID` = 步骤 9 拿到的 Client ID
   - `GITHUB_CLIENT_SECRET` = 步骤 9 拿到的 Client Secret（**类型选 Secret，加密存储**）
5. Save and Deploy

首次部署会有一个 `xxx.pages.dev` 临时域名；生产域名需要在 Custom domains 里添加并完成 DNS 验证。

**验收**：部署成功后访问 `https://<你的域名>/admin/`，点登录按钮，走完 GitHub 授权流程后能看到 Decap CMS 后台界面，能看到步骤 2 那篇测试文章，能新建一篇文章并成功 commit 到 GitHub。

---

## 步骤 11：本地开发流程（日常写作用）

```bash
npm run dev              # Astro dev server → http://localhost:4321
```

`/admin/` 在本地默认走线上的 OAuth 流程（因为 Pages Functions 部署在 Cloudflare 上），不需要额外起 `decap-server`。如果需要完全离线测试，可以另外配置 `local_backend: true`，但这不是必需项，先跳过。

---

## 关键文件清单

| 路径 | 用途 |
|---|---|
| `astro.config.mjs` | output: 'static'，site URL 配置 |
| `src/content.config.ts` | blog 集合 schema |
| `src/content/blog/*.md` | 博客文章 |
| `src/layouts/BaseLayout.astro` | 公共布局 |
| `src/layouts/BlogPost.astro` | 文章页布局 |
| `src/pages/index.astro` / `about.astro` | 首页 / 关于页 |
| `src/pages/blog/index.astro` / `[...slug].astro` | 文章列表 / 详情 |
| `public/admin/index.html` / `config.yml` | Decap CMS |
| `functions/api/auth.js` / `callback.js` | OAuth 中转 |
| `public/_redirects` / `_headers` | 路由与安全头 |
| `.gitignore` | 忽略构建产物 |

---

## 已知坑

1. **Content Collections 类型严格**：`src/content/blog/*.md` 的 frontmatter 必须严格符合 Zod schema，`config.yml` 里的字段类型要跟 schema 一一对应，否则 `astro build` 会失败。
2. **CF Pages Node 版本**：一定要设 `NODE_VERSION=22`（默认是 18，跑不动新版 Astro）。
3. **OAuth callback 必须用 https**：CF Pages 自定义域默认开 HTTPS，没问题；但注意 GitHub OAuth App 里的 callback URL 要跟 `functions/api/callback.js` 实际路径完全一致，一个字符对不上都会失败。
4. **`GITHUB_CLIENT_SECRET` 一定标记成 Secret 类型**，不要用普通环境变量（普通变量在 CF Dashboard 里明文可见）。
5. **中文文件名**：GitHub 支持中文路径，但建议文章 slug、图片名用英文，避免个别工具链处理中文文件名出问题。
6. **`public/uploads/`**：Decap 上传的图片会落到这里，记得别把它加进 `.gitignore`。

---

## 建议的执行顺序

1. 步骤 1-3：跑通 Astro 基础，本地能看到首页 + 一篇测试文章
2. 步骤 4：迁移旧 HTML，视觉对齐旧站点
3. 步骤 5-7：Decap CMS + OAuth 代码写完（此时还不能测，因为没部署）
4. 步骤 8-10：上线，GitHub OAuth App 配好，CF Pages 环境变量配好，端到端测试登录 + 发文章
5. 完成后可选：Giscus 评论、RSS、暗色主题、Pagefind 全文搜索、标签分类（不在本次计划内）
