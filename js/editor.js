/* editor.js - edits everything in data/*.js. Works from file:// (no server needed).
   Save options: write straight into your project folder (Chrome/Edge), download each file, or download a zip. */
(function () {
  var A = window.Alch, el = A.el, S = A.sprites;
  var FILES = ['config', 'tiers', 'items', 'monsters', 'recipes', 'upgrades', 'perks'];
  var HEAD = {
    config: '// Global game settings. Every number here is safe to tweak.',
    tiers: '// Zones. Brewing a zone\'s "ascension" recipe unlocks the next one for good.\n// sky = [top, bottom] backdrop colours, ground = floor colour.',
    items: '// kind: ingredient | potion | relic | stone | junk | ui\n// potion -> effect { stat, secs, mult | add }   (stat: click | drop | coin | auto)\n// relic  -> slot (tool | charm | trinket), bonus { click, drop, coin, auto, yield, crit }\n// icon   -> cell number in assets/items.png (32 per row, 32x32 each)',
    monsters: '// Monsters. sprite = sprite number in assets/player.png (12 frames each).\n// Frames 0-2 face away, 3-5 face front, 6-8 and 9-11 face the sides: [idle, idle, attack].\n// idle = frames looped while waiting, hit = frames shown when clicked.\n// tier = zone it lives in. weight = spawn chance. boss = spawns every N kills. drops = { item, w }.',
    recipes: '// Recipes. Order on the grid does not matter. kind: potion | relic | ascension.\n// ingredients = { itemId: count }. out = item id produced. known = true to start discovered.',
    upgrades: '// Coin upgrades (reset on ascension). cost = base * growth^level.\n// stat: click | clickpct | drop | coin | auto | autopct | slots | stack. Each level adds `add`. icon = an item id.',
    perks: '// Arcanum perks: permanent, bought with Essence (earned by ascending). cost = ceil(base * growth^level).\n// stat: pclick pcoin pdrop pslots pstack papprentice pspeed pcrit pcritdmg pstart pshiny pbatch pessence poffline pboss pautosell'
  };
  var ARRAYS = ['tiers', 'items', 'monsters', 'recipes', 'upgrades', 'perks'];
  var D = {}, dirty = {}, tab = 'monsters', selIdx = {}, filter = {}, handles = null;
  var anim = null; // running monster preview

  /* ------------------------------------------------------------ helpers */
  function toast(m, k) { var b = A.$('#toasts'); var t = el('div', { class: 'toast ' + (k || '') }, m); b.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
  function reindex() {
    D.itemById = {}; D.items.forEach(function (i) { D.itemById[i.id] = i; });
    D.recipeById = {}; D.recipes.forEach(function (r) { D.recipeById[r.id] = r; });
    D.monsterById = {}; D.monsters.forEach(function (m) { D.monsterById[m.id] = m; });
    D.upgradeById = {}; D.upgrades.forEach(function (u) { D.upgradeById[u.id] = u; });
  }
  function mark(k) { dirty[k] = true; reindex(); A.$$('#edTabs button').forEach(function (b) { if (b.dataset.k === k) b.classList.add('dirty'); }); }
  function clearDirty() { dirty = {}; A.$$('#edTabs button').forEach(function (b) { b.classList.remove('dirty'); }); }

  function serialize(k) {
    var v = D[k], body;
    if (ARRAYS.indexOf(k) >= 0) body = 'ALCH_DATA.' + k + ' = [\n' + v.map(function (x) { return '  ' + JSON.stringify(x); }).join(',\n') + '\n];\n';
    else body = 'ALCH_DATA.' + k + ' = ' + JSON.stringify(v, null, 2) + ';\n';
    return 'window.ALCH_DATA = window.ALCH_DATA || {};\n' + HEAD[k] + '\n' + body;
  }
  function parseFile(txt) {
    var m = /ALCH_DATA\.(\w+)\s*=\s*/.exec(txt); if (!m) throw new Error('no ALCH_DATA assignment');
    var start = m.index + m[0].length, end = txt.lastIndexOf(';');
    return { key: m[1], value: JSON.parse(txt.slice(start, end > start ? end : undefined)) };
  }

  /* zip (store only) */
  var crcT = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0;
    function u16(n) { return [n & 255, (n >> 8) & 255]; } function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      var lh = [0x50, 0x4b, 3, 4].concat(u16(20), u16(0x800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(lh), name, data);
      cd.push([0x50, 0x4b, 1, 2].concat(u16(20), u16(20), u16(0x800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)), name);
      off += lh.length + name.length + data.length;
    });
    var cdSize = 0; cd.forEach(function (p) { cdSize += p.length; });
    var cdParts = cd.map(function (p) { return p instanceof Uint8Array ? p : new Uint8Array(p); });
    var end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0].concat(u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)));
    return new Blob(parts.concat(cdParts, [end]), { type: 'application/zip' });
  }
  function download(name, blob) {
    var a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ------------------------------------------------------------ top actions */
  function actions() {
    var box = A.$('#edActions'); box.innerHTML = '';
    var fileIn = el('input', { type: 'file', multiple: true, accept: '.js', hidden: true, onchange: function () {
      Array.prototype.forEach.call(fileIn.files, function (f) {
        var r = new FileReader();
        r.onload = function () {
          try { var p = parseFile(r.result); if (FILES.indexOf(p.key) < 0) throw new Error('unknown data file ' + p.key); D[p.key] = p.value; reindex(); mark(p.key); toast('Loaded ' + f.name, 'good'); show(); }
          catch (e) { toast(f.name + ': ' + e.message, 'warn'); }
        };
        r.readAsText(f);
      });
      fileIn.value = '';
    } });
    var b = function (label, fn, cls) { return el('button', { class: 'btn small ' + (cls || ''), onclick: fn }, label); };
    box.appendChild(fileIn);
    box.appendChild(b('Load files', function () { fileIn.click(); }));
    box.appendChild(b('Check data', checkData));
    box.appendChild(b('Preview in game', previewInGame));
    box.appendChild(b('Download zip', function () { download('data.zip', makeZip(FILES.map(function (k) { return { name: 'data/' + k + '.js', data: serialize(k) }; }))); toast('data.zip downloaded. Unzip over your project.', 'good'); }));
    if (window.showDirectoryPicker) box.appendChild(b('Save to project folder', saveToFolder, 'primary'));
    else box.appendChild(b('Download changed files', function () { var any = false; FILES.forEach(function (k) { if (dirty[k]) { any = true; download(k + '.js', new Blob([serialize(k)], { type: 'text/javascript' })); } }); if (!any) toast('Nothing changed.'); }, 'primary'));
  }
  function saveToFolder() {
    var go = function (root) {
      root.getDirectoryHandle('data', { create: true }).then(function (dir) {
        return Promise.all(FILES.map(function (k) {
          return dir.getFileHandle(k + '.js', { create: true }).then(function (fh) { return fh.createWritable(); }).then(function (w) { return w.write(serialize(k)).then(function () { return w.close(); }); });
        }));
      }).then(function () { clearDirty(); toast('Saved to the data folder.', 'good'); }).catch(function (e) { toast('Save failed: ' + e.message, 'warn'); });
    };
    if (handles) return go(handles);
    window.showDirectoryPicker({ mode: 'readwrite' }).then(function (h) { handles = h; go(h); }).catch(function () {});
  }
  function previewInGame() {
    var o = {}; FILES.forEach(function (k) { o[k] = D[k]; });
    try { localStorage.setItem(A.OVERRIDE_KEY, JSON.stringify(o)); toast('Preview saved. Opening game.', 'good'); window.open('index.html', '_blank'); }
    catch (e) { toast('Browser storage is blocked here.', 'warn'); }
  }
  function checkData() {
    var out = [], err = function (m) { out.push(m); };
    var ids = {};
    ['items', 'monsters', 'recipes', 'upgrades', 'perks'].forEach(function (k) {
      ids = {}; D[k].forEach(function (x) { if (!x.id) err(k + ': a row has no id'); else if (ids[x.id]) err(k + ': duplicate id "' + x.id + '"'); ids[x.id] = 1; });
    });
    var sheet = D.config.sheets.monsters, maxSprite = Math.ceil(((S.img.monsters ? S.img.monsters.width : 1024) / sheet.cell) * ((S.img.monsters ? S.img.monsters.height : 1024) / sheet.cell) / sheet.framesPerSprite) - 1;
    D.monsters.forEach(function (m) {
      if (m.sprite > maxSprite || m.sprite < 0) err('monster ' + m.id + ': sprite ' + m.sprite + ' is outside the sheet (0-' + maxSprite + ')');
      if (!D.tiers[m.tier]) err('monster ' + m.id + ': zone ' + m.tier + ' does not exist');
      if (!(m.drops || []).length) err('monster ' + m.id + ': has no drops');
      (m.drops || []).forEach(function (d) { if (!D.itemById[d.item]) err('monster ' + m.id + ': drops unknown item "' + d.item + '"'); });
    });
    var sigs = {};
    D.recipes.forEach(function (r) {
      if (!D.itemById[r.out]) err('recipe ' + r.id + ': output "' + r.out + '" is not an item');
      var tot = 0; Object.keys(r.ingredients).forEach(function (k) { tot += r.ingredients[k]; if (!D.itemById[k]) err('recipe ' + r.id + ': unknown ingredient "' + k + '"'); });
      if (tot > 9) err('recipe ' + r.id + ' needs ' + tot + ' items but the cauldron holds 9');
      if (!tot) err('recipe ' + r.id + ' has no ingredients');
      var sig = Object.keys(r.ingredients).sort().map(function (k) { return k + 'x' + r.ingredients[k]; }).join(',');
      if (sigs[sig]) err('recipes ' + sigs[sig] + ' and ' + r.id + ' use the same ingredients'); sigs[sig] = r.id;
    });
    var dropped = {}; D.monsters.forEach(function (m) { (m.drops || []).forEach(function (d) { dropped[d.item] = 1; }); });
    D.items.forEach(function (i) { if (i.kind === 'ingredient' && !dropped[i.id]) err('ingredient "' + i.id + '" is never dropped by any monster'); });
    D.tiers.forEach(function (t, i) {
      if (!D.recipes.some(function (r) { return r.kind === 'ascension' && r.tier === i; })) err('zone ' + i + ' (' + t.name + ') has no ascension recipe');
      if (!D.monsters.some(function (m) { return m.tier === i; })) err('zone ' + i + ' (' + t.name + ') has no monsters');
    });
    D.upgrades.forEach(function (u) { if (!D.itemById[u.icon]) err('upgrade ' + u.id + ': icon item "' + u.icon + '" not found'); });
    (D.perks || []).forEach(function (u) { if (!D.itemById[u.icon]) err('perk ' + u.id + ': icon item "' + u.icon + '" not found'); });
    D.items.forEach(function (i) { if (i.kind === 'relic' && !i.slot) err('relic ' + i.id + ' has no slot'); });
    var list = el('ul', { class: 'problems' });
    if (!out.length) list = el('ul', { class: 'problems' }, el('li', { class: 'ok' }, 'No problems found.'));
    else out.forEach(function (m) { list.appendChild(el('li', { class: 'err' }, m)); });
    modal(el('div', { class: 'dialog' }, el('h3', {}, 'Data check'), list, el('div', { class: 'row-btns' }, el('button', { class: 'btn primary', onclick: closeModal }, 'Close'))));
  }

  function modal(n) { var m = A.$('#edModal'); m.innerHTML = ''; m.appendChild(n); m.hidden = false; m.onclick = function (e) { if (e.target === m) closeModal(); }; }
  function closeModal() { var m = A.$('#edModal'); m.hidden = true; m.innerHTML = ''; }

  /* ------------------------------------------------------------ form builders */
  function field(label, input, wide) { return el('label', { class: 'field' + (wide ? ' wide' : '') }, label, input); }
  function txt(obj, key, k, opts) {
    opts = opts || {};
    return field(opts.label || key, el('input', { type: 'text', value: obj[key] == null ? '' : obj[key], oninput: function (e) { obj[key] = e.target.value; mark(k); if (opts.live) opts.live(); }, onchange: function () { if (opts.refresh) show(); } }), opts.wide);
  }
  function num(obj, key, k, opts) {
    opts = opts || {};
    return field(opts.label || key, el('input', { type: 'number', step: opts.step || 'any', value: obj[key] == null ? '' : obj[key], oninput: function (e) {
      var v = e.target.value; if (v === '') { if (opts.optional) delete obj[key]; else obj[key] = 0; } else obj[key] = Number(v); mark(k);
    } }));
  }
  function bool(obj, key, k, label) { return field(label || key, el('input', { type: 'checkbox', checked: !!obj[key], onchange: function (e) { if (e.target.checked) obj[key] = true; else delete obj[key]; mark(k); } })); }
  function sel(obj, key, k, options, label, refresh) {
    var s = el('select', { onchange: function (e) { var v = e.target.value; obj[key] = (typeof options[0] === 'object' && typeof options[0].v === 'number') ? Number(v) : v; mark(k); if (refresh) show(); } });
    options.forEach(function (o) { var v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; var op = el('option', { value: v }, l); if (String(obj[key]) === String(v)) op.selected = true; s.appendChild(op); });
    return field(label || key, s);
  }
  function itemOpts(filterFn) { return D.items.filter(filterFn || function () { return true; }).map(function (i) { return { v: i.id, l: i.name + ' (' + i.id + ')' }; }); }
  function tierOpts() { return D.tiers.map(function (t, i) { return { v: i, l: i + ': ' + t.name }; }); }

  function pickSprite(m, k) {
    var cell = D.config.sheets.monsters, img = S.img.monsters;
    var total = img ? Math.ceil((img.width / cell.cell) * (img.height / cell.cell) / cell.framesPerSprite) : 0;
    var grid = el('div', { class: 'picker sprites' });
    for (var i = 0; i < total; i++) (function (i) {
      grid.appendChild(el('button', { class: i === m.sprite ? 'cur' : '', title: 'Sprite ' + i, onclick: function () { m.sprite = i; mark(k); closeModal(); show(); } },
        el('i', { class: 'ico', style: S.cellStyle('monsters', S.monsterCell(i, 3), 56) }), String(i)));
    })(i);
    modal(el('div', { class: 'dialog' }, el('h3', {}, 'Choose a sprite'), grid, el('div', { class: 'row-btns' }, el('button', { class: 'btn', onclick: closeModal }, 'Cancel'))));
  }
  function pickIcon(obj, key, k) {
    var sh = D.config.sheets.items, img = S.img.items;
    var total = img ? (img.width / sh.cell) * (img.height / sh.cell) : 0;
    var grid = el('div', { class: 'picker icons' });
    for (var i = 0; i < total; i++) (function (i) {
      grid.appendChild(el('button', { class: i === obj[key] ? 'cur' : '', onclick: function () { obj[key] = i; mark(k); closeModal(); show(); } }, el('i', { class: 'ico', style: S.cellStyle('items', i, 40) }), String(i)));
    })(i);
    modal(el('div', { class: 'dialog' }, el('h3', {}, 'Choose an icon'), el('p', { class: 'note' }, 'Cells of assets/items.png, left to right, top to bottom.'), grid, el('div', { class: 'row-btns' }, el('button', { class: 'btn', onclick: closeModal }, 'Cancel'))));
  }

  /* ------------------------------------------------------------ list + form frame */
  function listTab(k, cfg) {
    var arr = D[k], i = Math.min(selIdx[k] || 0, arr.length - 1); if (i < 0) i = 0; selIdx[k] = i;
    var q = filter[k] || '';
    var list = el('div', { class: 'list' });
    var search = el('input', { type: 'search', placeholder: 'Filter', value: q, oninput: function (e) { filter[k] = e.target.value; renderRows(); } });
    var rows = el('div');
    function renderRows() {
      rows.innerHTML = '';
      arr.forEach(function (x, n) {
        var label = cfg.label(x);
        if (filter[k] && (label + ' ' + (x.id || '')).toLowerCase().indexOf(filter[k].toLowerCase()) < 0) return;
        rows.appendChild(el('button', { class: 'li' + (n === selIdx[k] ? ' on' : ''), onclick: function () { selIdx[k] = n; show(); } }, cfg.icon ? cfg.icon(x) : null, label, el('span', { class: 'sub' }, cfg.sub ? cfg.sub(x) : '')));
      });
    }
    list.appendChild(el('div', { class: 'list-tools' }, search,
      el('button', { class: 'btn small', title: 'Add new', onclick: function () { arr.push(cfg.blank(arr)); selIdx[k] = arr.length - 1; mark(k); show(); } }, '+')));
    renderRows(); list.appendChild(rows);
    var form = el('div', { class: 'form' });
    var cur = arr[i];
    if (cur) {
      cfg.form(form, cur, k);
      var tools = el('div', { class: 'row-btns' },
        el('button', { class: 'btn small', onclick: function () { var c = A.clone(cur); c.id = (c.id || 'copy') + '_copy'; if (c.name) c.name += ' copy'; arr.splice(i + 1, 0, c); selIdx[k] = i + 1; mark(k); show(); } }, 'Duplicate'),
        el('button', { class: 'btn small danger', onclick: function () {
          if (k === 'tiers' && i !== arr.length - 1) { toast('Only the last zone can be deleted.', 'warn'); return; }
          arr.splice(i, 1); selIdx[k] = Math.max(0, i - 1); mark(k); show();
        } }, 'Delete'));
      form.appendChild(tools);
    } else form.appendChild(el('p', { class: 'help' }, 'Nothing here yet. Press + to add one.'));
    return el('div', { class: 'split' }, list, form);
  }

  /* ------------------------------------------------------------ tabs */
  var TABS = {
    sprites: { label: 'Sprites', render: spritesTab },
    monsters: { label: 'Monsters', render: function () { return listTab('monsters', MON); } },
    items: { label: 'Items', render: function () { return listTab('items', ITM); } },
    recipes: { label: 'Recipes', render: function () { return listTab('recipes', REC); } },
    tiers: { label: 'Zones', render: function () { return listTab('tiers', TIER); } },
    upgrades: { label: 'Upgrades', render: function () { return listTab('upgrades', UPG); } },
    perks: { label: 'Perks', render: function () { return listTab('perks', PRK); } },
    config: { label: 'Config', render: configTab }
  };

  /* ---- monsters */
  var frameMode = 'idle';
  var MON = {
    label: function (m) { return m.name || m.id; },
    icon: function (m) { return S.monsterIcon(m, 32); },
    sub: function (m) { return (m.boss ? 'boss ' : '') + 'z' + m.tier; },
    blank: function () { return { id: 'new_monster_' + (D.monsters.length + 1), name: 'New Monster', sprite: 0, tier: 0, hp: 10, coins: 2, weight: 5, idle: [3, 4], hit: [5], drops: [{ item: D.items[0].id, w: 5 }] }; },
    form: function (f, m, k) {
      var cv = el('canvas', { width: 192, height: 192 });
      var strip = el('div', { class: 'strip' });
      function parseF(s) { return String(s).split(/[ ,]+/).filter(function (x) { return x !== '' && !isNaN(x); }).map(Number); }
      function drawStrip() {
        strip.innerHTML = '';
        for (var n = 0; n < 12; n++) (function (n) {
          var cls = (m.idle || []).indexOf(n) >= 0 ? ' idle' : ''; cls += (m.hit || []).indexOf(n) >= 0 ? ' hit' : '';
          strip.appendChild(el('button', { class: cls, title: 'Frame ' + n, onclick: function () {
            var key = frameMode, a = (m[key] || []).slice(), at = a.indexOf(n);
            if (at >= 0) a.splice(at, 1); else a.push(n);
            a.sort(function (x, y) { return x - y; }); m[key] = a; mark(k); show();
          } }, el('i', { class: 'n' }, n), el('i', { class: 'ico', style: S.cellStyle('monsters', S.monsterCell(m.sprite, n), 48) })));
        })(n);
      }
      drawStrip();
      var dirSel = el('select', { onchange: function (e) { var d = Number(e.target.value); if (d < 0) return; m.idle = [d * 3, d * 3 + 1]; m.hit = [d * 3 + 2]; mark(k); show(); } },
        el('option', { value: -1 }, 'Set frames from direction...'), el('option', { value: 0 }, 'Facing away'), el('option', { value: 1 }, 'Facing front'), el('option', { value: 2 }, 'Side (A)'), el('option', { value: 3 }, 'Side (B)'));
      var modeSel = el('div', { class: 'modes' },
        el('button', { class: frameMode === 'idle' ? 'on' : '', onclick: function () { frameMode = 'idle'; show(); } }, 'Click sets idle'),
        el('button', { class: frameMode === 'hit' ? 'on' : '', onclick: function () { frameMode = 'hit'; show(); } }, 'Click sets hit'));
      f.appendChild(el('div', { class: 'preview' }, cv,
        el('div', {}, el('div', { class: 'legend' }, 'All 12 frames of this sprite. ', el('b', { class: 'g' }, 'Green'), ' = idle loop, ', el('b', { class: 'e' }, 'orange'), ' = hit.'), strip, el('div', { style: 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap' }, modeSel, dirSel))));
      startPreview(cv, m);
      var fl = el('div', { class: 'fields' });
      fl.appendChild(txt(m, 'id', k, { refresh: true })); fl.appendChild(txt(m, 'name', k, { live: function () { } }));
      fl.appendChild(field('sprite', el('div', { class: 'pick' }, S.monsterIcon(m, 40), el('button', { class: 'btn small', onclick: function () { pickSprite(m, k); } }, 'Sprite ' + m.sprite + '...'))));
      fl.appendChild(sel(m, 'tier', k, tierOpts(), 'zone'));
      fl.appendChild(num(m, 'hp', k)); fl.appendChild(num(m, 'coins', k)); fl.appendChild(num(m, 'weight', k));
      fl.appendChild(bool(m, 'boss', k, 'boss')); fl.appendChild(bool(m, 'flip', k, 'flip horizontally'));
      fl.appendChild(num(m, 'scale', k, { optional: true, label: 'scale (blank = 1)', step: 0.1 }));
      fl.appendChild(field('idle frames', el('input', { type: 'text', value: (m.idle || []).join(', '), onchange: function (e) { m.idle = parseF(e.target.value); mark(k); show(); } })));
      fl.appendChild(field('hit frames', el('input', { type: 'text', value: (m.hit || []).join(', '), onchange: function (e) { m.hit = parseF(e.target.value); mark(k); show(); } })));
      f.appendChild(fl);
      f.appendChild(el('div', { class: 'sub-h' }, el('span', {}, 'Drops'), el('button', { class: 'btn small', onclick: function () { m.drops.push({ item: D.items[0].id, w: 1 }); mark(k); show(); } }, '+ drop')));
      (m.drops = m.drops || []).forEach(function (d, n) {
        var s = el('select', { onchange: function (e) { d.item = e.target.value; mark(k); show(); } });
        itemOpts().forEach(function (o) { var op = el('option', { value: o.v }, o.l); if (o.v === d.item) op.selected = true; s.appendChild(op); });
        f.appendChild(el('div', { class: 'rowline pre' }, S.itemIcon(d.item, 28), s,
          el('input', { type: 'number', value: d.w, title: 'weight', oninput: function (e) { d.w = Number(e.target.value); mark(k); } }),
          el('button', { class: 'btn small danger', onclick: function () { m.drops.splice(n, 1); mark(k); show(); } }, 'x')));
      });
    }
  };

  function startPreview(cv, m) {
    stopPreview();
    var view = new S.MonsterView(cv); view.setMonster(m, false);
    var last = performance.now(), alive = true;
    function loop(now) {
      if (!alive) return; var dt = Math.min(0.1, (now - last) / 1000); last = now;
      view.t += dt; view.hitT -= dt; view.def = m;
      if (view.hitT <= -1.4) view.hitT = A.data.config.render.hitMs / 1000;   // show the hit frame now and then
      view.draw(); requestAnimationFrame(loop);
    }
    anim = { stop: function () { alive = false; } }; requestAnimationFrame(loop);
  }
  function stopPreview() { if (anim) { anim.stop(); anim = null; } }

  /* ---- items */
  var ITM = {
    label: function (i) { return i.name || i.id; },
    icon: function (i) { return S.itemIcon(i.id, 32); },
    sub: function (i) { return i.kind; },
    blank: function () { return { id: 'new_item_' + (D.items.length + 1), name: 'New Item', kind: 'ingredient', tier: 0, icon: 0, value: 1, desc: '' }; },
    form: function (f, it, k) {
      var fl = el('div', { class: 'fields' });
      fl.appendChild(txt(it, 'id', k, { refresh: true })); fl.appendChild(txt(it, 'name', k));
      fl.appendChild(sel(it, 'kind', k, ['ingredient', 'potion', 'relic', 'stone', 'junk', 'ui'], 'kind', true));
      fl.appendChild(sel(it, 'tier', k, tierOpts(), 'zone'));
      fl.appendChild(field('icon', el('div', { class: 'pick' }, S.itemIcon(it.id, 40), el('button', { class: 'btn small', onclick: function () { pickIcon(it, 'icon', k); } }, 'Icon ' + it.icon + '...'))));
      fl.appendChild(num(it, 'value', k, { label: 'sell value' }));
      fl.appendChild(txt(it, 'desc', k, { wide: true, label: 'description' }));
      f.appendChild(fl);
      if (it.kind === 'potion') {
        it.effect = it.effect || null;
        f.appendChild(el('div', { class: 'sub-h' }, el('span', {}, 'Potion effect'),
          it.effect ? el('button', { class: 'btn small danger', onclick: function () { delete it.effect; mark(k); show(); } }, 'Remove effect') : el('button', { class: 'btn small', onclick: function () { it.effect = { stat: 'click', secs: 60, mult: 2 }; mark(k); show(); } }, 'Add effect')));
        if (it.effect) {
          var e = it.effect, ef = el('div', { class: 'fields' });
          ef.appendChild(sel(e, 'stat', k, ['click', 'drop', 'coin', 'auto'], 'stat'));
          ef.appendChild(num(e, 'secs', k, { label: 'seconds' }));
          ef.appendChild(num(e, 'mult', k, { optional: true, label: 'multiplier (x)' }));
          ef.appendChild(num(e, 'add', k, { optional: true, label: 'flat add' }));
          f.appendChild(ef);
        } else delete it.effect;
      }
      if (it.kind === 'relic') {
        it.bonus = it.bonus || {};
        var rf = el('div', { class: 'fields' });
        rf.appendChild(sel(it, 'slot', k, ['tool', 'charm', 'trinket'], 'slot'));
        ['click', 'drop', 'coin', 'auto', 'yield', 'crit'].forEach(function (s) { rf.appendChild(num(it.bonus, s, k, { optional: true, label: 'bonus ' + s })); });
        f.appendChild(el('div', { class: 'sub-h' }, el('span', {}, 'Relic'))); f.appendChild(rf);
      }
    }
  };

  /* ---- recipes */
  var REC = {
    label: function (r) { return r.name || r.id; },
    icon: function (r) { return S.itemIcon(r.out, 32); },
    sub: function (r) { return r.kind + ' z' + r.tier; },
    blank: function () { return { id: 'r_new_' + (D.recipes.length + 1), name: 'New Recipe', kind: 'potion', tier: 0, out: D.items[0].id, ingredients: {}, hint: '' }; },
    form: function (f, r, k) {
      var fl = el('div', { class: 'fields' });
      fl.appendChild(txt(r, 'id', k)); fl.appendChild(txt(r, 'name', k));
      fl.appendChild(sel(r, 'kind', k, ['potion', 'relic', 'ascension'], 'kind'));
      fl.appendChild(sel(r, 'tier', k, tierOpts(), 'zone'));
      fl.appendChild(sel(r, 'out', k, itemOpts(), 'produces', true));
      fl.appendChild(num(r, 'n', k, { optional: true, label: 'amount (blank = 1)' }));
      fl.appendChild(bool(r, 'known', k, 'known from the start'));
      fl.appendChild(txt(r, 'hint', k, { wide: true, label: 'hint shown before discovery' }));
      f.appendChild(fl);
      var tot = 0; Object.keys(r.ingredients).forEach(function (x) { tot += r.ingredients[x]; });
      f.appendChild(el('div', { class: 'sub-h' }, el('span', {}, 'Ingredients (' + tot + '/9 cauldron cells)'),
        el('button', { class: 'btn small', onclick: function () { var free = D.items.filter(function (i) { return !(i.id in r.ingredients); })[0]; if (free) { r.ingredients[free.id] = 1; mark(k); show(); } } }, '+ ingredient')));
      Object.keys(r.ingredients).forEach(function (id) {
        var s = el('select', { onchange: function (e) { var c = r.ingredients[id]; delete r.ingredients[id]; r.ingredients[e.target.value] = c; mark(k); show(); } });
        itemOpts().forEach(function (o) { var op = el('option', { value: o.v }, o.l); if (o.v === id) op.selected = true; s.appendChild(op); });
        f.appendChild(el('div', { class: 'rowline pre' }, S.itemIcon(id, 28), s,
          el('input', { type: 'number', min: 1, value: r.ingredients[id], oninput: function (e) { r.ingredients[id] = Math.max(1, Number(e.target.value) || 1); mark(k); } }),
          el('button', { class: 'btn small danger', onclick: function () { delete r.ingredients[id]; mark(k); show(); } }, 'x')));
      });
    }
  };

  /* ---- zones */
  var TIER = {
    label: function (t) { return t.id + ': ' + t.name; },
    sub: function () { return ''; },
    blank: function (arr) { return { id: arr.length, name: 'New Zone', blurb: '', sky: ['#222222', '#444444'], ground: '#1a1a1a' }; },
    form: function (f, t, k) {
      var fl = el('div', { class: 'fields' });
      fl.appendChild(txt(t, 'name', k)); fl.appendChild(txt(t, 'blurb', k, { wide: true }));
      t.sky = t.sky || ['#222222', '#444444'];
      fl.appendChild(field('sky top', el('input', { type: 'color', value: t.sky[0], oninput: function (e) { t.sky[0] = e.target.value; mark(k); } })));
      fl.appendChild(field('sky bottom', el('input', { type: 'color', value: t.sky[1], oninput: function (e) { t.sky[1] = e.target.value; mark(k); } })));
      fl.appendChild(field('ground', el('input', { type: 'color', value: t.ground || '#1a1a1a', oninput: function (e) { t.ground = e.target.value; mark(k); } })));
      f.appendChild(fl);
      f.appendChild(el('p', { class: 'help', style: 'margin-top:12px' }, 'A zone needs monsters (set a monster\'s zone), ingredients they drop, and one recipe of kind "ascension" in this zone. Brewing that recipe unlocks the next zone. Use "Check data" to verify.'));
    }
  };

  /* ---- upgrades */
  var UPG = {
    label: function (u) { return u.name; }, icon: function (u) { return D.itemById[u.icon] ? S.itemIcon(u.icon, 32) : null; }, sub: function (u) { return u.stat; },
    blank: function () { return { id: 'new_upgrade_' + (D.upgrades.length + 1), name: 'New Upgrade', desc: '', icon: 'ui_coin', stat: 'click', add: 1, base: 20, growth: 1.5, max: 10 }; },
    form: function (f, u, k) {
      var fl = el('div', { class: 'fields' });
      fl.appendChild(txt(u, 'id', k)); fl.appendChild(txt(u, 'name', k)); fl.appendChild(txt(u, 'desc', k, { wide: true }));
      fl.appendChild(sel(u, 'icon', k, itemOpts(), 'icon (item)', true));
      fl.appendChild(sel(u, 'stat', k, k === 'perks' ? ['pclick', 'pcoin', 'pdrop', 'pslots', 'pstack', 'papprentice', 'pspeed', 'pcrit', 'pcritdmg', 'pstart', 'pshiny', 'pbatch', 'pessence', 'poffline', 'pboss', 'pautosell'] : ['click', 'clickpct', 'drop', 'coin', 'auto', 'autopct', 'slots', 'stack']));
      fl.appendChild(num(u, 'add', k, { label: 'added per level' })); fl.appendChild(num(u, 'base', k, { label: 'base cost' }));
      fl.appendChild(num(u, 'growth', k, { label: 'cost growth (x per level)', step: 0.01 })); fl.appendChild(num(u, 'max', k, { label: 'max level' }));
      f.appendChild(fl);
      var preview = [0, 1, 2, 5, 10].filter(function (l) { return l < u.max; }).map(function (l) { return 'lv ' + l + '->' + (l + 1) + ': ' + Math.round(u.base * Math.pow(u.growth, l)); }).join('   ');
      f.appendChild(el('p', { class: 'help', style: 'margin-top:12px' }, 'Costs: ' + preview + (k === 'perks' ? '  (Essence)' : '  (coins)')));
    }
  };
  var PRK = Object.assign({}, UPG, { blank: function () { return { id: 'p_new_' + (D.perks.length + 1), name: 'New Perk', desc: '', icon: 'ui_essence', stat: 'pclick', add: 0.05, base: 2, growth: 1.3, max: 20 }; }, sub: function (u) { return u.stat; } });

  /* ---- config (generic tree) */
  function configTab() {
    var wrap = el('div', { class: 'form' });
    wrap.appendChild(el('p', { class: 'help' }, 'Sheet paths, cell sizes, click rules and prestige bonuses. If you swap in a different spritesheet, change sheets.monsters here (cell size, columns, frames per sprite).'));
    function walk(obj, path, box) {
      Object.keys(obj).forEach(function (key) {
        var v = obj[key];
        if (v && typeof v === 'object') { var g = el('div', {}, el('div', { class: 'sub-h' }, el('span', {}, path + key))); var ff = el('div', { class: 'fields' }); g.appendChild(ff); box.appendChild(g); walk(v, path + key + '.', ff); }
        else if (typeof v === 'number') box.appendChild(num(obj, key, 'config', { label: path + key, step: 'any' }));
        else if (typeof v === 'boolean') box.appendChild(field(path + key, el('input', { type: 'checkbox', checked: v, onchange: function (e) { obj[key] = e.target.checked; mark('config'); } })));
        else box.appendChild(txt(obj, key, 'config', { label: path + key }));
      });
    }
    var root = el('div'); walk(D.config, '', root); wrap.appendChild(root);
    return wrap;
  }

  /* ---- sprite sheet browser */
  function spritesTab() {
    var img = S.img.monsters, sh = D.config.sheets.monsters;
    var wrap = el('div', { class: 'form' });
    wrap.appendChild(el('p', { class: 'help' }, 'Every sprite in assets/player.png. Each sprite is ' + sh.framesPerSprite + ' consecutive ' + sh.cell + 'x' + sh.cell + ' cells, counting left to right then top to bottom, starting at the top-left. ' +
      'Frames 0-2 face away, 3-5 face front, 6-8 and 9-11 face the sides. Within each group: idle, idle, attack. Click a sprite to see where it is used.'));
    if (!img) { wrap.appendChild(el('p', {}, 'Spritesheet not loaded.')); return wrap; }
    var total = Math.ceil((img.width / sh.cell) * (img.height / sh.cell) / sh.framesPerSprite);
    var used = {}; D.monsters.forEach(function (m) { (used[m.sprite] = used[m.sprite] || []).push(m.name); });
    var grid = el('div', { class: 'picker sprites', style: 'max-height:none' });
    for (var i = 0; i < total; i++) (function (i) {
      grid.appendChild(el('button', { class: used[i] ? 'cur' : '', title: used[i] ? 'Used by: ' + used[i].join(', ') : 'Unused', onclick: function () {
        var cv = el('canvas', { width: 192, height: 192, style: 'width:192px;height:192px;background:#2c3f3a;border:2px solid var(--line)' });
        var strip = el('div', { class: 'strip' }); for (var n = 0; n < 12; n++) strip.appendChild(el('button', {}, el('i', { class: 'n' }, n), el('i', { class: 'ico', style: S.cellStyle('monsters', S.monsterCell(i, n), 48) })));
        modal(el('div', { class: 'dialog' }, el('h3', {}, 'Sprite ' + i), el('div', { class: 'preview' }, strip), el('p', { class: 'note' }, used[i] ? 'Used by: ' + used[i].join(', ') : 'Not used by any monster yet.'),
          el('div', { class: 'row-btns' }, el('button', { class: 'btn primary', onclick: function () { D.monsters.push({ id: 'sprite_' + i + '_monster', name: 'Sprite ' + i, sprite: i, tier: 0, hp: 10, coins: 2, weight: 5, idle: [3, 4], hit: [5], drops: [{ item: D.items[0].id, w: 5 }] }); selIdx.monsters = D.monsters.length - 1; mark('monsters'); closeModal(); setTab('monsters'); } }, 'New monster from this sprite'), el('button', { class: 'btn', onclick: closeModal }, 'Close'))));
      } }, el('i', { class: 'ico', style: S.cellStyle('monsters', S.monsterCell(i, 3), 56) }), String(i)));
    })(i);
    wrap.appendChild(grid);
    wrap.appendChild(el('p', { class: 'note' }, 'Green outline = already used by a monster.'));
    return wrap;
  }

  /* ------------------------------------------------------------ shell */
  function setTab(t) { tab = t; show(); }
  function show() {
    stopPreview();
    var bar = A.$('#edTabs'); bar.innerHTML = '';
    Object.keys(TABS).forEach(function (t) {
      var b = el('button', { class: (t === tab ? 'on' : '') + (dirty[t] ? ' dirty' : ''), onclick: function () { setTab(t); } }, TABS[t].label); b.dataset.k = t; bar.appendChild(b);
    });
    var main = A.$('#edMain'), y = window.scrollY; main.innerHTML = '';
    main.appendChild(TABS[tab].render());
    window.scrollTo(0, y);
  }

  window.addEventListener('beforeunload', function (e) { if (Object.keys(dirty).length) { e.preventDefault(); e.returnValue = ''; } });

  function init() {
    FILES.forEach(function (k) { D[k] = A.clone(window.ALCH_DATA[k] || (ARRAYS.indexOf(k) >= 0 ? [] : {})); });
    A.data = D; reindex();
    actions();
    S.load(D.config).then(show);
    show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
