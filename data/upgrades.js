window.ALCH_DATA = window.ALCH_DATA || {};
// Coin upgrades (reset on ascension). cost = base * growth^level.
// stat: click | clickpct | drop | coin | auto | autopct | slots | stack. Each level adds `add`. icon = an item id.
ALCH_DATA.upgrades = [
  {"id": "hands", "name": "Steady Hands", "desc": "+1 click power", "icon": "ui_hands", "stat": "click", "add": 1, "base": 12, "growth": 1.42, "max": 40},
  {"id": "satchel", "name": "Deeper Satchel", "desc": "+1 satchel slot", "icon": "ui_bag", "stat": "slots", "add": 1, "base": 25, "growth": 1.5, "max": 16},
  {"id": "apprentice", "name": "Hire Apprentice", "desc": "+1 auto-harvester", "icon": "ui_apprentice", "stat": "auto", "add": 1, "base": 60, "growth": 1.6, "max": 20},
  {"id": "eye", "name": "Keen Eye", "desc": "+2% drop chance", "icon": "ui_eye", "stat": "drop", "add": 0.02, "base": 40, "growth": 1.5, "max": 15},
  {"id": "purse", "name": "Haggler's Purse", "desc": "+10% coins", "icon": "ui_coin", "stat": "coin", "add": 0.1, "base": 80, "growth": 1.55, "max": 20},
  {"id": "jars", "name": "Stout Jars", "desc": "+2 items per slot", "icon": "ui_jar", "stat": "stack", "add": 2, "base": 50, "growth": 1.6, "max": 6},
  {"id": "tempered", "name": "Tempered Tools", "desc": "+10% click power", "icon": "ui_tempered", "stat": "clickpct", "add": 0.1, "base": 3000, "growth": 1.3, "max": 100},
  {"id": "ledger", "name": "Golden Ledger", "desc": "+25% coins", "icon": "ui_ledger", "stat": "coin", "add": 0.25, "base": 5000, "growth": 1.35, "max": 60},
  {"id": "quick", "name": "Quick Hands", "desc": "+5% apprentice speed", "icon": "ui_clock", "stat": "autopct", "add": 0.05, "base": 800, "growth": 1.4, "max": 30}
];
