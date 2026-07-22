/**
 * 产品子页公共交互：滚动显现、二维码弹窗、FAQ 折叠、复制文本
 */
(function () {
  var revealItems = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add('in-view');
    });
  }

  window.openQrModal = function openQrModal() {
    var modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  };

  window.closeQrModal = function closeQrModal() {
    var modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  window.copyText = function copyText(target, text) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    var old = target.textContent;
    target.textContent = '已复制：' + text;
    window.setTimeout(function () {
      target.textContent = old;
    }, 1400);
  };

  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      item.classList.toggle('active');
    });
  });

  var modal = document.getElementById('qrModal');
  if (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target === event.currentTarget) window.closeQrModal();
    });
  }
})();
