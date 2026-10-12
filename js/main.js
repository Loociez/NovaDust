/* main.js - boot + game loop */
(function () {
  var A = window.Alch;

  function boot() {
    A.loadData();
    A.sprites.load(A.data.config).then(function () {
      A.state = A.loadSave();
      A.ui.init();
      A.engine.afterLoad();

      var last = performance.now();
      function frame(now) {
        var dt = Math.min(0.1, (now - last) / 1000); last = now;
        A.engine.tick(dt);
        A.ui.stage.frame(dt);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      setInterval(A.save, A.data.config.save.autosaveSec * 1000);
      document.addEventListener('visibilitychange', function () { if (document.hidden) A.save(); });
      window.addEventListener('pagehide', A.save);
      ['brewed', 'ascended', 'bought', 'sold'].forEach(function (e) { A.bus.on(e, A.save); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
