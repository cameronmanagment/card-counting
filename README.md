# Hi-Lo Count

Hi-Lo Count is a practice app for learning the basic Hi-Lo blackjack card-counting system on Even Realities G2 glasses, in Even Hub, or in a normal browser. It is meant for training and simulation: you watch cards appear in a practice shoe, enter each card by group, and the app keeps the running count, estimated true count, cards seen, decks remaining, and a short history of your latest inputs.

If you have never counted cards before, start here: Hi-Lo does not ask you to remember every card individually. Each exposed card belongs to one of three groups:

- `LOW 2-6`: adds `+1` to the running count.
- `MID 7-9`: adds `0`, but still counts as a seen card.
- `HIGH 10-A`: adds `-1` to the running count.

The goal of practice is to build the habit of tagging every exposed card quickly and accurately. Low cards increase the count, high cards decrease it, and middle cards keep deck estimation honest.

## What You See

On the glasses, the main screen is intentionally small and glanceable:

- `SEEN` shows how many cards have been entered out of the shoe.
- `RC` is the running count, the simple total from the cards you entered.
- `TCi` is an integer true count estimate, which adjusts the running count by decks remaining.
- `LAST` shows the latest few card groups you entered. The newest one is underlined.
- The right side shows the count cue, true count, decks left, and shoe penetration.
- The bottom line shows the direct inputs for low, middle, and high cards.

The companion browser app shows the same shoe with larger controls, history, settings, and reference tables. You can use the companion by itself, the glasses by themselves after launch, or both together. They mirror the same local shoe state.

## Glasses Controls

Use one input for every exposed card:

- Swipe down to log `LOW 2-6`.
- Tap to log `MID 7-9`.
- Swipe up to log `HIGH 10-A`.
- Double tap to open the action menu.

In the menu you can resume counting, undo the last input, start a new shoe, change settings, open the learning pages, open the reference table, or exit.

## First Practice Session

1. Start a new shoe and choose the number of decks you want to practice.
2. Look at one card at a time from a real deck, a dealing app, or a practice drill.
3. Enter the card group on the glasses or in the companion app.
4. Check `LAST` to confirm the input was recorded.
5. Watch `RC` change as you enter low and high cards.
6. Keep entering middle cards too, even though they are worth `0`.
7. Use `Undo last` if you make a mistake.
8. Reset with `New shoe` when you want a fresh practice round.

At first, ignore strategy deviations and focus only on entering the correct group for each card. Once that feels natural, start watching the true count and reference pages.

## Why Middle Cards Matter

It is tempting to skip `7`, `8`, and `9` because they do not change the running count. Do not skip them during practice. The app needs every seen card to estimate decks remaining, penetration, and true count. If you only enter cards that change the count, the true count will become misleading.

## Built-In Reference

The app includes local reference pages for:

- Hi-Lo card tags.
- True-count cue bands.
- The Illustrious 18 decision table.
- The Fab 4 late-surrender deviations.
- Expanded S17 highlights for pair splits, soft totals, hard totals, surrender, and insurance.

The built-in deviation tables assume Hi-Lo true count, six decks, dealer stands on soft 17, double after split, and late surrender. You can change the practice settings for decks, S17/H17, double after split, and late surrender, but if your real game uses different rules, treat the settings label as a reminder that index numbers may need recalibration.

Sources:

- Wizard of Odds, Introduction to the High-Low Card Counting Strategy: https://wizardofodds.com/games/blackjack/card-counting/high-low/
- Blackjack Apprenticeship S17 deviation chart: https://www.blackjackapprenticeship.com/wp-content/uploads/2019/07/BJA_S17.pdf

## Responsible Use

This app is for lawful personal practice and simulation. Do not use it in any casino, game, or setting where electronic assistance, card-counting aids, or wearable devices are prohibited.

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
