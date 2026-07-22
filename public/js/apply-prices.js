/**
 * 从 /prices.json 填充页面上的价格占位（主要用于博客正文等含 data-price 的片段）
 * - data-price="chatgpt.plus" → 只替换数字
 * - data-price-text="月付 ¥{chatgpt.plus}" → 模板整段替换
 * 双月节省额始终按 monthly×2 − bimonthly 计算，避免 CMS 手填错误。
 */
(function () {
  function getByPath(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? acc : acc[key];
    }, obj);
  }

  function normalize(prices) {
    if (prices && prices.grok && prices.grok.monthly != null && prices.grok.bimonthly != null) {
      prices.grok.bimonthly_save =
        Number(prices.grok.monthly) * 2 - Number(prices.grok.bimonthly);
    }
    return prices;
  }

  function applyPrices(prices) {
    prices = normalize(prices);

    document.querySelectorAll('[data-price]').forEach(function (el) {
      var path = el.getAttribute('data-price');
      if (!path) return;
      var val = getByPath(prices, path);
      if (val == null || val === '') return;
      el.textContent = String(val);
    });

    document.querySelectorAll('[data-price-text]').forEach(function (el) {
      var tpl = el.getAttribute('data-price-text');
      if (!tpl) return;
      el.textContent = tpl.replace(/\{([a-zA-Z0-9_.]+)\}/g, function (_, path) {
        var val = getByPath(prices, path);
        return val == null ? '' : String(val);
      });
    });
  }

  fetch('/prices.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('prices.json ' + res.status);
      return res.json();
    })
    .then(applyPrices)
    .catch(function () {
      /* 保留 HTML 内写死的兜底价格 */
    });
})();
