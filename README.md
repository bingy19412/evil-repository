# Neon Rift

Neon Rift is a browser-based local 1v1 arena game. Open `index.html` in a modern browser and choose **Local 1v1** from the main menu.

## Controls

- Player One: `WASD` to move and `Space` to dash.
- Player Two: arrow keys to move and `Enter` to dash.
- Moving fires in the current direction. Collect a gold core to charge the next bolt.

## Current features

- Three arena stages: Low Gravity, Crossfire, and Pulse Grid.
- First-to-five match scoring with round transitions.
- Browser-generated shooting, dash, charge, hit, and victory sounds.
- Main menu with a LAN lobby-code interface for the planned online modes.

The lobby interface is currently a frontend contract only. Cross-device multiplayer needs a signaling/game relay service; the repository is otherwise static and does not yet include that server.
