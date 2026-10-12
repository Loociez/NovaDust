/* engine.js - all game rules. No DOM in here: it changes A.state and emits events on A.bus. */
(function () {
  var A = window.Alch;
  var E = A.engine = {};
  var monster = null, autoAcc = 0, buffClock = 0, toastClock = {};

  var S = function () { return A.state; };
  var cfg = function () { return A.data.config; };
  var emit = function (e, d) { A.bus.emit(e, d); };
  E.monster = function () { return monster; };

  E.toast = function (msg, kind) { emit('toast', { msg: msg, kind: kind || 'info' }); };
  E.toastOnce = function (msg, kind, ms) {
    var now = Date.now();
    if (toastClock[msg] && now - toastClock[msg] < (ms || 2500)) return;
    toastClock[msg] = now; E.toast(msg, kind);
  };

  /* ------------------------------------------------------------ stats */
  function upgSum(stat) {
    var s = 0;
    A.data.upgrades.forEach(function (u) { if (u.stat === stat) s += (S().upgrades[u.id] || 0) * u.add; });
    return s;
  }
  function gearSum(stat) {
    var s = 0, g = S().gear;
    for (var k in g) { var it = g[k] && A.data.itemById[g[k]]; if (it && it.bonus && it.bonus[stat]) s += it.bonus[stat]; }
    return s;
  }
  E.activeBuffs = function () { var n = Date.now(); return S().buffs.filter(function (b) { return b.until > n; }); };
  function buffAdd(stat) { return E.activeBuffs().reduce(function (a, b) { return a + (b.stat === stat && b.add ? b.add : 0); }, 0); }
  function buffMult(stat) { return E.activeBuffs().reduce(function (a, b) { return a * (b.stat === stat && b.mult ? b.mult : 1); }, 1); }

  E.clickPower = function () {
    var asc = 1 + S().ascensions * cfg().ascension.perClick;
    return Math.max(1, Math.round((1 + upgSum('click') + gearSum('click') + buffAdd('click')) * asc * buffMult('click')));
  };
  E.dropChance = function () {
    var c = cfg().clicking;
    return Math.min(c.dropCap, c.baseDrop + upgSum('drop') + gearSum('drop') + buffAdd('drop'));
  };
  E.coinMult = function () {
    return (1 + upgSum('coin') + gearSum('coin')) * (1 + S().ascensions * cfg().ascension.perCoin) * buffMult('coin');
  };
  E.apprentices = function () { return Math.round(upgSum('auto') + gearSum('auto')); };
  E.autoRate = function () { return E.apprentices() * buffMult('auto'); };
  E.slots = function () { return Math.round(cfg().start.slots + upgSum('slots')); };
  E.stackMax = function () { return Math.round(cfg().start.stack + upgSum('stack')); };

  /* ------------------------------------------------------------ inventory */
  function ensureInv() { var inv = S().inv, n = E.slots(); while (inv.length < n) inv.push(null); }
  E.countItem = function (id) { return S().inv.reduce(function (a, s) { return a + (s && s.id === id ? s.n : 0); }, 0); };
  E.freeSpace = function (id) {
    var max = E.stackMax(), room = 0;
    S().inv.forEach(function (s) { if (!s) room += max; else if (s.id === id) room += Math.max(0, max - s.n); });
    return room;
  };
  E.canAdd = function (id, n) { return E.freeSpace(id) >= (n || 1); };
  E.addItem = function (id, n) {
    ensureInv();
    var inv = S().inv, max = E.stackMax(), left = n || 1, added = 0, i;
    for (i = 0; i < inv.length && left > 0; i++) {
      if (inv[i] && inv[i].id === id && inv[i].n < max) { var t = Math.min(left, max - inv[i].n); inv[i].n += t; left -= t; added += t; }
    }
    for (i = 0; i < inv.length && left > 0; i++) {
      if (!inv[i]) { var t2 = Math.min(left, max); inv[i] = { id: id, n: t2 }; left -= t2; added += t2; }
    }
    if (added) emit('inv');
    return added;
  };
  E.removeAt = function (i, n) {
    var s = S().inv[i]; if (!s) return;
    s.n -= (n || 1); if (s.n <= 0) S().inv[i] = null;
    emit('inv');
  };
  E.usedSlots = function () { return S().inv.filter(Boolean).length; };

  /* ------------------------------------------------------------ monsters */
  E.spawn = function () {
    var s = S(), pool = A.data.monsters.filter(function (m) { return m.tier === s.zone; });
    if (!pool.length) pool = A.data.monsters;
    var bosses = pool.filter(function (m) { return m.boss; });
    var regular = pool.filter(function (m) { return !m.boss; });
    var k = s.zoneKills[s.zone] || 0, every = cfg().clicking.bossEvery;
    var def;
    if (bosses.length && k > 0 && k % every === 0) def = bosses[Math.floor(Math.random() * bosses.length)];
    else def = A.pickWeighted(regular.length ? regular : pool, function (m) { return m.weight || 1; });
    var hp = Math.max(1, Math.round(def.hp * (1 + s.ascensions * cfg().ascension.hpPerAscension)));
    monster = { def: def, hp: hp, maxHp: hp, dying: false, deadT: 0 };
    emit('monster', monster);
  };

  function rollDrop(m) {
    var d = A.pickWeighted(m.def.drops, function (x) { return x.w || 1; });
    if (!d) return;
    var added = E.addItem(d.item, 1);
    if (!added) { S().stats.lost++; E.toastOnce('Satchel full! Sell something or brew to make room.', 'warn'); }
    emit('drop', { id: d.item, ok: added > 0 });
  }

  function kill() {
    var m = monster, s = S(), c = cfg().clicking;
    m.dying = true; m.deadT = 0;
    var coins = Math.max(1, Math.round(m.def.coins * E.coinMult()));
    s.coins += coins; s.stats.earned += coins;
    var n = m.def.boss ? c.bossDrops : c.killDrops;
    for (var i = 0; i < n; i++) rollDrop(m);
    s.stats.kills++; s.zoneKills[s.zone] = (s.zoneKills[s.zone] || 0) + 1;
    emit('kill', { coins: coins, boss: !!m.def.boss, def: m.def });
    emit('coins');
  }

  E.hit = function (auto) {
    var m = monster; if (!m || m.dying) return;
    var dmg = E.clickPower();
    if (auto) dmg = Math.max(1, Math.round(dmg * cfg().clicking.apprenticePower));
    else S().stats.clicks++;
    m.hp = Math.max(0, m.hp - dmg);
    emit('hit', { dmg: dmg, auto: !!auto });
    if (Math.random() < E.dropChance()) rollDrop(m);
    if (m.hp <= 0) kill();
  };

  E.setZone = function (z) {
    var s = S();
    if (z > s.tier || z === s.zone || !A.data.tiers[z]) return;
    s.zone = z; E.spawn(); emit('zone');
  };

  /* ------------------------------------------------------------ items */
  E.sellValue = function (it, n) { return Math.round((it.value || 0) * (n || 1) * E.coinMult()); };
  E.sellAt = function (i, all) {
    var slot = S().inv[i]; if (!slot) return;
    var it = A.data.itemById[slot.id], n = all ? slot.n : 1;
    if (!it || !it.value) { E.toast("The merchant won't take that.", 'warn'); return; }
    var coins = E.sellValue(it, n);
    S().coins += coins; S().stats.sold += n; S().stats.earned += coins;
    E.removeAt(i, n); emit('coins'); emit('sold', { coins: coins, n: n, id: it.id });
  };
  E.useAt = function (i) {
    var slot = S().inv[i]; if (!slot) return;
    var it = A.data.itemById[slot.id];
    if (!it || !it.effect) { E.toast("Can't drink that. Try brewing it into something.", 'warn'); return; }
    var e = it.effect, now = Date.now(), ex = S().buffs.filter(function (b) { return b.item === it.id && b.until > now; })[0];
    if (ex) ex.until += e.secs * 1000;
    else S().buffs.push({ item: it.id, stat: e.stat, mult: e.mult || 0, add: e.add || 0, until: now + e.secs * 1000 });
    E.removeAt(i, 1); emit('buffs'); emit('used', { id: it.id });
  };

  /* ------------------------------------------------------------ cauldron */
  E.toGrid = function (invIndex) {
    var s = S(), slot = s.inv[invIndex]; if (!slot) return;
    var cell = s.grid.indexOf(null);
    if (cell < 0) { E.toastOnce('The cauldron is full.', 'warn'); return; }
    s.grid[cell] = slot.id; E.removeAt(invIndex, 1); emit('grid');
  };
  E.fromGrid = function (cell) {
    var s = S(), id = s.grid[cell]; if (!id) return;
    if (!E.canAdd(id)) { E.toastOnce('Satchel full.', 'warn'); return; }
    E.addItem(id, 1); s.grid[cell] = null; emit('grid');
  };
  E.clearGrid = function () {
    var s = S();
    for (var i = 0; i < s.grid.length; i++) if (s.grid[i] && E.canAdd(s.grid[i])) { E.addItem(s.grid[i], 1); s.grid[i] = null; }
    if (s.grid.some(Boolean)) E.toastOnce('Satchel full. Some items stayed in the cauldron.', 'warn');
    emit('grid');
  };
  E.gridCounts = function () {
    var c = {}; S().grid.forEach(function (id) { if (id) c[id] = (c[id] || 0) + 1; }); return c;
  };
  E.matchRecipe = function () {
    var c = E.gridCounts(), ck = Object.keys(c);
    if (!ck.length) return null;
    return A.data.recipes.filter(function (r) {
      var rk = Object.keys(r.ingredients);
      return rk.length === ck.length && rk.every(function (k) { return c[k] === r.ingredients[k]; });
    })[0] || null;
  };
  E.fillRecipe = function (rid) {
    var r = A.data.recipeById[rid]; if (!r) return false;
    E.clearGrid();
    if (S().grid.some(Boolean)) return false;
    var miss = [];
    Object.keys(r.ingredients).forEach(function (k) { if (E.countItem(k) < r.ingredients[k]) miss.push(k); });
    if (miss.length) { E.toast('Missing: ' + miss.map(function (k) { return A.data.itemById[k].name; }).join(', '), 'warn'); return false; }
    Object.keys(r.ingredients).forEach(function (k) {
      for (var n = 0; n < r.ingredients[k]; n++) {
        var i = S().inv.findIndex(function (s) { return s && s.id === k; });
        E.toGrid(i);
      }
    });
    return true;
  };

  E.brew = function () {
    var s = S(), total = s.grid.filter(Boolean).length;
    if (!total) { E.toastOnce('Put some ingredients in the cauldron first.', 'warn'); return; }
    var r = E.matchRecipe();
    if (!r) { return fizzle(); }
    if (r.kind === 'ascension') { emit('confirmAscend', r); return; }
    finishBrew(r);
  };

  function fizzle() {
    var s = S(), cc = cfg().crafting;
    s.stats.fizzled++;
    if (cc.failReturnsItems) { E.clearGrid(); emit('brewed', { fail: true }); return; }
    s.grid = s.grid.map(function () { return null; });
    var got = cc.failItem && E.addItem(cc.failItem, 1);
    emit('grid'); emit('brewed', { fail: true, out: got ? cc.failItem : null });
  }

  function finishBrew(r) {
    var s = S(), out = A.data.itemById[r.out], isNew = !s.known[r.id], replaced = null;
    if (!out) { E.toast('Recipe output missing: ' + r.out, 'warn'); return; }
    if (out.kind === 'relic') {
      replaced = s.gear[out.slot];
      if (replaced) {
        var old = A.data.itemById[replaced];
        var refund = Math.round((old.value || 0) * cfg().crafting.relicRefund);
        s.coins += refund; emit('coins');
      }
      s.gear[out.slot] = out.id;
    } else if (!E.canAdd(out.id, r.n || 1)) {
      E.toastOnce('Satchel full. Make room for the result first.', 'warn'); return;
    }
    s.grid = s.grid.map(function () { return null; });
    if (out.kind !== 'relic') E.addItem(out.id, r.n || 1);
    s.known[r.id] = true; s.stats.brewed++;
    emit('grid'); emit('gear'); emit('recipes');
    emit('brewed', { recipe: r, out: out.id, isNew: isNew, relic: out.kind === 'relic', replaced: replaced });
  }

  E.ascend = function (rid) {
    var s = S(), r = A.data.recipeById[rid]; if (!r) return;
    var newTier = Math.min(A.data.tiers.length - 1, r.tier + 1), unlocked = null;
    if (newTier > s.tier) { s.tier = newTier; unlocked = newTier; }
    s.known[r.id] = true; s.ascensions++;
    s.coins = cfg().start.coins; s.inv = []; s.grid = s.grid.map(function () { return null; });
    s.gear = { tool: null, charm: null, trinket: null }; s.upgrades = {}; s.buffs = [];
    s.zone = 0; s.zoneKills = {};
    ensureInv(); E.spawn(); A.save();
    emit('inv'); emit('grid'); emit('gear'); emit('coins'); emit('upgrades'); emit('buffs'); emit('zone'); emit('recipes');
    emit('ascended', { recipe: r, unlockedZone: unlocked, ascensions: s.ascensions });
  };

  /* ------------------------------------------------------------ upgrades */
  E.upgLevel = function (id) { return S().upgrades[id] || 0; };
  E.upgCost = function (u) { return Math.round(u.base * Math.pow(u.growth, E.upgLevel(u.id))); };
  E.buyUpgrade = function (id) {
    var u = A.data.upgradeById[id]; if (!u) return;
    if (E.upgLevel(id) >= u.max) return;
    var cost = E.upgCost(u);
    if (S().coins < cost) { E.toastOnce('Not enough coins.', 'warn'); return; }
    S().coins -= cost; S().upgrades[id] = E.upgLevel(id) + 1;
    ensureInv(); emit('coins'); emit('upgrades'); emit('inv'); emit('bought', { id: id });
  };

  /* ------------------------------------------------------------ loop */
  E.afterLoad = function () {
    var s = S();
    ensureInv();
    if (!A.data.tiers[s.tier]) s.tier = A.data.tiers.length - 1;
    if (s.zone > s.tier || !A.data.tiers[s.zone]) s.zone = 0;
    s.buffs = E.activeBuffs();
    E.spawn();
    ['inv', 'grid', 'gear', 'coins', 'upgrades', 'buffs', 'zone', 'recipes'].forEach(function (e) { emit(e); });
  };

  E.tick = function (dt) {
    var m = monster;
    if (m && m.dying) { m.deadT += dt; if (m.deadT >= 0.35) E.spawn(); }
    var rate = E.autoRate();
    if (rate > 0) {
      autoAcc += dt * rate;
      var n = 0;
      while (autoAcc >= 1 && n < 20) { autoAcc -= 1; E.hit(true); n++; }
      if (autoAcc > 20) autoAcc = 0;
    } else autoAcc = 0;
    buffClock += dt;
    if (buffClock >= 1) {
      buffClock = 0;
      var before = S().buffs.length;
      S().buffs = E.activeBuffs();
      if (S().buffs.length !== before) emit('buffs');
    }
  };
})();
