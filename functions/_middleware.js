// Canonical host: https://www.jrjrz.com
// Apex (jrjrz.com) → single 301 to www, preserve path + query.
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'jrjrz.com') {
    url.hostname = 'www.jrjrz.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
