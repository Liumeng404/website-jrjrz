// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 静态站点生成，部署到 Cloudflare Pages
  output: 'static',
  // TODO(上线前替换): 改成你的正式域名，影响 sitemap / canonical 等绝对链接
  site: 'https://example.com',
});
