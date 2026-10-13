/* ui/orders.js - commissions: deliver potions for coins and Essence */
(function () {
  var A = window.Alch, el = A.el, E = A.engine, S = A.sprites;
  var T = A.ui.orders = {};
  var root, list;

  function icon(id, px) { var it = A.data.itemById[id]; return el('i', { class: 'ico', style: S.cellStyle('items', it ? it.icon : 0, px) }); }

  function render() {
    var s = A.state;
    list.innerHTML = '';
    if (!s.orders.length) {
      list.appendChild(el('div', { class: 'locked-note' }, 'The guild has no commissions yet. Discover potion recipes and they will start asking for them.'));
      return;
    }
    s.orders.forEach(function (o, i) {
      var it = A.data.itemById[o.item], have = E.countItem(o.item), ready = have >= o.n;
      var coins = Math.round(o.coins * E.coinMult());
      list.appendChild(el('div', { class: 'order' + (ready ? ' ready' : '') },
        el('div', { class: 'out' }, icon(o.item, 44)),
        el('div', {},
          el('h4', {}, o.n + 'x ' + it.name),
          el('div', { class: 'rw' },
            el('span', {}, icon('ui_coin', 18), A.fmt(coins)),
            el('span', {}, icon('ui_essence', 18), '+' + o.essence + ' Essence'),
            el('span', { class: 'have' }, 'Have ' + have + '/' + o.n)),
          el('div', { class: 'row-btns' },
            el('button', { class: 'btn small primary', disabled: !ready, onclick: function () { E.fulfillOrder(i); A.audio.play('buy'); } }, 'Deliver'),
            el('button', { class: 'btn small', onclick: function () { E.dismissOrder(i); } }, 'Swap')))));
    });
  }

  function dot() {
    var b = A.$('#tabs button[data-tab=orders]'), any = A.state.orders.some(function (o) { return E.countItem(o.item) >= o.n; });
    var d = A.$('.dot', b);
    if (any && !d) b.appendChild(el('span', { class: 'dot' }));
    if (!any && d) d.remove();
  }

  T.init = function () {
    root = A.$('#panel-orders');
    list = el('div');
    root.appendChild(el('div', { class: 'h2' }, el('span', {}, 'Commissions'), el('small', {}, 'orders survive ascension')));
    root.appendChild(el('div', { class: 'note', style: 'margin-bottom:8px' }, 'The guild pays well above market for potions. Deliver them for coins and Essence. You can swap an order every ' + A.data.config.orders.dismissCooldownSec + 's.'));
    root.appendChild(list);
    ['orders', 'inv', 'recipes', 'ascended'].forEach(function (e) { A.bus.on(e, function () { dot(); if (A.ui.tab === 'orders') render(); }); });
    A.bus.on('tab', function (t) { if (t === 'orders') render(); });
    A.bus.on('orderDone', function (d) { A.engine.toast('Order paid: ' + A.fmt(d.coins) + ' coins, +' + d.essence + ' Essence', 'good'); });
    render(); dot();
  };
})();
