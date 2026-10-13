/* ui/journal.js - stats, sound, save export/import, reset */
(function () {
  var A = window.Alch, el = A.el, E = A.engine;
  var T = A.ui.journal = {};
  var statsEl, soundBtn, area;

  function render() {
    var s = A.state, st = s.stats, known = Object.keys(s.known).length;
    var rows = [
      ['Zones unlocked', (s.tier + 1) + '/' + A.data.tiers.length],
      ['Recipes discovered', known + '/' + A.data.recipes.length],
      ['Ascensions', s.ascensions],
      ['Clicks', A.fmt(st.clicks)], ['Creatures harvested', A.fmt(st.kills)],
      ['Brews', st.brewed], ['Fizzles', st.fizzled],
      ['Critical hits', A.fmt(st.crits || 0)], ['Shiny kills', st.shinies || 0], ['Orders delivered', st.orders || 0],
      ['Essence earned (all time)', A.fmt(st.essence || 0)],
      ['Items sold', A.fmt(st.sold)], ['Items lost to a full satchel', A.fmt(st.lost)],
      ['Coins earned (all time)', A.fmt(st.earned)]
    ];
    statsEl.innerHTML = '';
    rows.forEach(function (r) { statsEl.appendChild(el('span', {}, r[0])); statsEl.appendChild(el('span', {}, String(r[1]))); });
    soundBtn.textContent = 'Sound: ' + (A.audio.settings.sound ? 'on' : 'off');
  }

  T.init = function () {
    var p = A.$('#panel-journal');
    statsEl = el('div', { class: 'rows' });
    soundBtn = el('button', { class: 'btn small', onclick: function () { A.audio.setSound(!A.audio.settings.sound); render(); } });
    area = el('textarea', { class: 'code', placeholder: 'Paste a save code here to import', spellcheck: 'false' });
    p.appendChild(el('div', { class: 'card' }, el('div', { class: 'h2' }, el('span', {}, 'Journal')), statsEl));
    var save = el('div', { class: 'card' },
      el('div', { class: 'h2' }, el('span', {}, 'Save')),
      el('div', { class: 'note' }, 'The game saves itself every few seconds. Use a save code to move progress between devices.'),
      area,
      el('div', { class: 'row-btns' },
        soundBtn,
        el('button', { class: 'btn small', onclick: function () { area.value = A.exportSave(); area.select(); E.toast('Save code ready. Copy it.', 'good'); } }, 'Export'),
        el('button', { class: 'btn small', onclick: function () {
          try { A.importSave(area.value); E.toast('Save imported.', 'good'); render(); } catch (e) { E.toast('That save code is not valid.', 'warn'); }
        } }, 'Import'),
        el('button', { class: 'btn small danger', onclick: function () {
          A.ui.confirm('Erase everything?', 'This deletes your save, recipes and unlocked zones.', 'Erase', function () { A.hardReset(); render(); }, true);
        } }, 'Erase save')));
    p.appendChild(save);
    var dev = el('div', { class: 'card' },
      el('div', { class: 'h2' }, el('span', {}, 'Game data')),
      el('div', { class: 'note' }, A.usingOverride
        ? 'You are playing with edits previewed from the editor.'
        : 'Monsters, items, recipes and upgrades live in the data folder. Open editor.html to change them.'));
    if (A.usingOverride) dev.appendChild(el('div', { class: 'row-btns' }, el('button', { class: 'btn small', onclick: function () { A.clearOverride(); location.reload(); } }, 'Use shipped data')));
    p.appendChild(dev);
    render();
    ['tab', 'kill', 'brewed', 'recipes', 'ascended'].forEach(function (e) { A.bus.on(e, function () { if (A.ui.tab === 'journal') render(); }); });
  };
})();
