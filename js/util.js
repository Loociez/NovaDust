/* util.js - namespace, event bus, tiny DOM helpers */
(function () {
  var A = window.Alch = window.Alch || {};
  A.ui = A.ui || {};

  A.bus = {
    _h: {},
    on: function (e, f) { (this._h[e] = this._h[e] || []).push(f); },
    emit: function (e, d) { (this._h[e] || []).forEach(function (f) { f(d); }); }
  };

  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // el('div', {class:'x', onclick:fn, style:'..'}, child, 'text', ...)
  A.el = function (tag, attrs) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    var add = function (c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
    };
    for (var i = 2; i < arguments.length; i++) add(arguments[i]);
    return n;
  };

  A.fmt = function (n) {
    n = Math.floor(n);
    if (n < 10000) return String(n);
    var u = ['', 'K', 'M', 'B', 'T'], i = 0, x = n;
    while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
    return (x >= 100 ? x.toFixed(0) : x.toFixed(1)).replace(/\.0$/, '') + u[i];
  };
  A.pct = function (x) { return Math.round(x * 100) + '%'; };
  A.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  A.pickWeighted = function (arr, wf) {
    var t = 0, i;
    for (i = 0; i < arr.length; i++) t += wf(arr[i]);
    var r = Math.random() * t;
    for (i = 0; i < arr.length; i++) { r -= wf(arr[i]); if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  };
  A.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
})();
