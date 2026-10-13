/* ui/codex.js - bestiary: kill mastery (permanent) and shiny collection */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.codex = {};
  var root, dirty = true;

  function build() {
    root.innerHTML = '';
    var c = A.data.config.bestiary, s = A.state, pts = E.masteryPoints(), max = A.data.monsters.length * c.levels.length;
    var shinyN = E.shinyCount();
    root.appendChild(el('div', { class: 'card' },
      el('div', { class: 'h2' }, el('span', {}, 'Codex')),
      el('div', { class: 'rows' },
        el('span', {}, 'Mastery points'), el('span', {}, pts + '/' + max),
        el('span', {}, 'Permanent click and coin bonus'), el('span', {}, '+' + (pts * c.globalPerLevel * 100).toFixed(1) + '%'),
        el('span', {}, 'Shinies found'), el('span', {}, shinyN + '/' + A.data.monsters.length),
        el('span', {}, 'Essence bonus from shinies'), el('span', {}, '+' + Math.round(shinyN * A.data.config.essence.perShiny * 100) + '%')),
      el('div', { class: 'note', style: 'margin-top:8px' }, 'Harvest a creature to level its mastery: +' + Math.round(c.dmg * 100) + '% damage, +' + Math.round(c.coins * 100) + '% coins and +' + Math.round(c.drop * 100) + '% drop chance against it per level. Each level also adds to a global bonus. Shiny creatures are rare, tougher and pay Essence.')));
    A.data.tiers.forEach(function (t, ti) {
      var list = A.data.monsters.filter(function (m) { return m.tier === ti; });
      if (!list.length) return;
      if (ti > s.tier) { if (ti === s.tier + 1) root.appendChild(el('div', { class: 'zone-h' }, el('span', {}, 'Sealed zone'))); return; }
      var lv = list.reduce(function (a, m) { return a + E.masteryLevel(m.id); }, 0);
      root.appendChild(el('div', { class: 'zone-h' }, el('span', {}, t.name), el('small', { style: 'color:var(--mute)' }, lv + '/' + list.length * c.levels.length)));
      list.forEach(function (m) {
        var k = E.kills(m.id), L = E.masteryLevel(m.id), seen = k > 0, sh = s.shinies[m.id];
        var prev = L ? c.levels[L - 1] : 0, next = c.levels[L], pct = next ? Math.min(100, (k - prev) / (next - prev) * 100) : 100;
        var stars = ''; for (var i = 0; i < c.levels.length; i++) stars += i < L ? '*' : '.';
        root.appendChild(el('div', { class: 'cod' + (seen ? '' : ' unseen') + (sh ? ' shiny' : '') },
          el('div', { class: 'pic' }, S.monsterIcon(m, 48)),
          el('div', {},
            el('h4', {}, el('span', {}, seen ? m.name + (m.boss ? ' (boss)' : '') : '???'), el('span', { class: 'stars' }, stars)),
            el('div', { class: 'sub' }, seen ? A.fmt(k) + ' harvested' + (next ? ', next level at ' + A.fmt(next) : ', mastered') + (sh ? '  |  shiny x' + sh : '') : 'Not yet met'),
            el('div', { class: 'bar' }, el('i', { style: 'width:' + pct + '%' })))));
      });
    });
  }
  function refresh() { if (A.ui.tab === 'codex') { if (dirty) { build(); dirty = false; } } }
  T.init = function () {
    root = A.$('#panel-codex');
    A.bus.on('tab', function (t) { if (t === 'codex') { dirty = true; refresh(); } });
    ['mastery', 'ascended'].forEach(function (e) { A.bus.on(e, function () { dirty = true; refresh(); }); });
  };
})();
