# Alchemist's Cauldron

A clicker where clicking harvests ingredients, a limited satchel forces choices, and the
only way to "rebirth" is to brew an Ascension Elixir / Philosopher's Stone.

Plain HTML + JavaScript. No build step, no frameworks, no server needed to play.

## Play it

* Double-click `index.html` (works from `file://`), or
* push the folder to a GitHub repo and enable **Settings > Pages > Deploy from branch > main / root**.
  The game will be at `https://<you>.github.io/<repo>/`.

## How the game works

1. **Click the creature.** Each click damages it and has a chance to drop an ingredient from *that creature's* drop table.
   Killing it pays coins and a guaranteed drop. Every 10th kill in a zone is a boss.
2. **Satchel (limited).** Slots and stack size are limited, so drops are lost when it is full. Sell or brew to make room.
3. **Cauldron (3x3).** Tap ingredients to put them in, press **Brew**. Order does not matter.
   * Unknown combinations fizzle into Murky Sludge. Recipe hints in the **Recipes** tab tell you what to try.
   * Potions give timed buffs (drink them from **Sell / Drink** mode) or are ingredients for better recipes.
   * Relics equip into Tool / Charm / Trinket slots (a new relic replaces the old one for half its value).
4. **Ascend.** Each zone has an *ascension* recipe. Brewing it consumes your satchel, relics, coins and upgrades,
   gives a permanent bonus, and unlocks the next zone for good (new creatures, new ingredients, new recipes).
   Recipes you have discovered are kept.

## Folder layout (every part is editable on its own)

```
index.html          the game page
editor.html         the editor (open it in Chrome/Edge)
assets/
  player.png        your monster spritesheet (32x32 cells, 12 frames per sprite)
  items.png         item icons (32x32 cells, 16 per row) - PLACEHOLDERS, replace with your art
  fonts/            pixel font (bundled so the APK works offline)
data/               <- all game content lives here, one file per topic
  config.js         sheet sizes, click rules, ascension bonuses, save key
  tiers.js          zones (name, backdrop colours)
  items.js          ingredients, potions, relics, ascension items
  monsters.js       creatures: sprite, frames, hp, coins, spawn weight, drop table
  recipes.js        recipes + hints
  upgrades.js       coin upgrades
js/
  util.js data.js sprites.js state.js engine.js audio.js main.js
  ui/               one file per screen: stage, satchel, cauldron, recipes, workshop, journal
css/style.css       theme (colours are variables at the top)
tools/gen_items.py  optional: regenerates the placeholder item icons
```

`engine.js` holds all the rules and never touches the page. Each `ui/*.js` file draws one panel and
listens to events from the engine, so you can change or replace one without touching the others.

## The spritesheet

`assets/player.png` is 1024x1024 = a 32x32 grid of 32x32 cells. Sprite *n* is cells `n*12 ... n*12+11`
(left to right, top to bottom from the top-left). That is 85 full sprites; the last 4 cells are a partial
sprite (the bear, sprite 85, which has only 4 frames).

Each sprite's 12 frames are 4 directions x 3 frames:

| frames | facing        | meaning              |
|--------|---------------|----------------------|
| 0-2    | away          | idle, idle, attack   |
| 3-5    | front         | idle, idle, attack   |
| 6-8    | side          | idle/walk, walk, attack |
| 9-11   | other side    | idle/walk, walk, attack |

The game uses front-facing by default: `idle: [3, 4]` loops, `hit: [5]` plays when clicked.
Change those per monster (the editor shows all 12 frames so you can pick).

## The editor

Open `editor.html`.

* **Sprites** tab browses all 86 sprites and shows which are in use.
* **Monsters / Items / Recipes / Zones / Upgrades / Config** tabs edit each data file with live previews.
* **Check data** finds broken references (unknown items, duplicate ids, unreachable ingredients, recipes over 9 items...).
* **Preview in game** tries your edits in the game without saving files (the game's Journal tab shows a banner and a
  button to go back to the shipped data).
* **Save to project folder** (Chrome/Edge) writes straight into `data/` once you pick the project folder.
  Other browsers: **Download zip** (or changed files) and copy them over `data/`.
* **Load files** reads `data/*.js` files back into the editor.

You can also hand-edit the `data/*.js` files; they are plain JSON inside a one-line wrapper.

### Adding things

* **New monster:** Sprites tab > click a sprite > *New monster from this sprite*, then set zone, drops and frames.
* **New ingredient:** Items tab > + > kind `ingredient`; give a monster a drop of it.
* **New recipe:** Recipes tab > +. Each distinct set of ingredients must be unique.
* **New zone:** Zones tab > +, then add monsters in it and one recipe of kind `ascension` for the zone before it unlocks it.
  (Brewing zone N's ascension recipe unlocks zone N+1.)
* **Your own item art:** replace `assets/items.png` (keep 32x32 cells, 16 per row; add rows at the bottom)
  and set each item's icon number in the editor.

## Making the APK (Capacitor)

You need Node.js and Android Studio.

```
npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android
npx cap add android        # once
npm run sync               # copies the game into www/ and into the Android project
npm run open               # opens Android Studio: Build > Build APK(s)
```

Edit `appId` / `appName` in `capacitor.config.json` first. Saves use `localStorage`, which persists inside the app.
Everything (font, sprites, data) is bundled, so it runs offline. The layout is already mobile-first and respects
notches via `safe-area-inset`.

## Tuning

Almost all balance is in `data/`: monster `hp`/`coins`/`weight`, item `value`, upgrade `base`/`growth`,
and in `config.js`: base drop chance, boss frequency, and how strong each ascension is
(`ascension.perClick`, `perCoin`, `hpPerAscension`).

## Notes

* Item icons in `items.png` are generated placeholders (see `tools/gen_items.py`).
* If a save from an older version has an item you later delete, the game will show it as blank; use **Journal > Erase save** if that happens.
