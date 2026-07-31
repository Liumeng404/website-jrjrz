/**
 * 百度站长「主动推送」API（仅手动触发）
 *
 * GET  /api/baidu-push  — 检查配置状态（需管理密钥）
 * POST /api/baidu-push  — 推送 URL 列表（需管理密钥）
 *
 * Cloudflare Pages 环境变量：
 *   BAIDU_PUSH_SECRET  后台管理密钥（必填，仅用于鉴权，勿提交仓库）
 *   BAIDU_PUSH_TOKEN   百度站长 token（可选；未设时用兼容默认值）
 *
 * 请求头：Authorization: Bearer <密钥>
 * 或 JSON body / query: secret
 */

const SITE = 'https://www.jrjrz.com';
const API_BASE = 'http://data.zz.baidu.com/urls';
const DAILY_LIMIT = 10;
/** 与百度站长平台一致；优先用环境变量覆盖 */
const DEFAULT_TOKEN = 'wo4t1RgbdElMtJHl';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getSecret(env) {
  // 必须单独配置，禁止回退到公开 token，避免接口被刷额度
  return (env.BAIDU_PUSH_SECRET || '').trim();
}

function getToken(env) {
  return (env.BAIDU_PUSH_TOKEN || DEFAULT_TOKEN).trim();
}

function extractProvidedSecret(request, body) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  if (body && typeof body.secret === 'string') {
    return body.secret.trim();
  }
  const url = new URL(request.url);
  return (url.searchParams.get('secret') || '').trim();
}

function authorize(request, env, body) {
  const expected = getSecret(env);
  if (!expected) {
    return {
      ok: false,
      response: json(
        {
          ok: false,
          error:
            '服务端未配置 BAIDU_PUSH_SECRET。请到 Cloudflare Pages → Settings → Environment variables 添加后重新部署。',
        },
        503
      ),
    };
  }
  const provided = extractProvidedSecret(request, body);
  if (!provided || provided !== expected) {
    return {
      ok: false,
      response: json({ ok: false, error: '管理密钥无效' }, 401),
    };
  }
  return { ok: true };
}

/** 仅保留本站 URL，路径统一尾斜杠（与 sitemap 一致） */
function normalizeUrls(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/\r?\n/)
      : [];

  const clean = [];
  for (const item of list) {
    const u = String(item || '').trim();
    if (!u) continue;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      if (
        parsed.hostname !== 'www.jrjrz.com' &&
        parsed.hostname !== 'jrjrz.com'
      ) {
        continue;
      }
      let path = parsed.pathname || '/';
      if (path !== '/' && !path.endsWith('/')) path += '/';
      const search = parsed.search || '';
      clean.push(
        path === '/'
          ? `https://www.jrjrz.com/${search}`
          : `https://www.jrjrz.com${path}${search}`
      );
    } catch {
      /* skip invalid */
    }
  }
  return [...new Set(clean)];
}

async function pushToBaidu(token, urls) {
  const limited = urls.slice(0, DAILY_LIMIT);
  // site / token 不要 encodeURIComponent，否则百度返回 site init fail
  const api = `${API_BASE}?site=${SITE}&token=${token}`;
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': 'jrjrz-baidu-push/1.0',
    },
    body: limited.join('\n'),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data, sent: limited, text };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const auth = authorize(request, env, null);
  if (!auth.ok) return auth.response;

  const token = getToken(env);
  return json({
    ok: true,
    site: SITE,
    dailyLimit: DAILY_LIMIT,
    tokenConfigured: Boolean(token),
    tokenFromEnv: Boolean((env.BAIDU_PUSH_TOKEN || '').trim()),
    hint: 'POST JSON: { "urls": ["https://www.jrjrz.com/blog/xxx/"] }，每次最多 10 条。',
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const auth = authorize(request, env, body);
  if (!auth.ok) return auth.response;

  const token = getToken(env);

  const urls = normalizeUrls(body.urls);
  if (!urls.length) {
    return json(
      {
        ok: false,
        error: '没有有效的本站 URL。请填写 https://www.jrjrz.com/ 下的地址。',
      },
      400
    );
  }

  const truncated = urls.length > DAILY_LIMIT;
  const toSend = urls.slice(0, DAILY_LIMIT);

  try {
    const result = await pushToBaidu(token, toSend);
    if (!result.ok) {
      return json(
        {
          ok: false,
          error: `百度接口返回 HTTP ${result.status}`,
          baidu: result.data,
          raw: result.text,
          sent: result.sent,
          skipped: truncated ? urls.slice(DAILY_LIMIT) : [],
          dailyLimit: DAILY_LIMIT,
        },
        502
      );
    }
    return json({
      ok: true,
      baidu: result.data,
      sent: result.sent,
      requested: urls.length,
      truncated,
      skipped: truncated ? urls.slice(DAILY_LIMIT) : [],
      dailyLimit: DAILY_LIMIT,
      site: SITE,
    });
  } catch (err) {
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}
