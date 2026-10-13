/* ui/cauldron.js - the 3x3 grid, brew button, result banner, ascension dialogs */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.cauldron = {};
  var cells = [], potEl, lineEl, brewBtn, againBtn, bannerEl, bannerTimer;

  function update() {
    var g = A.state.grid, any = g.some(Boolean);
    g.forEach(function (id, i) {
      var b = cells[i]; b.innerHTML = ''; b.className = 'cell' + (id ? ' filled' : '');
      if (id) { b.appendChild(S.itemIcon(id, 48)); b.title = A.data.itemById[id].name + ' (tap to take back)'; }
      else b.title = '';
    });
    brewBtn.disabled = !any;
    var lr = A.state.lastRecipe && A.data.recipeById[A.state.lastRecipe];
    againBtn.disabled = !lr; againBtn.title = lr ? 'Refill the cauldron with: ' + lr.name : 'Brew something first';
    var r = E.matchRecipe(), cls = '', html = '';
    potEl.className = 'pot';
    if (!any) html = 'Tap items in the satchel to add them.';
    else if (!r) html = 'Nothing is happening yet.';
    else if (A.state.known[r.id]) {
      cls = r.kind === 'ascension' ? 'odd' : 'good';
      html = 'Ready: <b>' + r.name + '</b>' + (r.kind === 'ascension' ? ' (resets your run)' : '');
      potEl.className = 'pot ready';
    } else { cls = 'odd'; html = 'The mixture <b>hums</b>. Brew it to see what it makes.'; potEl.className = 'pot ready unknown'; }
    lineEl.className = 'result-line ' + cls; lineEl.innerHTML = html;
  }

  function banner(content, fail) {
    bannerEl.innerHTML = ''; bannerEl.hidden = false;
    bannerEl.className = fail ? 'fail' : '';
    content.forEach(function (c) { bannerEl.appendChild(c); });
    bannerEl.style.animation = 'none'; void bannerEl.offsetWidth; bannerEl.style.animation = '';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { bannerEl.hidden = true; }, 6000);
  }

  function onBrewed(b) {
    if (b.fail) {
      A.audio.play('fail');
      if (b.recycled) { banner([S.itemIcon('ui_coin', 40), el('span', {}, 'It fizzles. The recycler pays ' + A.fmt(b.recycled) + ' coins.')], true); return; }
      banner([b.out ? S.itemIcon(b.out, 40) : el('span'), el('span', {}, b.out ? 'It fizzles into ' + A.data.itemById[b.out].name + '.' : 'It fizzles. Your ingredients are back in the satchel.')], true);
      return;
    }
    A.audio.play('brew');
    var it = A.data.itemById[b.out], msg;
    if (b.relic) msg = 'Equipped ' + it.name + '.' + (b.replaced ? ' Old relic sold.' : '');
    else msg = 'Brewed ' + (b.made > 1 ? b.made + 'x ' : '') + it.name + '!' + (b.made > (b.recipe.n || 1) ? ' Double batch!' : '');
    banner([S.itemIcon(b.out, 40), el('span', {}, msg + (b.isNew ? '  New recipe learned.' : ''))]);
    if (b.isNew) A.engine.toast('Recipe discovered: ' + b.recipe.name, 'good');
  }

  function confirmAscend(r) {
    var s = A.state, ac = A.data.config.ascension;
    var next = Math.min(A.data.tiers.length - 1, r.tier + 1);
    var unlock = next > s.tier ? 'It unlocks a new zone: ' + A.data.tiers[next].name + '.' : 'No new zone is left to unlock, but you will grow stronger.';
    A.ui.modal(el('div', { class: 'dialog' },
      el('i', { class: 'ico big', style: S.cellStyle('items', A.data.itemById[r.out].icon, 72) }),
      el('h3', {}, 'Drink the ' + A.data.itemById[r.out].name + '?'),
      el('p', {}, 'Your satchel, relics, upgrades and coins will be consumed. You keep every recipe you know.'),
      el('p', {}, unlock),
      el('p', {}, 'You will gain about ', el('b', { style: 'color:#cdb6ff' }, A.fmt(gain) + ' Essence'), ' to spend in the Arcanum.'),
      el('p', { class: 'note' }, 'Each ascension also adds +' + Math.round(ac.perClick * 100) + '% click power and +' + Math.round(ac.perCoin * 100) + '% coins, permanently.'),
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn', onclick: A.ui.closeModal }, 'Not yet'),
        el('button', { class: 'btn primary', onclick: function () { A.ui.closeModal(); E.ascend(r.id); } }, 'Ascend'))));
  }

  function onAscended(a) {
    A.audio.play('ascend');
    var z = a.unlockedZone != null ? A.data.tiers[a.unlockedZone] : null;
    var mons = z ? A.data.monsters.filter(function (m) { return m.tier === a.unlockedZone; }).length : 0;
    A.ui.setTab('brew');
    A.ui.modal(el('div', { class: 'dialog rebirth' },
      el('i', { class: 'ico big', style: S.cellStyle('items', A.data.itemById[a.recipe.out].icon, 72) }),
      el('h3', {}, 'Reborn'),
      z ? el('p', {}, 'The ' + z.name + ' is open to you. ' + mons + ' new creatures and a fresh set of ingredients wait there.') : el('p', {}, 'You start over, stronger than before.'),
      el('p', {}, '+' + A.fmt(a.essence) + ' Essence. Spend it in the Arcanum.'),
      el('p', { class: 'note' }, 'Ascension ' + a.ascensions + '. Permanent bonus: +' + Math.round(a.ascensions * A.data.config.ascension.perClick * 100) + '% click power, +' + Math.round(a.ascensions * A.data.config.ascension.perCoin * 100) + '% coins.'),
      el('div', { class: 'row-btns' }, el('button', { class: 'btn primary', onclick: function () { A.ui.closeModal(); A.ui.setTab('arcanum'); } }, 'To the Arcanum'), el('button', { class: 'btn', onclick: A.ui.closeModal }, 'Close'))));
  }

  T.init = function () {
    var panel = A.$('#panel-brew');
    var gridEl = el('div', { class: 'grid3' });
    for (var i = 0; i < 9; i++) (function (i) {
      var b = el('button', { class: 'cell', onclick: function () { E.fromGrid(i); } });
      cells.push(b); gridEl.appendChild(b);
    })(i);
    potEl = el('div', { class: 'pot' }, gridEl);
    lineEl = el('div', { class: 'result-line' });
    brewBtn = el('button', { class: 'btn primary', onclick: function () { E.brew(); } }, 'Brew');
    againBtn = el('button', { class: 'btn', onclick: function () { if (A.state.lastRecipe) E.fillRecipe(A.state.lastRecipe); } }, 'Again');
    bannerEl = el('div', { id: 'brewResult', hidden: true });
    var card = el('div', { class: 'card' },
      el('div', { class: 'h2' }, el('span', {}, 'Cauldron'), el('small', {}, 'order does not matter')),
      bannerEl,
      el('div', { class: 'pot-wrap' }, potEl),
      lineEl,
      el('div', { class: 'brew-actions' }, brewBtn, againBtn, el('button', { class: 'btn', onclick: function () { E.clearGrid(); } }, 'Empty')));
    panel.insertBefore(card, panel.firstChild);
    ['grid', 'recipes'].forEach(function (e) { A.bus.on(e, update); });
    A.bus.on('brewed', onBrewed);
    A.bus.on('confirmAscend', confirmAscend);
    A.bus.on('ascended', onAscended);
  };
})();
