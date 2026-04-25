# Hi-Lo Count

Hi-Lo Count is a blackjack card-counting trainer for Even Realities G2 glasses and Even Hub. It uses the Hi-Lo system with a modern companion console and a small, glanceable G2 interface:

- Swipe up to log `HIGH 10-A`.
- Tap to log `MID 7-9`.
- Swipe down to log `LOW 2-6`.
- Double tap to open the action menu.
- Use the menu to resume, undo, reset the shoe, change decks, open the reference table, or exit the app.

The companion app and the glasses both run from the same local counting engine. The companion can be used by itself in a browser, the glasses can be used by themselves once launched, and together they mirror the same shoe state.

The app is designed for lawful personal practice and simulation. Do not use it where electronic assistance, card counting aids, or wearable devices are prohibited.

## Why the input is bucketed

Hi-Lo counts cards by group:

- `2-6`: +1 running count
- `7-9`: 0 running count
- `10-A`: -1 running count

`MID` cards still need to be entered so decks remaining, shoe penetration, and true count stay accurate.

## Built-in reference

The app includes a local Hi-Lo reference table for card tags, true-count cue bands, and a compact set of common index drills. The same material is available in the companion app and through the glasses `Reference` menu.

## Development

```bash
npm install
npm run dev
npm run simulate
```

For hardware sideloading:

```bash
npm run dev
npx evenhub qr --url http://<your-lan-ip>:5173
```

## Verification

```bash
npm test
npm run build
npm run pack
```

`npm run pack` writes `card-counting.ehpk`, which can be uploaded to Even Hub.
