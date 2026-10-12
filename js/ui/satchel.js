/* ui/satchel.js - the limited inventory. Buttons are created once and updated in place,
   so a tap is never lost when a new drop lands. */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.satchel = {};
  var mode = 'mix', sel = -1, infoId = null;
  var root, slotsEl, infoEl, countEl, btns = [];

  function build() {
    slotsEl.innerHTML = ''; btns = [];
    for (var i = 0; i < A.state.inv.length; i++) (function (i) {
      var b = el('button', { class: 'slot empty', onclick: function () { tap(i); } });
      btns.push(b); slotsEl.appendChild(b);
    })(i);
  }

  function tap(i) {
    var s = A.state.inv[i]; if (!s) return;
    infoId = s.id;
    if (mode === 'mix') { E.toGrid(i); A.audio.play('coin'); }
    else sel = (sel === i ? -1 : i);
    update();
  }

  function update() {
    var inv = A.state.inv;
    if (btns.length !== inv.length) build();
    countEl.textContent = E.usedSlots() + '/' + inv.length + ' slots, ' + E.stackMax() + ' per slot';
    inv.forEach(function (s, i) {
      var b = btns[i];
      b.className = 'slot' + (s ? '' : ' empty') + (mode === 'manage' && sel === i ? ' sel' : '');
      b.dataset.kind = s ? A.data.itemById[s.id].kind : '';
      b.innerHTML = '';
      if (s) {
        b.title = A.data.itemById[s.id].name;
        b.appendChild(S.itemIcon(s.id, 40));
        if (s.n > 1) b.appendChild(el('span', { class: 'n' }, s.n));
      }
    });
    if (sel >= 0 && !inv[sel]) sel = -1;
    renderInfo();
  }

  function renderInfo() {
    infoEl.innerHTML = '';
    var s = sel >= 0 ? A.state.inv[sel] : null;
    var id = s ? s.id : infoId, it = id && A.data.itemById[id];
    if (!it) {
      infoEl.appendChild(document.createTextNode(mode === 'mix' ? 'Tap an item to drop it into the cauldron.' : 'Tap an item to sell it or drink it.'));
      return;
    }
    var sellOne = E.sellValue(it, 1);
    infoEl.appendChild(el('div', {}, el('b', {}, it.name), ' ', it.kind === 'potion' ? '(potion)' : '', '  ' + it.desc + (it.value ? '  Sells for ' + sellOne + '.' : '')));
    if (mode === 'manage' && s) {
      var row = el('div', { class: 'row-btns' });
      if (it.value) {
        row.appendChild(el('button', { class: 'btn small', onclick: function () { E.sellAt(sel, false); A.audio.play('coin'); } }, 'Sell 1 for ' + sellOne));
        if (s.n > 1) row.appendChild(el('button', { class: 'btn small', onclick: function () { E.sellAt(sel, true); A.audio.play('coin'); } }, 'Sell all ' + s.n + ' for ' + E.sellValue(it, s.n)));
      }
      if (it.effect) row.appendChild(el('button', { class: 'btn small primary', onclick: function () { E.useAt(sel); A.audio.play('brew'); } }, 'Drink'));
      infoEl.appendChild(row);
    }
  }

  T.init = function () {
    var panel = A.$('#panel-brew');
    countEl = el('small', {});
    var modes = el('div', { class: 'modes' },
      el('button', { class: 'on', onclick: function (e) { setMode('mix', e.currentTarget); } }, 'Mix'),
      el('button', { onclick: function (e) { setMode('manage', e.currentTarget); } }, 'Sell / Drink'));
    function setMode(m, btn) {
      mode = m; sel = -1;
      A.$$('button', modes).forEach(function (b) { b.classList.toggle('on', b === btn); });
      update();
    }
    slotsEl = el('div', { class: 'slots' });
    infoEl = el('div', { class: 'item-info' });
    root = el('div', { class: 'card' },
      el('div', { class: 'h2' }, el('span', {}, 'Satchel'), modes),
      el('div', { class: 'note', style: 'margin:-4px 0 8px' }, countEl),
      slotsEl, infoEl);
    root.id = 'satchelCard';
    panel.appendChild(root);
    ['inv', 'upgrades', 'coins'].forEach(function (e) { A.bus.on(e, update); });
  };
})();
