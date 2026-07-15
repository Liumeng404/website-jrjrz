/**
 * 子页（静态 HTML）应用 site-config.json：TDK + 胖页脚
 * 在 <html> 或 <body> 上设置 data-page="chatgpt|claude|grok"
 */
(function () {
  var page =
    document.documentElement.getAttribute('data-page') ||
    document.body.getAttribute('data-page') ||
    '';

  function setMeta(name, content) {
    if (!content) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function applyTdk(tdk) {
    if (!tdk) return;
    if (tdk.title) document.title = tdk.title;
    setMeta('description', tdk.description || '');
    setMeta('keywords', tdk.keywords || '');
  }

  function linkHtml(link) {
    var href = link.href || '#';
    var text = link.text || '';
    if (link.action === 'qr') {
      return (
        '<li><a href="javascript:void(0)" onclick="typeof openQrModal===\'function\'&&openQrModal()">' +
        escapeHtml(text) +
        '</a></li>'
      );
    }
    return (
      '<li><a href="' +
      escapeAttr(href) +
      '">' +
      escapeHtml(text) +
      '</a></li>'
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function renderFooter(footer) {
    if (!footer) return;
    var host = document.getElementById('site-footer');
    if (!host) return;

    var year = new Date().getFullYear();
    var cols = (footer.columns || [])
      .map(function (col) {
        var links = (col.links || []).map(linkHtml).join('');
        return (
          '<div><div class="footer-col-title">' +
          escapeHtml(col.title || '') +
          '</div><ul class="footer-links">' +
          links +
          '</ul></div>'
        );
      })
      .join('');

    var seo = '';
    if (footer.seoLinks && footer.seoLinks.length) {
      seo =
        '<div class="footer-seo">' +
        '<div class="footer-seo-title">' +
        escapeHtml(footer.seoTitle || '热门关键词') +
        '</div>' +
        '<div class="footer-seo-links">' +
        footer.seoLinks
          .map(function (l) {
            return (
              '<a href="' +
              escapeAttr(l.href || '#') +
              '">' +
              escapeHtml(l.text || '') +
              '</a>'
            );
          })
          .join('') +
        '</div></div>';
    }

    host.innerHTML =
      '<div class="container">' +
      '<div class="footer-grid footer-fat">' +
      '<div class="footer-brand">' +
      '<a class="logo" href="/">' +
      '<img class="logo-mark" src="/images/logo.jpg" alt="露梦AI Store LOGO" />' +
      '<span style="color:var(--ink)">露梦AI Store</span></a>' +
      '<div class="footer-desc">' +
      escapeHtml(footer.brandDesc || '') +
      '</div></div>' +
      cols +
      '</div>' +
      seo +
      '<div class="footer-bottom">' +
      '<div>&copy; ' +
      year +
      ' 露梦AI Store。' +
      escapeHtml(footer.copyright || '') +
      '</div>' +
      '<div class="footer-badges"><div class="fbadge">微信支付</div><div class="fbadge">SSL 加密</div></div>' +
      '</div></div>';
  }

  fetch('/site-config.json', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('site-config ' + r.status);
      return r.json();
    })
    .then(function (cfg) {
      if (page && cfg.tdk && cfg.tdk[page]) applyTdk(cfg.tdk[page]);
      renderFooter(cfg.footer);
    })
    .catch(function () {});
})();
