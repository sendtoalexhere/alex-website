# alex-tols.com

A personal site you explore by sailing. Steer a yacht (WASD) between archipelagos; docking at
an island opens that part of the site. Built with Three.js, no framework and no build step —
it's plain files served as-is.

Live at **https://alex-tols.com**

## Running it locally

It must be *served*, not opened as a file — the browser blocks ES modules on `file://`.

```bash
python -m http.server 8000
```

Then open http://localhost:8000

## Editing

`content.js` holds **all the text** — it's the only file to touch for wording, links or a new
island. Each island is one entry:

```js
{ id: 'karteto', title: 'Karteto', landmark: 'phone', angle: 138,
  style: { size: 21, shape: 'plateau', turn: 20, ... },
  html: `<p>…</p>` }
```

| Key | Meaning |
|---|---|
| `angle` | position round the lagoon ring, degrees; `0` = the side furthest from Home |
| `style.turn` | rotate the island clockwise in place (landmark, jetty and dock together) |
| `style.shape` | `hill` · `plateau` · `crag` · `peaks` · `pontoon` |
| `dock: false` | scenery only — no jetty, no panel, not counted in the logbook |
| `entrance` | distance from the lagoon centre towards Home (the sports pontoon uses this) |

After editing, bump the `?v=` number in `index.html` and in the imports at the top of `main.js`.
Browsers cache these files hard, and without the bump you'll be looking at the old version.

## File map

| File | Contains |
|---|---|
| `index.html` | markup, all CSS, meta/preview tags |
| `content.js` | every word on the site |
| `main.js` | the engine: sea, boat physics, islands, games, HUD, chart |
| `landmarks.js` | what stands on each island, built from Three.js primitives |
| `audio.js` | synthesised sea, wind and music — no audio files |
| `analytics.js` | thin wrapper; a no-op until a provider script is added to `index.html` |
| `vendor/` | Three.js r160, served locally so a CDN outage can't blank the site |

## Deploying

Hosted on GitHub Pages from `main`. Push and it redeploys in under a minute:

```bash
git add -A && git commit -m "..." && git push
```

`CNAME` pins the custom domain — leave it in place or the domain setting resets.

## Analytics

Off by default. To switch on, uncomment one line in `index.html` (Plausible or Umami — both
cookieless, so no consent banner). These events are already wired: `dock` (which island),
`store_click`, `contact_click`, `skip_sailing`, `game`, `race`, and `engaged` at 30s/2min/5min.
