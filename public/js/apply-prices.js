/**
 * 从 /prices.json 填充页面上的价格占位
 * - data-price="chatgpt.plus" → 只替换数字
 * - data-price-text="月付 ¥{chatgpt.plus}" → 模板整段替换
 */
(function () {
  function getByPath(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      return acc == null ? acc : acc[key];
    }, obj);
  }

  function applyPrices(prices) {
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
