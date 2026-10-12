/* sprites.js - spritesheet loading, cell maths, animated monster canvas */
(function () {
  var A = window.Alch;
  var S = A.sprites = { img: {}, ready: false };

  S.load = function (cfg) {
    var keys = Object.keys(cfg.sheets);
    return Promise.all(keys.map(function (k) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () { S.img[k] = im; res(); };
        im.onerror = function () { console.warn('Could not load', cfg.sheets[k].src); S.img[k] = null; res(); };
        im.src = cfg.sheets[k].src;
      });
    })).then(function () { S.ready = true; });
  };

  S.cellRect = function (sheetKey, idx) {
    var sh = A.data.config.sheets[sheetKey];
    return { sx: (idx % sh.cols) * sh.cell, sy: Math.floor(idx / sh.cols) * sh.cell, size: sh.cell };
  };
  S.monsterCell = function (sprite, frame) {
    return sprite * A.data.config.sheets.monsters.framesPerSprite + frame;
  };

  // CSS-only icon (used all over the DOM so no canvases are needed)
  S.cellStyle = function (sheetKey, idx, px) {
    var sh = A.data.config.sheets[sheetKey];
    var col = idx % sh.cols, row = Math.floor(idx / sh.cols);
    return 'width:' + px + 'px;height:' + px + 'px;background-image:url(' + sh.src + ');' +
      'background-size:' + (sh.cols * px) + 'px auto;background-position:-' + (col * px) + 'px -' + (row * px) + 'px;';
  };
  S.itemIcon = function (itemId, px) {
    var it = A.data.itemById[itemId];
    return A.el('i', { class: 'ico', style: S.cellStyle('items', it ? it.icon : 0, px || 40) });
  };
  S.monsterIcon = function (m, px, frame) {
    var f = frame != null ? frame : (m.idle && m.idle[0] != null ? m.idle[0] : 3);
    return A.el('i', { class: 'ico', style: S.cellStyle('monsters', S.monsterCell(m.sprite, f), px || 48) });
  };

  /* Animated monster on a canvas.  Used by the stage and by the editor preview. */
  function MonsterView(canvas, opts) {
    opts = opts || {};
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.def = null; this.t = 0; this.hitT = 0; this.shake = 0;
    this.pop = 1; this.dying = 0; this.fps = opts.fps; this.shadow = opts.shadow !== false;
  }
  MonsterView.prototype.setMonster = function (def, popIn) {
    this.def = def; this.t = 0; this.hitT = 0; this.dying = 0; this.pop = popIn ? 0 : 1;
  };
  MonsterView.prototype.hit = function () { this.hitT = A.data.config.render.hitMs / 1000; this.shake = 6; };
  MonsterView.prototype.die = function () { this.dying = 0.001; };
  MonsterView.prototype.update = function (dt) {
    this.t += dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    if (this.pop < 1) this.pop = Math.min(1, this.pop + dt * 5);
    if (this.dying > 0) this.dying += dt;
  };
  MonsterView.prototype.frame = function () {
    var d = this.def, rc = A.data.config.render;
    var idle = (d.idle && d.idle.length) ? d.idle : [3, 4];
    if (this.hitT > 0 && d.hit && d.hit.length) return d.hit[Math.floor(this.t * 12) % d.hit.length];
    return idle[Math.floor(this.t * (this.fps || rc.idleFps)) % idle.length];
  };
  MonsterView.prototype.draw = function () {
    var cv = this.cv, ctx = this.ctx, d = this.def, img = S.img.monsters;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!d || !img) return;
    var sh = A.data.config.sheets.monsters, scale = (d.scale || 1) * (cv.width / sh.cell);
    var r = S.cellRect('monsters', S.monsterCell(d.sprite, this.frame()));
    var size = sh.cell * scale;
    var fade = this.dying > 0 ? Math.max(0, 1 - this.dying / 0.35) : 1;
    var k = this.pop < 1 ? (0.6 + 0.4 * this.pop) : 1;
    var w = size * k * (this.dying > 0 ? (0.6 + 0.4 * fade) : 1);
    var hgt = w;
    var x = (cv.width - w) / 2 + (this.shake ? (Math.random() - .5) * this.shake : 0);
    var y = cv.height - hgt - cv.height * 0.06;
    ctx.imageSmoothingEnabled = false;
    if (this.shadow) {
      ctx.fillStyle = 'rgba(0,0,0,' + (0.28 * fade) + ')';
      ctx.beginPath(); ctx.ellipse(cv.width / 2, cv.height * 0.945, w * 0.32, w * 0.07, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = fade * (this.pop < 1 ? this.pop : 1);
    ctx.save();
    if (d.flip) { ctx.translate(cv.width, 0); ctx.scale(-1, 1); x = cv.width - x - w; }
    ctx.drawImage(img, r.sx, r.sy, r.size, r.size, x, y, w, hgt);
    ctx.restore();
    if (this.hitT > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };
  S.MonsterView = MonsterView;
})();
