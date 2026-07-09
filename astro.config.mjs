// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 静态站点生成，部署到 Cloudflare Pages
  output: 'static',
  site: 'https://www.jrjrz.com',
});
