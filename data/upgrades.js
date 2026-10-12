window.ALCH_DATA = window.ALCH_DATA || {};
// Coin upgrades. Reset on ascension.
// cost = base * growth^level.  stat: click | drop | coin | auto | slots | stack.  Each level adds `add`.
// icon = an item id from items.js (its icon is shown).
ALCH_DATA.upgrades = [
  { "id": "hands",      "name": "Steady Hands",    "desc": "+1 click power",         "icon": "ui_hands",     "stat": "click", "add": 1,    "base": 12, "growth": 1.42, "max": 40 },
  { "id": "satchel",    "name": "Deeper Satchel",  "desc": "+1 satchel slot",        "icon": "ui_bag",       "stat": "slots", "add": 1,    "base": 25, "growth": 1.5,  "max": 16 },
  { "id": "apprentice", "name": "Hire Apprentice", "desc": "+1 auto-harvester",      "icon": "ui_apprentice","stat": "auto",  "add": 1,    "base": 60, "growth": 1.6,  "max": 20 },
  { "id": "eye",        "name": "Keen Eye",        "desc": "+2% drop chance",        "icon": "ui_eye",       "stat": "drop",  "add": 0.02, "base": 40, "growth": 1.5,  "max": 15 },
  { "id": "purse",      "name": "Haggler's Purse", "desc": "+10% coins",             "icon": "ui_coin",      "stat": "coin",  "add": 0.1,  "base": 80, "growth": 1.55, "max": 20 },
  { "id": "jars",       "name": "Stout Jars",      "desc": "+2 items per slot",      "icon": "ui_jar",       "stat": "stack", "add": 2,    "base": 50, "growth": 1.6,  "max": 6 }
];
