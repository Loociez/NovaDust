window.ALCH_DATA = window.ALCH_DATA || {};
// Arcanum perks: permanent, bought with Essence (earned by ascending). cost = ceil(base * growth^level).
// stat: pclick pcoin pdrop pslots pstack papprentice pspeed pcrit pcritdmg pstart pshiny pbatch pessence poffline pboss pautosell
ALCH_DATA.perks = [
  {"id": "p_power", "name": "Alchemical Mastery", "desc": "+5% click power", "icon": "ui_hands", "stat": "pclick", "add": 0.05, "base": 1, "growth": 1.28, "max": 100},
  {"id": "p_coin", "name": "Midas Whisper", "desc": "+5% coins", "icon": "ui_coin", "stat": "pcoin", "add": 0.05, "base": 1, "growth": 1.3, "max": 100},
  {"id": "p_luck", "name": "Gatherer's Luck", "desc": "+1% drop chance", "icon": "ui_luck", "stat": "pdrop", "add": 0.01, "base": 2, "growth": 1.35, "max": 30},
  {"id": "p_slots", "name": "Bottomless Satchel", "desc": "+1 satchel slot", "icon": "ui_bag", "stat": "pslots", "add": 1, "base": 3, "growth": 1.5, "max": 16},
  {"id": "p_stack", "name": "Master Jars", "desc": "+3 items per slot", "icon": "ui_jar", "stat": "pstack", "add": 3, "base": 3, "growth": 1.5, "max": 10},
  {"id": "p_apprentice", "name": "Tireless Apprentices", "desc": "+1 apprentice", "icon": "ui_apprentice", "stat": "papprentice", "add": 1, "base": 4, "growth": 1.45, "max": 30},
  {"id": "p_speed", "name": "Overclocked Apprentices", "desc": "+5% apprentice speed", "icon": "ui_clock", "stat": "pspeed", "add": 0.05, "base": 3, "growth": 1.35, "max": 40},
  {"id": "p_crit", "name": "Keen Edge", "desc": "+1% critical chance", "icon": "ui_crit", "stat": "pcrit", "add": 0.01, "base": 2, "growth": 1.4, "max": 45},
  {"id": "p_critdmg", "name": "Brutal Crits", "desc": "+10% critical damage", "icon": "ui_axe", "stat": "pcritdmg", "add": 0.1, "base": 2, "growth": 1.35, "max": 50},
  {"id": "p_start", "name": "Head Start", "desc": "Begin each run with extra coins", "icon": "ui_pile", "stat": "pstart", "add": 1, "base": 5, "growth": 1.5, "max": 15},
  {"id": "p_shiny", "name": "Shiny Hunter", "desc": "+0.1% shiny chance", "icon": "ui_shiny", "stat": "pshiny", "add": 0.001, "base": 6, "growth": 1.5, "max": 20},
  {"id": "p_batch", "name": "Double Batch", "desc": "+3% chance a brewed potion yields two", "icon": "ui_batch", "stat": "pbatch", "add": 0.03, "base": 5, "growth": 1.4, "max": 30},
  {"id": "p_essence", "name": "Essence Alchemy", "desc": "+8% Essence from ascending", "icon": "ui_essence", "stat": "pessence", "add": 0.08, "base": 8, "growth": 1.45, "max": 50},
  {"id": "p_offline", "name": "Dreamer's Rest", "desc": "+1 hour of offline progress", "icon": "ui_clock", "stat": "poffline", "add": 1, "base": 6, "growth": 1.4, "max": 20},
  {"id": "p_boss", "name": "Boss Magnet", "desc": "Bosses appear 1 kill sooner", "icon": "ui_axe", "stat": "pboss", "add": 1, "base": 15, "growth": 2.0, "max": 5},
  {"id": "p_recycle", "name": "Sludge Recycler", "desc": "Fizzled brews turn into coins", "icon": "ui_recycle", "stat": "pautosell", "add": 1, "base": 12, "growth": 1.0, "max": 1}
];
