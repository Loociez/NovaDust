/* state.js - the single player state object + save / load */
(function () {
  var A = window.Alch;

  A.newState = function () {
    var c = A.data.config;
    return {
      v: 1,
      coins: c.start.coins,
      inv: [],                       // [{id, n} | null]
      grid: [null, null, null, null, null, null, null, null, null],
      gear: { tool: null, charm: null, trinket: null },
      upgrades: {},                  // id -> level
      buffs: [],                     // {item, stat, mult, add, until}
      tier: 0,                       // highest unlocked zone
      zone: 0,                       // zone currently farmed
      ascensions: 0,
      known: {},                     // recipeId -> true
      stats: { clicks: 0, kills: 0, brewed: 0, fizzled: 0, sold: 0, earned: 0, lost: 0 },
      zoneKills: {},
      savedAt: Date.now()
    };
  };

  A.save = function () {
    try {
      A.state.savedAt = Date.now();
      localStorage.setItem(A.data.config.save.key, JSON.stringify(A.state));
    } catch (e) { /* private mode etc. */ }
  };

  A.loadSave = function () {
    var s = A.newState();
    try {
      var raw = localStorage.getItem(A.data.config.save.key);
      if (raw) s = A.mergeSave(s, JSON.parse(raw));
    } catch (e) { console.warn('Save unreadable, starting fresh', e); }
    A.data.recipes.forEach(function (r) { if (r.known) s.known[r.id] = true; });
    return s;
  };

  // copy known keys over defaults so saves survive new fields / edited data
  A.mergeSave = function (base, saved) {
    Object.keys(base).forEach(function (k) {
      if (saved[k] === undefined) return;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = Object.assign(base[k], saved[k]);
      else base[k] = saved[k];
    });
    return base;
  };

  A.exportSave = function () { return btoa(unescape(encodeURIComponent(JSON.stringify(A.state)))); };
  A.importSave = function (txt) {
    var obj = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
    A.state = A.mergeSave(A.newState(), obj);
    A.data.recipes.forEach(function (r) { if (r.known) A.state.known[r.id] = true; });
    A.engine.afterLoad();
    A.save();
  };
  A.hardReset = function () {
    try { localStorage.removeItem(A.data.config.save.key); } catch (e) {}
    A.state = A.loadSave();
    A.engine.afterLoad();
  };
})();
