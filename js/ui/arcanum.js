/* ui/arcanum.js - permanent perks bought with Essence */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.arcanum = {};
  var head, hint, listEl, cards = [];

  function build() {
    listEl.innerHTML = ''; cards = [];
    A.data.perks.forEach(function (p) {
      var lv = el('span', { class: 'lv' }), btn = el('button', { class: 'btn small', onclick: function () { E.buyPerk(p.id); A.audio.play('buy'); } });
      var node = el('div', { class: 'upg' }, S.itemIcon(p.icon, 40), el('div', {}, el('h4', {}, p.name + ' ', lv), el('div', { class: 'd' }, p.desc)), btn);
      cards.push({ p: p, lv: lv, btn: btn }); listEl.appendChild(node);
    });
  }
  function update() {
    var s = A.state;
    head.innerHTML = '';
    head.appendChild(S.itemIcon('ui_essence', 30)); head.appendChild(el('b', {}, A.fmt(s.essence))); head.appendChild(document.createTextNode(' Essence'));
    var best = A.data.recipes.filter(function (r) { return r.kind === 'ascension' && r.tier <= s.tier; }).pop();
    hint.textContent = best ? 'Ascending with ' + A.data.itemById[best.out].name + ' right now would give about ' + A.fmt(E.essenceGain(best.tier)) + ' Essence (more the more coins you earn this run, and the deeper the zone).' : '';
    cards.forEach(function (c) {
      var l = E.perkLevel(c.p.id), maxed = l >= c.p.max, cost = E.perkCost(c.p);
      c.lv.textContent = 'Lv ' + l + '/' + c.p.max;
      c.btn.textContent = maxed ? 'Maxed' : A.fmt(cost) + ' Essence';
      c.btn.disabled = maxed || s.essence < cost;
    });
    var b = A.$('#tabs button[data-tab=arcanum]'), can = cards.some(function (c) { return !c.btn.disabled; }), d = A.$('.dot', b);
    if (can && !d) b.appendChild(el('span', { class: 'dot' })); if (!can && d) d.remove();
  }

  T.init = function () {
    var p = A.$('#panel-arcanum');
    head = el('div', { class: 'perk-head' });
    hint = el('div', { class: 'note', style: 'margin-bottom:10px' });
    listEl = el('div');
    p.appendChild(head);
    p.appendChild(el('div', { class: 'note' }, 'Essence is earned by ascending, delivering orders and finding shiny creatures. Perks here are permanent and survive every ascension.'));
    p.appendChild(hint); p.appendChild(listEl);
    build(); update();
    ['essence', 'perks', 'ascended', 'coins'].forEach(function (e) { A.bus.on(e, update); });
    A.bus.on('tab', function (t) { if (t === 'arcanum') update(); });
  };
})();
