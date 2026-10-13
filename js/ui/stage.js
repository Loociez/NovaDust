/* ui/stage.js - the monster you click: canvas, hp bar, zone chips, floating numbers */
(function () {
  var A = window.Alch, $ = A.$, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.stage = {};
  var view, arena, lastPos = null, floatCount = 0;

  function floater(cls, x, y, content) {
    if (floatCount > 24) return;
    floatCount++;
    var f = el('div', { class: 'float ' + cls }, content);
    f.style.left = x + '%'; f.style.top = y + '%';
    $('#floaters').appendChild(f);
    setTimeout(function () { f.remove(); floatCount--; }, 900);
  }

  function renderInfo() {
    var m = E.monster(); if (!m) return;
    $('#monName').textContent = m.def.name;
    var tag = $('#monTag'); tag.textContent = (m.shiny ? 'Shiny ' : '') + (m.def.boss ? 'Boss' : ''); tag.className = m.shiny ? 'shiny' : '';
    $('#monName').textContent = m.def.name + (E.masteryLevel(m.def.id) ? '  ' + new Array(E.masteryLevel(m.def.id) + 1).join('*') : '');
    $('#hpFill').style.width = (m.hp / m.maxHp * 100) + '%';
    $('#hpText').textContent = A.fmt(m.hp) + ' / ' + A.fmt(m.maxHp);
  }

  function renderZones() {
    var s = A.state, bar = $('#zoneBar'); bar.innerHTML = '';
    A.data.tiers.forEach(function (t, i) {
      if (i > s.tier + 1) return;
      if (i > s.tier) { bar.appendChild(el('button', { class: 'zone-chip locked', disabled: true, title: 'Brew an ascension recipe to unlock' }, 'Sealed')); return; }
      bar.appendChild(el('button', { class: 'zone-chip' + (i === s.zone ? ' on' : ''), role: 'tab', onclick: function () { E.setZone(i); } }, t.name));
    });
    var t = A.data.tiers[s.zone] || {};
    var st = $('#stage').style;
    st.setProperty('--sky-a', (t.sky && t.sky[0]) || '#2c3f3a');
    st.setProperty('--sky-b', (t.sky && t.sky[1]) || '#4d6b55');
    st.setProperty('--ground', t.ground || '#2b3a2a');
  }

  function renderBadge() {
    var used = E.usedSlots(), total = E.slots(), b = $('#satchelBadge');
    b.innerHTML = '';
    var bag = A.data.itemById.ui_bag;
    b.appendChild(el('i', { class: 'ico', style: S.cellStyle('items', bag ? bag.icon : 0, 20) }));
    b.appendChild(document.createTextNode(used + '/' + total));
    b.classList.toggle('full', used >= total);
  }

  function renderBuffs() {
    var bar = $('#buffBar'); bar.innerHTML = '';
    var now = Date.now();
    E.activeBuffs().forEach(function (b) {
      var it = A.data.itemById[b.item];
      bar.appendChild(el('span', { class: 'buff', title: it.desc }, S.itemIcon(b.item, 22), Math.max(0, Math.ceil((b.until - now) / 1000)) + 's'));
    });
  }

  T.init = function () {
    arena = $('#arena');
    view = new S.MonsterView($('#monster'));
    T.view = view;

    arena.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      var r = arena.getBoundingClientRect();
      lastPos = { x: (ev.clientX - r.left) / r.width * 100, y: (ev.clientY - r.top) / r.height * 100 };
      var m = E.monster(); if (!m || m.dying) return;
      E.hit(false);
    });
    $('#satchelBadge').addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
    $('#satchelBadge').addEventListener('click', function () { A.ui.setTab('brew'); });

    A.bus.on('monster', function (m) { view.setMonster(m.def, true); $('#monster').classList.toggle('shiny', !!m.shiny); renderInfo(); });
    A.bus.on('hit', function (h) {
      view.hit(); renderInfo(); A.audio.play('hit');
      var p = h.auto || !lastPos ? { x: 35 + Math.random() * 30, y: 35 + Math.random() * 25 } : lastPos;
      floater(h.crit ? 'crit' : 'dmg', p.x, p.y, h.crit ? h.dmg + '!' : String(h.dmg));
    });
    A.bus.on('drop', function (d) {
      var it = A.data.itemById[d.id], x = 30 + Math.random() * 40;
      if (d.ok) { floater('', x, 30, [S.itemIcon(d.id, 32), it.name]); A.audio.play('drop'); }
      else floater('lost', x, 30, 'Satchel full: ' + it.name + ' lost');
    });
    A.bus.on('kill', function (k) {
      view.die(); A.audio.play('kill');
      floater('coin', 50, 22, '+' + A.fmt(k.coins) + ' coins');
      if (k.essence) floater('ess', 50, 12, '+' + k.essence + ' Essence');
    });
    ['inv', 'upgrades'].forEach(function (e) { A.bus.on(e, renderBadge); });
    ['zone', 'ascended', 'recipes'].forEach(function (e) { A.bus.on(e, renderZones); });
    A.bus.on('buffs', renderBuffs);
    setInterval(renderBuffs, 1000);
    renderZones(); renderBadge();
  };

  T.frame = function (dt) { view.update(dt); view.draw(); };
})();
