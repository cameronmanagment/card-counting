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

The app includes a local Hi-Lo reference table for card tags, true-count cue bands, and the key index-deviation tables. The same material is available in the companion app and through the glasses `Reference` menu.

The deviation reference now includes:

- The full Hi-Lo Illustrious 18 decision table.
- The Fab 4 late-surrender deviations.
- Expanded S17 highlights for pair splits, soft totals, hard totals, late surrender, and insurance.

The source assumption for the built-in indexes is Hi-Lo true count, six decks, dealer stands on soft 17, double after split, and late surrender. Those tables are based on the Wizard of Odds High-Low page and the Blackjack Apprenticeship S17 deviation chart. The settings panel lets you set decks, S17/H17, DAS, and late surrender for the shoe you are practicing; if your game differs from the source assumptions, use the settings label as a reminder to recalibrate indexes for that rule set.

Sources:

- Wizard of Odds, Introduction to the High-Low Card Counting Strategy: https://wizardofodds.com/games/blackjack/card-counting/high-low/
- Blackjack Apprenticeship S17 deviation chart: https://www.blackjackapprenticeship.com/wp-content/uploads/2019/07/BJA_S17.pdf

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
