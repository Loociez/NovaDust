/* ui/ui.js - shell: header, tabs, toasts, modal. Calls init() on every panel module. */
(function () {
  var A = window.Alch, $ = A.$, el = A.el;
  var U = A.ui;
  U.tab = 'brew';
  var ORDER = ['stage', 'satchel', 'cauldron', 'recipes', 'orders', 'workshop', 'arcanum', 'codex', 'journal'];

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

  U.showAway = function (r) {
    var h = Math.floor(r.counted / 3600), m = Math.floor(r.counted % 3600 / 60);
    var items = el('div', { class: 'away-items' });
    r.items.forEach(function (i) { items.appendChild(el('span', { class: 'ing have' }, A.sprites.itemIcon(i.id, 32), el('i', { class: 'c' }, i.n))); });
    U.modal(el('div', { class: 'dialog' },
      el('h3', {}, 'While you were away'),
      el('p', {}, 'Your apprentices worked for ' + (h ? h + 'h ' : '') + m + 'm' + (r.capped ? ' (the most they will do while you are gone)' : '') + '.'),
      el('p', {}, 'They harvested ' + A.fmt(r.kills) + ' creatures and earned ' + A.fmt(r.coins) + ' coins.'),
      r.items.length ? items : null,
      r.lost > 0 ? el('p', { class: 'note' }, A.fmt(r.lost) + ' items did not fit in the satchel.') : null,
      el('div', { class: 'row-btns' }, el('button', { class: 'btn primary', onclick: U.closeModal }, 'Welcome back'))));
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
    var ei = A.data.itemById.ui_essence;
    $('#essIcon').setAttribute('style', A.sprites.cellStyle('items', ei ? ei.icon : 0, 22));
    function refreshEss() { var s = A.state; $('#essenceBox').hidden = !(s.essence || s.ascensions || s.stats.essence); $('#essence').textContent = A.fmt(s.essence); }
    ['coins', 'ascended', 'recipes'].forEach(function (e) { A.bus.on(e, refresh); });
    ['essence', 'ascended', 'perks'].forEach(function (e) { A.bus.on(e, refreshEss); });
    A.ui.refreshHeader = function () { refresh(); refreshEss(); };
  }

  U.init = function () {
    header();
    A.$$('#tabs button').forEach(function (b) { b.addEventListener('click', function () { U.setTab(b.dataset.tab); }); });
    A.ui.refreshHeader();
    A.bus.on('toast', function (t) { U.toast(t.msg, t.kind); });
    ORDER.forEach(function (k) { if (U[k] && U[k].init) U[k].init(); });
  };
})();
