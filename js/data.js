/* data.js - turns window.ALCH_DATA (data/*.js) into lookups.
   If you used "Preview in game" in the editor, those edits override the shipped files. */
(function () {
  var A = window.Alch;
  var OVERRIDE_KEY = 'alchemist.dataOverride';

  A.loadData = function () {
    var d = A.clone(window.ALCH_DATA || {});
    A.usingOverride = false;
    var skip = /[?&]shipped=1/.test(location.search);
    try {
      var o = !skip && localStorage.getItem(OVERRIDE_KEY);
      if (o) { Object.assign(d, JSON.parse(o)); A.usingOverride = true; }
    } catch (e) { /* storage unavailable */ }

    d.itemById = {}; d.items.forEach(function (i) { d.itemById[i.id] = i; });
    d.recipeById = {}; d.recipes.forEach(function (r) { d.recipeById[r.id] = r; });
    d.monsterById = {}; d.monsters.forEach(function (m) { d.monsterById[m.id] = m; });
    d.upgradeById = {}; d.upgrades.forEach(function (u) { d.upgradeById[u.id] = u; });
    A.data = d;
    return d;
  };
  A.clearOverride = function () { try { localStorage.removeItem(OVERRIDE_KEY); } catch (e) {} };
  A.OVERRIDE_KEY = OVERRIDE_KEY;
})();
