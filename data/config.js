window.ALCH_DATA = window.ALCH_DATA || {};
// Global game settings. Every number here is safe to tweak (or use the editor's Config tab).
ALCH_DATA.config = {
  "title": "Alchemist's Cauldron",
  "sheets": {
    "monsters": { "src": "assets/player.png", "cell": 32, "cols": 32, "framesPerSprite": 12 },
    "items":    { "src": "assets/items.png",  "cell": 32, "cols": 16 }
  },
  "render": { "monsterScale": 6, "idleFps": 2.5, "hitMs": 180 },
  "start":  { "coins": 0, "slots": 8, "stack": 10 },
  "clicking": {
    "baseDrop": 0.4, "dropCap": 0.95,
    "bossEvery": 10, "bossDrops": 4, "killDrops": 1,
    "apprenticePower": 0.5
  },
  "crafting": { "failItem": "sludge", "failReturnsItems": false, "relicRefund": 0.5 },
  "ascension": { "perClick": 0.35, "perCoin": 0.5, "hpPerAscension": 0.08 },
  "save": { "key": "alchemist.save.v1", "autosaveSec": 5 }
};
