# 项目记忆 - website-jrjrz 博客

## 项目概况
Astro + Decap CMS + Cloudflare Pages 博客。中文博客，单作者。
工作目录：`E:\个人\website-jrjrz`
实施计划：`blog-astro-decap-implementation-plan.md`（11 步，步骤 1-8 已完成）

## 技术栈
- Astro 7（static output，strict TS，Node 22）
- Content Collections：`glob` loader + `astro/zod`，文章在 `src/content/blog/*.md`
- Decap CMS：CDN 加载（`public/admin/index.html`），`config.yml` 配 github backend
- Cloudflare Pages Functions：`functions/api/auth.js` + `callback.js` 实现 GitHub OAuth（postMessage 协议）
- `public/_redirects`（/admin/* SPA fallback）+ `public/_headers`（安全头）

## 关键约定
- 文章 slug / 图片名用英文（避免工具链中文问题）
- `public/uploads/` 不 gitignore（Decap 上传图片落这里）
- `GITHUB_CLIENT_SECRET` 在 CF Pages 必须选 Secret 类型
- CF Pages 必须设 `NODE_VERSION=22`
- OAuth callback URL 必须 https 且与实际域名完全一致

## 待办（用户上线时）
- 替换 `public/admin/config.yml` 两处 TODO 占位（repo、base_url）
- 替换 `astro.config.mjs` 的 site 为正式域名
- git 身份从占位 "Blog Author" 改回用户自己的（`git config user.name/email` + 可选 `git commit --amend --reset-author`）
- 创建 GitHub OAuth App，callback URL = `https://<域名>/api/callback`
- CF Pages 环境变量：NODE_VERSION、GITHUB_CLIENT_ID、GITHUB_CLIENT_SECRET(Secret)
- 旧 HTML 迁移到 index/about（现为占位）

## 坑
- `npm create astro` 在非空目录会建到子目录，需手动移文件上来
- dev server 在沙箱内会被 safe-delete 拦截（vite 清 .vite/deps），需 dangerouslyDisableSandbox 或本地直接跑
