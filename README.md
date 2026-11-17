# Prism Break

A neon Breakout with a twist of light: your ball carries a colour — cyan, gold
or violet. **Prism** bricks are solid lenses that bend the ball to their colour
when it bounces off them. **Sealed** bricks only break to a ball of their own
colour. Route the light through the right prism to open the seals, clear all
eight levels, and don't let the ball past your paddle.

## How to play

- **Mouse / ← → (or A / D)** — move the paddle
- **Click / Space** — launch the ball, fire the laser (while the laser power-up lasts)
- **P** — pause, **M** — mute, **R** — restart
- Catch falling capsules: **W** wide paddle, **M** multi-ball, **S** slow ball,
  **L** laser, **+** extra life
- Break bricks in a row without losing a ball to raise the combo multiplier
  (up to ×5). Clearing a level pays a bonus; clearing level 8 wins the game.

## Run it

No build step, no network request, no assets to fetch — everything is local
files plus synthesised Web Audio sound.

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in a desktop browser and play.

Screenshot scenes (deterministic, seeded) live behind query strings, e.g.
`?shot=start&seed=7`, `?shot=play&seed=7`, `?shot=end&seed=7` — see
`shots.json`.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/` — the game: `config.js` (levels, tuning), `world.js`
  (simulation), `render.js` (canvas drawing), `input.js`, `audio.js`
  (synthesised sound), `shots.js` (screenshot staging), `main.js` (loop)
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — three real renders of the game (title, play, game over)

## License

MIT — see `LICENSE`.
