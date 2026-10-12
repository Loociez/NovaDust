/* audio.js - tiny WebAudio blips (no sound files needed). Toggle lives in the Journal tab. */
(function () {
  var A = window.Alch, ctx = null, KEY = 'alchemist.settings';
  var cfg = { sound: true };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

  function tone(freq, dur, type, vol, slide, delay) {
    if (!cfg.sound) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
      g.gain.setValueAtTime(vol || 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  A.audio = {
    settings: cfg,
    setSound: function (v) { cfg.sound = v; try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} },
    play: function (n) {
      if (n === 'hit') tone(180 + Math.random() * 60, 0.07, 'square', 0.04, 90);
      else if (n === 'drop') { tone(660, 0.07, 'triangle', 0.05); tone(990, 0.09, 'triangle', 0.05, null, 0.06); }
      else if (n === 'kill') { tone(300, 0.16, 'sawtooth', 0.05, 90); }
      else if (n === 'coin') tone(1200, 0.06, 'square', 0.03);
      else if (n === 'brew') [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.06, null, i * 0.08); });
      else if (n === 'fail') tone(160, 0.3, 'sawtooth', 0.05, 60);
      else if (n === 'ascend') [262, 330, 392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.4, 'triangle', 0.06, null, i * 0.1); });
      else if (n === 'buy') { tone(520, 0.08, 'square', 0.04); tone(780, 0.1, 'square', 0.04, null, 0.07); }
    }
  };
})();
