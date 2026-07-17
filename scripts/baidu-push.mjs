/**
 * 百度站长「主动推送」：推送本次变更相关的博客 URL
 * - 每日上限 10 条（免费额度）
 * - 环境变量 BAIDU_PUSH_TOKEN（推荐）；兼容默认 token 仅本地调试
 *
 * 用法：
 *   node scripts/baidu-push.mjs
 *   node scripts/baidu-push.mjs --urls https://www.jrjrz.com/blog/a/ https://www.jrjrz.com/blog/b/
 *   node scripts/baidu-push.mjs --diff HEAD~1 HEAD
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
  const out = { urls: [], diff: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--urls') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        out.urls.push(argv[++i]);
      }
    } else if (argv[i] === '--diff') {
      out.diff = [argv[++i], argv[++i] || 'HEAD'];
    }
  }
  return out;
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
    // src/content/blog/xxx.md → /blog/xxx/
    const m = f.replace(/\\/g, '/').match(/^src\/content\/blog\/(.+)\.mdx?$/i);
    if (!m) continue;
    const slug = m[1].replace(/\/index$/i, '');
    urls.push(`${SITE}/blog/${slug}/`);
  }
  return [...new Set(urls)];
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

  const api = `${API_BASE}?site=${encodeURIComponent(SITE)}&token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      // 部分环境缺 UA 时接口异常，显式带上
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
  let urls = args.urls;

  if (!urls.length) {
    // CI: 对比 before/after；本地：与 origin/main 前一提交比
    let from = process.env.BAIDU_PUSH_BEFORE || '';
    let to = process.env.BAIDU_PUSH_AFTER || 'HEAD';
    if (args.diff) {
      [from, to] = args.diff;
    }
    if (!from) {
      try {
        from = execSync('git rev-parse HEAD~1', { encoding: 'utf8' }).trim();
      } catch {
        from = '';
      }
    }
    if (from) {
      const files = gitDiffNames(from, to);
      urls = filesToBlogUrls(files);
      console.log('[baidu-push] diff', from, '..', to, 'files', files.length);
    }
  }

  // 若无 diff 到文章（例如只改了配置），不推送
  await pushUrls(urls);
}

main().catch((err) => {
  console.error('[baidu-push]', err);
  // 推送失败不阻断部署
  process.exit(0);
});
