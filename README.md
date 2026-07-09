# 我的博客

基于 **Astro + Decap CMS + Cloudflare Pages** 的静态博客。前台用 Astro 静态生成，后台用 Decap CMS 可视化写文章，部署在 Cloudflare Pages 上。

## 本地开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 → http://localhost:4321
npm run build    # 构建到 ./dist/
npm run preview  # 本地预览构建产物
```

## 目录结构

```text
├── astro.config.mjs          # output: static + site 配置
├── src/
│   ├── content.config.ts      # blog 集合 schema（zod）
│   ├── content/blog/*.md      # 博客文章（Decap CMS 写入位置）
│   ├── pages/
│   │   ├── index.astro        # 首页
│   │   ├── about.astro        # 关于页
│   │   └── blog/
│   │       ├── index.astro   # 文章列表
│   │       └── [...slug].astro# 文章详情
│   ├── layouts/
│   │   ├── BaseLayout.astro  # 全站公共布局
│   │   └── BlogPost.astro     # 文章详情布局
│   └── styles/global.css      # 全局样式
├── functions/api/             # Cloudflare Pages Functions（OAuth 中转）
│   ├── auth.js                # 发起 GitHub 授权
│   └── callback.js            # 换 token + postMessage 回传 Decap
└── public/
    ├── admin/
    │   ├── index.html          # Decap CMS 入口
    │   └── config.yml          # Decap 配置（⚠️ 不要写 secret）
    ├── _redirects              # /admin/* SPA fallback
    ├── _headers                # 安全头
    └── uploads/                # Decap 上传的图片（不要 gitignore）
```

## 上线步骤

下面的步骤需要你在浏览器里操作，本地代码已经全部就绪。

### 1. 创建 GitHub 仓库并推送

```bash
# 如果装了 gh CLI：
gh repo create <repo-name> --public --source=. --remote=origin --push

# 否则手动在 GitHub 建仓库后：
git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

### 2. 创建 GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：

- **Homepage URL**：`https://<你的域名>`
- **Authorization callback URL**：`https://<你的域名>/api/callback`

创建后拿到 **Client ID** 和 **Client Secret**，下一步用。

### 3. 替换 config.yml 里的占位符

打开 `public/admin/config.yml`，把两处 `TODO` 改掉：

```yaml
backend:
  repo: <你的用户名>/<你的仓库名>     # ← 改成实际仓库
  base_url: https://<你的域名>        # ← 改成实际域名
```

同时改 `astro.config.mjs` 里的 `site: 'https://example.com'` 为你的正式域名。

改完 commit 推送。

### 4. 连接 Cloudflare Pages

Cloudflare Dashboard → Pages → Create a project → Connect to Git → 选刚才的 GitHub 仓库。

Build settings：

| 项 | 值 |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | （留空） |

Settings → Environment variables，添加：

| 变量名 | 值 | 说明 |
|---|---|---|
| `NODE_VERSION` | `22` | 必须设，默认 18 跑不动新版 Astro |
| `GITHUB_CLIENT_ID` | OAuth App Client ID | 普通变量即可 |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret | **类型必须选 Secret（加密）** |

点 Save and Deploy。

### 5. 配置自定义域名（可选但推荐）

Pages 项目 → Custom domains → 添加你的域名，按提示完成 DNS 验证。临时域名是 `xxx.pages.dev`。

注意：GitHub OAuth App 里的 callback URL 域名必须和实际访问域名一致，否则登录失败。

### 6. 端到端验证

部署成功后访问 `https://<你的域名>/admin/`：

1. 点登录按钮 → 跳转 GitHub 授权
2. 授权后回到 Decap CMS 后台
3. 能看到「第一篇文章」测试文章
4. 新建一篇文章 → 保存 → GitHub 仓库出现新 commit
5. Cloudflare Pages 自动触发构建 → 文章上线

## 日常写作

后台地址：`https://<你的域名>/admin/`

本地开发：`npm run dev` → http://localhost:4321

`/admin/` 在本地默认走线上的 OAuth（Pages Functions 部署在 Cloudflare 上），无需另起 `decap-server`。

## 已知坑

1. **CF Pages Node 版本**：必须设 `NODE_VERSION=22`，否则构建失败。
2. **OAuth callback URL**：必须和 `functions/api/callback.js` 实际路径完全一致（`https://<域名>/api/callback`）。
3. **`GITHUB_CLIENT_SECRET`**：必须标记为 Secret 类型，不要用普通环境变量（普通变量在 Dashboard 明文可见）。
4. **frontmatter 严格校验**：`src/content/blog/*.md` 的字段必须符合 `content.config.ts` 的 zod schema，`config.yml` 里的字段也要对应，否则 `astro build` 失败。
5. **中文文件名**：建议文章 slug 和图片名用英文，避免工具链问题。
6. **`public/uploads/`**：Decap 上传的图片落在这里，别加进 `.gitignore`。
7. **postMessage 协议**：如果登录后 Decap 界面没反应，对照 https://decapcms.org/docs/external-oauth-clients/ 核对消息格式。

## 待办（旧站点迁移）

首页和关于页目前是占位内容。后续把旧 Cloudflare Pages 站点的 HTML/CSS/图片迁移过来：

- 头部/导航/footer → `BaseLayout.astro`
- 首页内容 → `index.astro`
- 关于页 → `about.astro`
- 旧 CSS → `src/styles/global.css`
- 旧图片等静态资源 → `public/`
