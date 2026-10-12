/* ui/workshop.js - equipped relics, current stats, coin upgrades */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.workshop = {};
  var gearEl, statsEl, upgEl, upgCards = [];

  var SLOTS = [['tool', 'Tool'], ['charm', 'Charm'], ['trinket', 'Trinket']];

  function renderGear() {
    gearEl.innerHTML = '';
    SLOTS.forEach(function (sl) {
      var id = A.state.gear[sl[0]], it = id && A.data.itemById[id];
      gearEl.appendChild(it
        ? el('div', { class: 'gear-slot', title: it.desc }, S.itemIcon(id, 48), el('div', { class: 'nm' }, it.name), el('div', { class: 'sub' }, it.desc))
        : el('div', { class: 'gear-slot empty' }, el('div', {}, sl[1]), el('div', {}, 'Brew a relic')));
    });
  }

  function renderStats() {
    var rows = [
      ['Click power', A.fmt(E.clickPower())],
      ['Drop chance', A.pct(E.dropChance())],
      ['Coin bonus', A.pct(E.coinMult() - 1)],
      ['Apprentices', E.apprentices() + (E.apprentices() ? ' (' + (E.autoRate()).toFixed(1) + '/s)' : '')],
      ['Satchel', E.slots() + ' slots x ' + E.stackMax()],
      ['Ascensions', A.state.ascensions]
    ];
    statsEl.innerHTML = '';
    rows.forEach(function (r) { statsEl.appendChild(el('span', {}, r[0])); statsEl.appendChild(el('span', {}, String(r[1]))); });
  }

  function buildUpgrades() {
    upgEl.innerHTML = ''; upgCards = [];
    A.data.upgrades.forEach(function (u) {
      var lv = el('span', { class: 'lv' }), btn = el('button', { class: 'btn small', onclick: function () { E.buyUpgrade(u.id); A.audio.play('buy'); } });
      var node = el('div', { class: 'upg' }, S.itemIcon(u.icon, 40), el('div', {}, el('h4', {}, u.name + ' ', lv), el('div', { class: 'd' }, u.desc)), btn);
      upgCards.push({ u: u, lv: lv, btn: btn }); upgEl.appendChild(node);
    });
    updateUpgrades();
  }
  function updateUpgrades() {
    upgCards.forEach(function (c) {
      var l = E.upgLevel(c.u.id), maxed = l >= c.u.max, cost = E.upgCost(c.u);
      c.lv.textContent = 'Lv ' + l + '/' + c.u.max;
      c.btn.textContent = maxed ? 'Maxed' : A.fmt(cost) + ' coins';
      c.btn.disabled = maxed || A.state.coins < cost;
    });
  }
  function refresh() { renderGear(); renderStats(); updateUpgrades(); }

  T.init = function () {
    var p = A.$('#panel-workshop');
    gearEl = el('div', { class: 'gear' }); statsEl = el('div', { class: 'stat-grid' }); upgEl = el('div');
    p.appendChild(el('div', { class: 'card' }, el('div', { class: 'h2' }, el('span', {}, 'Relics'), el('small', {}, 'lost on ascension')), gearEl));
    p.appendChild(el('div', { class: 'card' }, el('div', { class: 'h2' }, el('span', {}, 'Your numbers')), statsEl));
    p.appendChild(el('div', { class: 'h2' }, el('span', {}, 'Upgrades'), el('small', {}, 'lost on ascension')));
    p.appendChild(upgEl);
    buildUpgrades(); refresh();
    A.bus.on('coins', updateUpgrades);
    ['upgrades', 'gear', 'buffs', 'ascended', 'recipes'].forEach(function (e) { A.bus.on(e, function () { refresh(); }); });
  };
})();
