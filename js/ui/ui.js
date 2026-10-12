/* ui/ui.js - shell: header, tabs, toasts, modal. Calls init() on every panel module. */
(function () {
  var A = window.Alch, $ = A.$, el = A.el;
  var U = A.ui;
  U.tab = 'brew';
  var ORDER = ['stage', 'satchel', 'cauldron', 'recipes', 'workshop', 'journal'];

  U.setTab = function (name) {
    U.tab = name;
    A.$$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    A.$$('.panel').forEach(function (p) { p.classList.toggle('on', p.id === 'panel-' + name); });
    $('#panels').scrollTop = 0;
    A.bus.emit('tab', name);
  };

  U.toast = function (msg, kind) {
    var box = $('#toasts');
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    var t = el('div', { class: 'toast ' + (kind || '') }, msg);
    box.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2800);
  };

  U.modal = function (node) {
    var m = $('#modal'); m.innerHTML = ''; m.appendChild(node); m.hidden = false;
  };
  U.closeModal = function () { var m = $('#modal'); m.hidden = true; m.innerHTML = ''; };

  U.confirm = function (title, text, okLabel, onOk, danger) {
    U.modal(el('div', { class: 'dialog' },
      el('h3', {}, title), el('p', {}, text),
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn', onclick: U.closeModal }, 'Not yet'),
        el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: function () { U.closeModal(); onOk(); } }, okLabel))));
  };

  function header() {
    var c = A.data.config;
    $('#title').textContent = c.title; document.title = c.title;
    $('#coinIcon').setAttribute('style', A.sprites.cellStyle('items', A.data.itemById.ui_coin ? A.data.itemById.ui_coin.icon : 0, 22));
    function refresh() {
      $('#coins').textContent = A.fmt(A.state.coins);
      var b = $('#ascBadge'), n = A.state.ascensions;
      b.hidden = !n; b.textContent = 'Asc. ' + n;
    }
    ['coins', 'ascended', 'recipes'].forEach(function (e) { A.bus.on(e, refresh); });
  }

  U.init = function () {
    header();
    A.$$('#tabs button').forEach(function (b) { b.addEventListener('click', function () { U.setTab(b.dataset.tab); }); });
    A.bus.on('toast', function (t) { U.toast(t.msg, t.kind); });
    ORDER.forEach(function (k) { if (U[k] && U[k].init) U[k].init(); });
  };
})();
