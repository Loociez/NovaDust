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

  function perk(stat) {
    var s = 0;
    A.data.perks.forEach(function (p) { if (p.stat === stat) s += (S().perks[p.id] || 0) * p.add; });
    return s;
  }
  E.perk = perk;

  /* mastery: kills on a monster level it up (permanent) */
  E.kills = function (id) { return S().bestiary[id] || 0; };
  E.masteryLevel = function (id) {
    var k = E.kills(id), L = cfg().bestiary.levels, n = 0;
    while (n < L.length && k >= L[n]) n++;
    return n;
  };
  E.masteryPoints = function () {
    var t = 0; A.data.monsters.forEach(function (m) { t += E.masteryLevel(m.id); }); return t;
  };
  E.masteryGlobal = function () { return 1 + E.masteryPoints() * cfg().bestiary.globalPerLevel; };
  E.shinyCount = function () { return Object.keys(S().shinies).length; };

  E.clickPower = function () {
    var flat = 1 + upgSum('click') + gearSum('click') + buffAdd('click');
    var v = flat * (1 + upgSum('clickpct')) * (1 + perk('pclick')) * (1 + S().ascensions * cfg().ascension.perClick) * E.masteryGlobal() * buffMult('click');
    return Math.max(1, Math.round(v));
  };
  E.dropChance = function () {
    var c = cfg().clicking;
    return Math.min(c.dropCap, c.baseDrop + upgSum('drop') + gearSum('drop') + buffAdd('drop') + perk('pdrop'));
  };
  E.yieldChance = function () { return Math.min(0.95, gearSum('yield')); };
  E.critChance = function () { return Math.min(0.95, cfg().crit.baseChance + gearSum('crit') + perk('pcrit')); };
  E.critMult = function () { return cfg().crit.baseMult + perk('pcritdmg'); };
  E.coinMult = function () {
    return (1 + upgSum('coin') + gearSum('coin') + perk('pcoin')) * (1 + S().ascensions * cfg().ascension.perCoin) * E.masteryGlobal() * buffMult('coin');
  };
  E.apprentices = function () { return Math.round(upgSum('auto') + gearSum('auto') + perk('papprentice')); };
  E.autoRate = function () { return E.apprentices() * (1 + upgSum('autopct') + perk('pspeed')) * buffMult('auto'); };
  E.slots = function () { return Math.round(cfg().start.slots + upgSum('slots') + perk('pslots')); };
  E.stackMax = function () { return Math.round(cfg().start.stack + upgSum('stack') + perk('pstack')); };
  E.bossEvery = function () { return Math.max(2, cfg().clicking.bossEvery - perk('pboss')); };
  E.startCoins = function () { return Math.round(cfg().start.coins + perk('pstart') * 40 * Math.pow(3, S().tier)); };
  E.shinyChance = function () { return cfg().shiny.chance + perk('pshiny'); };
  E.essenceMult = function () { return (1 + perk('pessence')) * (1 + E.shinyCount() * cfg().essence.perShiny); };
  E.essenceGain = function (tier) {
    var c = cfg().essence;
    return Math.max(1, Math.floor((1 + Math.sqrt(S().runEarned) / c.divisor) * (1 + tier * c.tierMult) * E.essenceMult()));
  };
  function earn(coins) { S().coins += coins; S().stats.earned += coins; S().runEarned += coins; }

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
    var k = s.zoneKills[s.zone] || 0, every = E.bossEvery();
    var def;
    if (bosses.length && k > 0 && k % every === 0) def = bosses[Math.floor(Math.random() * bosses.length)];
    else def = A.pickWeighted(regular.length ? regular : pool, function (m) { return m.weight || 1; });
    var shiny = Math.random() < E.shinyChance();
    var hp = def.hp * (1 + s.ascensions * cfg().ascension.hpPerAscension) * (shiny ? cfg().shiny.hpMult : 1);
    hp = Math.max(1, Math.round(hp));
    monster = { def: def, hp: hp, maxHp: hp, dying: false, deadT: 0, shiny: shiny };
    emit('monster', monster);
  };

  function rollDrop(m, silent) {
    var d = A.pickWeighted(m.def.drops, function (x) { return x.w || 1; });
    if (!d) return;
    var added = E.addItem(d.item, 1);
    if (!added) { S().stats.lost++; E.toastOnce('Satchel full! Sell something or brew to make room.', 'warn'); }
    emit('drop', { id: d.item, ok: added > 0 });
    if (added && !silent && Math.random() < E.yieldChance()) rollDrop(m, true);
  }

  function kill() {
    var m = monster, s = S(), c = cfg(), id = m.def.id;
    m.dying = true; m.deadT = 0;
    var lvBefore = E.masteryLevel(id);
    var coins = m.def.coins * E.coinMult() * (1 + c.bestiary.coins * lvBefore) * (m.shiny ? c.shiny.coinMult : 1);
    coins = Math.max(1, Math.round(coins));
    earn(coins);
    var n = (m.def.boss ? c.clicking.bossDrops : c.clicking.killDrops) * (m.shiny ? c.shiny.dropMult : 1);
    for (var i = 0; i < n; i++) rollDrop(m);
    s.stats.kills++; s.zoneKills[s.zone] = (s.zoneKills[s.zone] || 0) + 1;
    s.bestiary[id] = (s.bestiary[id] || 0) + 1;
    var lvAfter = E.masteryLevel(id);
    var ess = 0, firstShiny = false;
    if (m.shiny) {
      firstShiny = !s.shinies[id];
      s.shinies[id] = (s.shinies[id] || 0) + 1; s.stats.shinies++;
      ess = Math.max(1, Math.round(c.shiny.essencePerZone * (s.zone + 1) * E.essenceMult()));
      s.essence += ess; s.stats.essence += ess;
      E.toast('Shiny ' + m.def.name + '! +' + ess + ' Essence' + (firstShiny ? ' (new, permanent Essence bonus)' : ''), 'good');
      emit('essence');
    }
    if (lvAfter > lvBefore) { E.toast(m.def.name + ' mastery ' + lvAfter + '! Permanent bonuses.', 'good'); emit('mastery'); }
    emit('kill', { coins: coins, boss: !!m.def.boss, def: m.def, shiny: !!m.shiny, essence: ess });
    emit('coins');
  }

  E.hit = function (auto) {
    var m = monster; if (!m || m.dying) return;
    var c = cfg(), id = m.def.id, lv = E.masteryLevel(id);
    var dmg = E.clickPower() * (1 + c.bestiary.dmg * lv);
    var crit = false;
    if (auto) dmg = dmg * c.clicking.apprenticePower;
    else {
      S().stats.clicks++;
      if (Math.random() < E.critChance()) { crit = true; dmg *= E.critMult(); S().stats.crits++; }
    }
    dmg = Math.max(1, Math.round(dmg));
    m.hp = Math.max(0, m.hp - dmg);
    emit('hit', { dmg: dmg, auto: !!auto, crit: crit });
    var chance = Math.min(c.clicking.dropCap, E.dropChance() + c.bestiary.drop * lv);
    if (Math.random() < chance) rollDrop(m);
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
    earn(coins); S().stats.sold += n;
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
    if (perk('pautosell') > 0) {
      var it0 = A.data.itemById[cc.failItem], c0 = Math.max(1, Math.round(((it0 && it0.value) || 1) * E.coinMult()));
      earn(c0); emit('coins'); emit('grid'); emit('brewed', { fail: true, out: null, recycled: c0 }); return;
    }
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
    var made = r.n || 1;
    if (out.kind === 'potion' && Math.random() < perk('pbatch')) made *= 2;
    if (out.kind !== 'relic') E.addItem(out.id, made);
    s.lastRecipe = r.id;
    s.known[r.id] = true; s.stats.brewed++;
    emit('grid'); emit('gear'); emit('recipes'); E.ensureOrders();
    emit('brewed', { recipe: r, out: out.id, isNew: isNew, relic: out.kind === 'relic', replaced: replaced, made: made });
  }

  E.ascend = function (rid) {
    var s = S(), r = A.data.recipeById[rid]; if (!r) return;
    var gain = E.essenceGain(r.tier);
    var newTier = Math.min(A.data.tiers.length - 1, r.tier + 1), unlocked = null;
    if (newTier > s.tier) { s.tier = newTier; unlocked = newTier; }
    s.known[r.id] = true; s.ascensions++;
    s.essence += gain; s.stats.essence += gain;
    s.inv = []; s.grid = s.grid.map(function () { return null; });
    s.gear = { tool: null, charm: null, trinket: null }; s.upgrades = {}; s.buffs = [];
    s.zone = 0; s.zoneKills = {}; s.runEarned = 0;
    s.coins = E.startCoins();
    ensureInv(); E.spawn(); E.ensureOrders(); A.save();
    ['inv', 'grid', 'gear', 'coins', 'upgrades', 'buffs', 'zone', 'recipes', 'essence'].forEach(function (e) { emit(e); });
    emit('ascended', { recipe: r, unlockedZone: unlocked, ascensions: s.ascensions, essence: gain });
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

  /* ------------------------------------------------------------ perks (Arcanum) */
  E.perkLevel = function (id) { return S().perks[id] || 0; };
  E.perkCost = function (p) { return Math.ceil(p.base * Math.pow(p.growth, E.perkLevel(p.id))); };
  E.buyPerk = function (id) {
    var p = A.data.perkById[id]; if (!p) return;
    if (E.perkLevel(id) >= p.max) return;
    var cost = E.perkCost(p);
    if (S().essence < cost) { E.toastOnce('Not enough Essence.', 'warn'); return; }
    S().essence -= cost; S().perks[id] = E.perkLevel(id) + 1;
    ensureInv(); emit('essence'); emit('perks'); emit('inv'); emit('upgrades'); emit('bought', { id: id });
  };

  /* ------------------------------------------------------------ orders (commissions) */
  E.takeItems = function (id, n) {
    var inv = S().inv, left = n;
    for (var i = 0; i < inv.length && left > 0; i++) {
      if (inv[i] && inv[i].id === id) { var t = Math.min(left, inv[i].n); inv[i].n -= t; left -= t; if (inv[i].n <= 0) inv[i] = null; }
    }
    emit('inv');
  };
  function genOrder(taken) {
    var s = S(), oc = cfg().orders;
    var pool = A.data.recipes.filter(function (r) {
      return r.kind === 'potion' && s.known[r.id] && r.tier <= s.tier && taken.indexOf(r.out) < 0 && A.data.itemById[r.out];
    });
    if (!pool.length) return null;
    var r = A.pickWeighted(pool, function (x) { return 1 + x.tier; });
    var it = A.data.itemById[r.out];
    var n = 1 + Math.floor(Math.random() * (2 + Math.min(3, r.tier)));
    return {
      id: 'o' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      item: it.id, n: n,
      coins: Math.round((it.value || 1) * n * oc.coinMult * (0.8 + Math.random() * 0.5)),
      essence: Math.max(1, Math.round(n * (r.tier + 1) * oc.essencePer))
    };
  }
  E.ensureOrders = function () {
    var s = S(), want = cfg().orders.slots, changed = false;
    s.orders = (s.orders || []).filter(function (o) { return o && A.data.itemById[o.item]; });
    while (s.orders.length < want) {
      var o = genOrder(s.orders.map(function (x) { return x.item; }));
      if (!o) break; s.orders.push(o); changed = true;
    }
    if (changed) emit('orders');
  };
  E.fulfillOrder = function (i) {
    var s = S(), o = s.orders[i]; if (!o) return;
    if (E.countItem(o.item) < o.n) { E.toastOnce('You need ' + o.n + ' ' + A.data.itemById[o.item].name + '.', 'warn'); return; }
    E.takeItems(o.item, o.n);
    var coins = Math.round(o.coins * E.coinMult());
    earn(coins); s.essence += o.essence; s.stats.essence += o.essence; s.stats.orders++;
    s.orders.splice(i, 1); E.ensureOrders();
    emit('coins'); emit('essence'); emit('orders'); emit('orderDone', { coins: coins, essence: o.essence });
  };
  E.dismissOrder = function (i) {
    var s = S(), now = Date.now();
    if (now < s.dismissAt) { E.toastOnce('The guild needs ' + Math.ceil((s.dismissAt - now) / 1000) + 's before another swap.', 'warn'); return; }
    s.orders.splice(i, 1); s.dismissAt = now + cfg().orders.dismissCooldownSec * 1000;
    E.ensureOrders(); emit('orders');
  };

  /* ------------------------------------------------------------ offline progress */
  // Apprentices keep working while you are away (capped, at reduced efficiency). Pure maths, no per-hit loop.
  E.offline = function () {
    var s = S(), oc = cfg().offline, now = Date.now();
    var away = (now - (s.savedAt || now)) / 1000, app = E.apprentices();
    if (away < 120 || app <= 0) return null;
    var cap = (oc.baseHours + perk('poffline')) * 3600, secs = Math.min(away, cap) * oc.efficiency;
    var pool = A.data.monsters.filter(function (m) { return m.tier === s.zone && !m.boss; });
    if (!pool.length) return null;
    var wTot = 0, hpAvg = 0, coinAvg = 0;
    pool.forEach(function (m) { var w = m.weight || 1; wTot += w; hpAvg += w * m.hp; coinAvg += w * m.coins; });
    hpAvg = hpAvg / wTot * (1 + s.ascensions * cfg().ascension.hpPerAscension); coinAvg /= wTot;
    var hits = secs * app * (1 + upgSum('autopct') + perk('pspeed'));
    var dmg = Math.max(1, Math.round(E.clickPower() * cfg().clicking.apprenticePower));
    var kills = Math.floor(hits * dmg / hpAvg);
    if (kills < 1) return null;
    var coins = Math.round(kills * coinAvg * E.coinMult());
    earn(coins);
    var rolls = hits * E.dropChance() + kills * cfg().clicking.killDrops;
    var draws = Math.min(Math.round(rolls), E.slots() * E.stackMax() * 2), scale = draws ? rolls / draws : 0, got = {}, lost = 0;
    for (var i = 0; i < draws; i++) {
      var m = A.pickWeighted(pool, function (x) { return x.weight || 1; });
      var d = A.pickWeighted(m.drops, function (x) { return x.w || 1; });
      got[d.item] = (got[d.item] || 0) + scale;
    }
    var items = [];
    Object.keys(got).forEach(function (id) {
      var n = Math.round(got[id]), added = n ? E.addItem(id, n) : 0;
      lost += n - added; if (added) items.push({ id: id, n: added });
    });
    pool.forEach(function (m) {
      var k = Math.floor(kills * (m.weight || 1) / wTot);
      if (k) s.bestiary[m.id] = (s.bestiary[m.id] || 0) + k;
    });
    s.zoneKills[s.zone] = (s.zoneKills[s.zone] || 0) + kills; s.stats.kills += kills;
    emit('coins'); emit('inv'); emit('mastery');
    return { away: away, counted: Math.min(away, cap), capped: away > cap, kills: kills, coins: coins, items: items, lost: lost };
  };

  /* ------------------------------------------------------------ loop */
  E.afterLoad = function () {
    var s = S();
    ensureInv();
    if (!A.data.tiers[s.tier]) s.tier = A.data.tiers.length - 1;
    if (s.zone > s.tier || !A.data.tiers[s.zone]) s.zone = 0;
    s.buffs = E.activeBuffs();
    E.spawn(); E.ensureOrders();
    ['inv', 'grid', 'gear', 'coins', 'upgrades', 'buffs', 'zone', 'recipes', 'essence', 'perks', 'orders'].forEach(function (e) { emit(e); });
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
