# Neon Rift

Neon Rift is a browser-based arena game with local play and a LAN lobby relay. Run the relay with `npm install` followed by `npm start`, then open `http://HOST_IP:3000` in each browser.

## Controls

- Player One: `WASD` to move and `Space` to dash.
- Player Two: arrow keys to move and `Enter` to dash.
- Moving fires in the current direction. Collect a gold core to charge the next bolt.

## Current features

- Three arena stages: Low Gravity, Crossfire, and Pulse Grid.
- First-to-five match scoring with round transitions.
- Browser-generated shooting, dash, charge, hit, and victory sounds.
- Authoritative LAN online 1v1 with synchronized input, players, projectiles, cores, timer, scores, and round state.

## LAN lobby test

1. On the host computer, run `npm install` once and then `npm start`.
2. Find its Wi-Fi address with `hostname -I` on Linux or `ipconfig` on Windows.
3. Open `http://HOST_IP:3000` on every device connected to the same network.
4. Select **Online Multiplayer**, choose a mode, and click **Host Lobby** on one device.
5. Enter the displayed six-character code on the other devices and click **Join Lobby**.

Online 2v2 and free-for-all are intentionally disabled until the arena model supports more than two players. The current online 1v1 match is host-authoritative: the host browser runs the simulation and the joining browser sends keyboard input while rendering state snapshots.
