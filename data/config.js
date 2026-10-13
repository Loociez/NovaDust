window.ALCH_DATA = window.ALCH_DATA || {};
// Global game settings. Every number here is safe to tweak (or use the editor's Config tab).
ALCH_DATA.config = {
  "title": "Alchemist's Cauldron",
  "sheets": {
    "monsters": {
      "src": "assets/player.png",
      "cell": 32,
      "cols": 32,
      "framesPerSprite": 12
    },
    "items": {
      "src": "assets/items.png",
      "cell": 32,
      "cols": 32
    }
  },
  "render": {
    "monsterScale": 6,
    "idleFps": 2.5,
    "hitMs": 180
  },
  "start": {
    "coins": 0,
    "slots": 8,
    "stack": 10
  },
  "clicking": {
    "baseDrop": 0.4,
    "dropCap": 0.95,
    "bossEvery": 10,
    "bossDrops": 4,
    "killDrops": 1,
    "apprenticePower": 0.5
  },
  "crit": {
    "baseChance": 0.05,
    "baseMult": 2
  },
  "crafting": {
    "failItem": "sludge",
    "failReturnsItems": false,
    "relicRefund": 0.5
  },
  "ascension": {
    "perClick": 0.1,
    "perCoin": 0.1,
    "hpPerAscension": 0.04
  },
  "essence": {
    "divisor": 10,
    "tierMult": 1,
    "perShiny": 0.05
  },
  "shiny": {
    "chance": 0.005,
    "hpMult": 2.5,
    "coinMult": 6,
    "dropMult": 3,
    "essencePerZone": 2
  },
  "bestiary": {
    "levels": [
      25,
      100,
      400,
      1500,
      5000
    ],
    "dmg": 0.05,
    "coins": 0.1,
    "drop": 0.02,
    "globalPerLevel": 0.005
  },
  "orders": {
    "slots": 3,
    "dismissCooldownSec": 120,
    "coinMult": 3.5,
    "essencePer": 0.5
  },
  "offline": {
    "baseHours": 4,
    "efficiency": 0.5
  },
  "save": {
    "key": "alchemist.save.v1",
    "autosaveSec": 5
  }
};
