/**
 * 百度站长「主动推送」— 本地/CLI 手动工具
 *
 * 部署与发文时不会自动调用。日常请优先用后台：
 *   https://www.jrjrz.com/admin/baidu.html
 *
 * 环境变量：
 *   BAIDU_PUSH_TOKEN  百度站长 token（推荐）；未设时用下方兼容默认值仅限本地调试
 *
 * 用法：
 *   npm run baidu:push -- --urls https://www.jrjrz.com/blog/a/ https://www.jrjrz.com/blog/b/
 *   node scripts/baidu-push.mjs --urls https://www.jrjrz.com/chatgpt/
 *   node scripts/baidu-push.mjs --diff HEAD~1 HEAD   # 手动对比 git 变更中的博客
 *   node scripts/baidu-push.mjs --sitemap             # 从已部署 sitemap 取 URL（仍需你确认）
 */

import { execSync } from 'node:child_process';

// 本地 HTTP(S)_PROXY 走代理时，百度常返回 site init fail；推送时绕过代理
for (const k of [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'http_proxy',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
]) {
  delete process.env[k];
}
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

const SITE = 'https://www.jrjrz.com';
const API_BASE = 'http://data.zz.baidu.com/urls';
const DAILY_LIMIT = 10;
const TOKEN = process.env.BAIDU_PUSH_TOKEN || 'wo4t1RgbdElMtJHl';

function parseArgs(argv) {
  const out = { urls: [], diff: null, sitemap: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--urls') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        out.urls.push(argv[++i]);
      }
    } else if (argv[i] === '--diff') {
      out.diff = [argv[++i], argv[++i] || 'HEAD'];
    } else if (argv[i] === '--sitemap') {
      out.sitemap = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      out.help = true;
    }
  }
  return out;
}

function printHelp() {
  console.log(`百度主动推送（手动）

  --urls <url...>     指定要推送的 URL
  --diff <from> <to>  从 git diff 中提取博客 URL（默认不自动跑）
  --sitemap           拉取线上 sitemap 中的全部 URL（仍会截断到 ${DAILY_LIMIT} 条）
  --help              显示帮助

后台页面：${SITE}/admin/baidu.html
`);
}

function gitDiffNames(from, to) {
  try {
    const out = execSync(`git diff --name-only --diff-filter=AM ${from} ${to}`, {
      encoding: 'utf8',
    });
    return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function filesToBlogUrls(files) {
  const urls = [];
  for (const f of files) {
    const m = f.replace(/\\/g, '/').match(/^src\/content\/blog\/(.+)\.mdx?$/i);
    if (!m) continue;
    const slug = m[1].replace(/\/index$/i, '');
    urls.push(`${SITE}/blog/${slug}/`);
  }
  return [...new Set(urls)];
}

async function urlsFromSitemap() {
  const res = await fetch(`${SITE}/sitemap.xml`, {
    headers: { 'User-Agent': 'jrjrz-baidu-push/1.0' },
  });
  if (!res.ok) {
    throw new Error(`sitemap fetch failed: ${res.status}`);
  }
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) =>
    m[1].trim()
  );
  return [...new Set(locs)];
}

async function pushUrls(urls) {
  if (!urls.length) {
    console.log('[baidu-push] no urls to push');
    return { skipped: true };
  }
  const limited = urls.slice(0, DAILY_LIMIT);
  if (urls.length > DAILY_LIMIT) {
    console.warn(
      `[baidu-push] ${urls.length} urls, only first ${DAILY_LIMIT} sent (daily cap)`
    );
  }

  // 注意：site / token 不要 encodeURIComponent，否则百度返回 site init fail
  const api = `${API_BASE}?site=${SITE}&token=${TOKEN}`;
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': 'jrjrz-baidu-push/1.0',
    },
    body: limited.join('\n'),
  });
  const text = await res.text();
  console.log('[baidu-push] status', res.status, text);
  console.log('[baidu-push] sent', limited);

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(`Baidu push failed: ${res.status} ${text}`);
  }
  return json;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  let urls = args.urls;

  if (!urls.length && args.sitemap) {
    urls = await urlsFromSitemap();
    console.log('[baidu-push] sitemap urls', urls.length);
  }

  if (!urls.length && args.diff) {
    const [from, to] = args.diff;
    const files = gitDiffNames(from, to);
    urls = filesToBlogUrls(files);
    console.log('[baidu-push] diff', from, '..', to, 'files', files.length);
  }

  if (!urls.length) {
    console.error(
      '[baidu-push] 未指定 URL。请使用 --urls / --diff / --sitemap，或打开后台手动推送。'
    );
    printHelp();
    process.exitCode = 1;
    return;
  }

  await pushUrls(urls);
}

main().catch((err) => {
  console.error('[baidu-push]', err);
  process.exitCode = 1;
});
