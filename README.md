# Reserve Manager

A cosy pixel-art wildlife reserve game. You arrive at a neglected reserve and bring it back
to life: mend fences, restore water, keep the grass healthy and the animals thriving, and
uncover what happened to the reserve along the way.

Runs in the browser. Free, no accounts, no network calls while playing; saves stay on your device.

![Screenshot placeholder](docs/screenshots/.gitkeep)

<!-- TODO: add screenshots to docs/screenshots/ and replace the placeholder above. -->

## Controls

| Action                 | Mouse / touch                    | Keyboard           |
| ---------------------- | -------------------------------- | ------------------ |
| Move the camera        | Drag (one finger)                | WASD / arrow keys  |
| Zoom                   | Mouse wheel / pinch              |                    |
| Inspect                | Click / tap                      |                    |
| Pause                  | Top bar                          | Space              |
| Game speed 1×/2×/4×    | Top bar                          | 1 / 2 / 3          |
| Build menu             | Side buttons                     | B                  |
| Staff                  | Side buttons                     | H                  |
| Species & encyclopedia | Side buttons                     | K                  |
| Journal                | Side buttons                     | J                  |
| Settings and saves     | Side buttons                     | O                  |
| Back / close           |                                  | Esc                |
| Move between controls  |                                  | Tab / Shift+Tab    |
| Press the focused one  |                                  | Enter              |
| Dialogue               | Click to continue, pick a choice | Space / Enter, 1–3 |

## Development

Needs Node 20.19+ (CI uses 24).

```bash
npm install
npm run dev            # then open the URL Vite prints
npm test               # Vitest
npm run lint           # ESLint + Prettier
npm run validate-data  # map + content checks
npm run sim:balance    # one simulated year, no player input
npm run build          # production build into dist/
npm run package:itch   # build + zip into release/reserve-manager-web.zip
```

In dev builds, press <kbd>`</kbd> (backtick) for the debug overlay. It is not included in production builds.

Project rules, architecture and the phase plan are in [docs/SPEC.md](docs/SPEC.md);
progress and agreed deviations are in [docs/PROGRESS.md](docs/PROGRESS.md) and
[docs/DECISIONS.md](docs/DECISIONS.md).

## Releasing

- **itch.io:** run `npm run package:itch`, then upload `release/reserve-manager-web.zip` as an
  HTML5 project and tick "This file will be played in the browser" (viewport 1280×720 or larger).
- **GitHub Pages:** `.github/workflows/pages.yml` builds and deploys on every push to `main`.
  One-time setup: on GitHub, open Settings → Pages and set Source to "GitHub Actions".

## Credits

All art, music and sound are original placeholder work made for this project. See
[public/assets/ASSETS.md](public/assets/ASSETS.md). Font: Inter (SIL Open Font License).
