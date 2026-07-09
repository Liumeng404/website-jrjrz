// GitHub OAuth 回调：用 code 换 access_token，再通过 postMessage 回传给 Decap 弹窗
// 协议参考：https://decapcms.org/docs/external-oauth-clients/
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
