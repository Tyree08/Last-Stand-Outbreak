# LAST STAND: THE OUTBREAK

A small 3D survival-horror browser game prototype built with HTML, CSS, JavaScript, and Three.js. It is designed to run as a static website on GitHub Pages.

## Files
- `index.html` — page structure and menus
- `style.css` — menus, HUD, and layout
- `game.js` — 3D world and gameplay

## Run locally
Because the game uses JavaScript modules, open it through a local web server rather than double-clicking `index.html`.

If you have Python installed, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish with GitHub Pages
1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, `game.js`, and `README.md` to the repository's main/root folder.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish and open the provided website link.

## Controls
- `W A S D` — move
- Mouse — rotate the camera (click the game to capture the mouse)
- `Shift` — sprint
- `Space` — jump
- `E` — collect a nearby supply case
- Left mouse click — emit a short-range defensive pulse
- `Esc` — pause / resume

## Current demo features
- Third-person 3D city environment
- Military Soldier and Former Doctor character choices
- Easy, Normal, Hard, and Nightmare difficulty settings
- Basic infected that pursue the player
- Health and stamina
- Supply collection and extraction objective
- Score, pause menu, and mission results

## Notes
- Three.js is loaded from jsDelivr, so players need an internet connection.
- This is a first playable prototype. The hospital and military base missions, expanded inventory, checkpoints, save system, audio, and advanced infected are planned future additions.
- No backend, account, database, or API key is required.
