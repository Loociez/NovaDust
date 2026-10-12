/* ui/recipes.js - the recipe book. Unknown recipes show a hint only. "Fill" loads the cauldron. */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.recipes = {};
  var root, cards = [], dirty = true;

  function have(id) { return E.countItem(id) + A.state.grid.filter(function (g) { return g === id; }).length; }

  function build() {
    root.innerHTML = ''; cards = [];
    var s = A.state;
    A.data.tiers.forEach(function (t, ti) {
      var list = A.data.recipes.filter(function (r) { return r.tier === ti; });
      if (!list.length) return;
      if (ti > s.tier) {
        if (ti === s.tier + 1) {
          var prev = A.data.recipes.filter(function (r) { return r.tier === s.tier && r.kind === 'ascension'; })[0];
          root.appendChild(el('div', { class: 'zone-h' }, el('span', {}, 'Sealed zone')));
          root.appendChild(el('div', { class: 'locked-note' }, prev ? 'Brew the ' + A.data.itemById[prev.out].name + ' to open it.' : 'Brew an ascension recipe to open it.'));
        }
        return;
      }
      var known = list.filter(function (r) { return s.known[r.id]; }).length;
      root.appendChild(el('div', { class: 'zone-h' }, el('span', {}, t.name), el('small', { style: 'color:var(--mute)' }, known + '/' + list.length + ' discovered')));
      list.forEach(function (r) { var c = card(r); cards.push(c); root.appendChild(c.node); });
    });
    update();
  }

  function card(r) {
    var known = !!A.state.known[r.id], out = A.data.itemById[r.out];
    var ingBox = el('div', { class: 'ings' }), fill = el('button', { class: 'btn small', onclick: function () {
      if (E.fillRecipe(r.id)) { A.ui.setTab('brew'); }
    } }, 'Fill');
    var info = el('div', {},
      el('h4', {}, known ? r.name : 'Unknown recipe'),
      el('div', { class: 'tag' }, r.kind === 'ascension' ? 'Ascension' : r.kind === 'relic' ? 'Relic (' + out.slot + ')' : 'Potion'),
      known ? ingBox : el('div', { class: 'hint' }, '"' + r.hint + '" ' + Object.keys(r.ingredients).reduce(function (a, k) { return a + r.ingredients[k]; }, 0) + ' ingredients.'));
    if (known) {
      el('div', { class: 'hint' });
      info.appendChild(el('div', { class: 'hint' }, out.desc));
    }
    var node = el('div', { class: 'rec' + (r.kind === 'ascension' ? ' ascension' : '') },
      el('div', { class: 'out' }, known ? S.itemIcon(r.out, 44) : '?'), info, known ? fill : el('span'));
    return { r: r, node: node, ingBox: ingBox, fill: fill, known: known };
  }

  function update() {
    cards.forEach(function (c) {
      if (!c.known) return;
      var ok = true; c.ingBox.innerHTML = '';
      Object.keys(c.r.ingredients).forEach(function (k) {
        var need = c.r.ingredients[k], h = have(k), good = h >= need; if (!good) ok = false;
        c.ingBox.appendChild(el('span', { class: 'ing ' + (good ? 'have' : 'miss'), title: A.data.itemById[k].name + ' (' + h + '/' + need + ')' },
          S.itemIcon(k, 24), el('i', { class: 'c' }, need)));
      });
      c.fill.disabled = !ok;
    });
  }

  function refresh() { if (A.ui.tab === 'recipes') { if (dirty) { build(); dirty = false; } else update(); } }

  T.init = function () {
    root = A.$('#panel-recipes');
    A.bus.on('tab', function (t) { if (t === 'recipes') refresh(); });
    ['recipes', 'ascended'].forEach(function (e) { A.bus.on(e, function () { dirty = true; refresh(); }); });
    ['inv', 'grid'].forEach(function (e) { A.bus.on(e, function () { if (A.ui.tab === 'recipes') update(); }); });
  };
})();
