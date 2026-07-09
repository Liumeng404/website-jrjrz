// 发起 GitHub OAuth 授权
// 对应 Decap config.yml 的 auth_endpoint: /api/auth
// 环境变量（在 Cloudflare Pages 控制台配置）：
//   GITHUB_CLIENT_ID     OAuth App Client ID
//   GITHUB_CLIENT_SECRET OAuth App Client Secret（仅 callback 用到，这里不用）
export async function onRequestGet(context) {
  const { env, request } = context;
  const redirectUri = new URL('/api/callback', request.url).toString();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('scope', 'repo,user');
  url.searchParams.set('redirect_uri', redirectUri);
  return Response.redirect(url.toString(), 302);
}
