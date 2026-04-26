import {
  type CardBucket,
  type DeckCount,
  type GameSettings,
  bucketOrder,
  createShoe,
  deckOptions,
  defaultGameSettings,
  formatGameSettings,
  normalizeGameSettings,
  normalizeDeckCount,
} from './counting'

export type AppMode = 'setup' | 'count' | 'menu' | 'guide' | 'settings' | 'learn'

export interface AppState {
  mode: AppMode
  shoe: ReturnType<typeof createShoe>
  settings: GameSettings
  selectedBucket: CardBucket
  selectedDeckIndex: number
  selectedMenuIndex: number
  selectedSettingsIndex: number
  guidePage: number
  learnPage: number
  notice: string
}

export const menuItems = ['Resume count', 'Undo last', 'New shoe', 'Settings', 'Learn', 'Reference', 'Exit'] as const
export const settingsItems = ['Decks', 'Dealer soft 17', 'Double after split', 'Late surrender'] as const

export type MenuItem = (typeof menuItems)[number]
export type SettingsItem = (typeof settingsItems)[number]

const storageKey = 'card-counting-state-v1'

interface PersistedState {
  shoe: ReturnType<typeof createShoe>
  settings?: GameSettings
  selectedBucket: CardBucket
}

export function createInitialState(): AppState {
  const persisted = loadPersistedState()
  const shoe = persisted?.shoe ?? createShoe(6)
  const settings = persisted?.settings ?? { ...defaultGameSettings, deckCount: shoe.deckCount }
  const selectedBucket = persisted?.selectedBucket ?? 'low'

  return {
    mode: persisted ? 'count' : 'setup',
    shoe,
    settings,
    selectedBucket,
    selectedDeckIndex: deckOptions.indexOf(settings.deckCount),
    selectedMenuIndex: 0,
    selectedSettingsIndex: 0,
    guidePage: 0,
    learnPage: 0,
    notice: persisted ? 'Shoe restored' : 'Choose decks',
  }
}

export function persistState(state: AppState): void {
  const persisted: PersistedState = {
    shoe: state.shoe,
    settings: state.settings,
    selectedBucket: state.selectedBucket,
  }

  window.localStorage.setItem(storageKey, JSON.stringify(persisted))
}

export function clearPersistedState(): void {
  window.localStorage.removeItem(storageKey)
}

export function cycleBucket(bucket: CardBucket, step: 1 | -1): CardBucket {
  const currentIndex = bucketOrder.indexOf(bucket)
  const nextIndex = wrapIndex(currentIndex + step, bucketOrder.length)
  return bucketOrder[nextIndex]
}

export function selectedDeckCount(state: AppState): DeckCount {
  return deckOptions[state.selectedDeckIndex] ?? 6
}

export function cycleDeckIndex(index: number, step: 1 | -1): number {
  return wrapIndex(index + step, deckOptions.length)
}

export function cycleMenuIndex(index: number, step: 1 | -1): number {
  return wrapIndex(index + step, menuItems.length)
}

export function cycleSettingsIndex(index: number, step: 1 | -1): number {
  return wrapIndex(index + step, settingsItems.length)
}

export function cycleGuidePage(page: number, step: 1 | -1): number {
  return wrapIndex(page + step, guidePages.length)
}

export function cycleLearnPage(page: number, step: 1 | -1): number {
  return wrapIndex(page + step, learnPages.length)
}

export const learnPages = [
  {
    title: 'START HERE',
    paragraphs: [
      'This app is a practice trainer for the Hi-Lo card-counting system in blackjack. It does not play blackjack for you, and it does not tell you to make bets in a real casino. Its job is simpler: it helps you practice noticing cards, placing each card into the right group, and keeping an accurate count as a shoe is dealt.',
      'Card counting sounds mysterious at first, but the basic idea is just a running score. Every exposed card gives you a tiny clue about what kinds of cards are still left unseen. Low cards leaving the shoe are generally good for the player because they leave a higher share of tens and aces behind. High cards leaving the shoe are generally bad for the player because they remove the cards that help blackjacks, strong doubles, and dealer busts.',
      'You do not need to remember every individual card. In Hi-Lo, every card belongs to one of three groups: low cards add one, middle cards add zero, and high cards subtract one. The app is built around those groups so you can practice the habit first, then gradually learn true count and strategy changes once the basic rhythm feels natural.',
    ],
  },
  {
    title: 'HI-LO TAGS',
    paragraphs: [
      'The Hi-Lo system gives each card a value, usually called a tag. Cards 2, 3, 4, 5, and 6 are low cards, so each one is worth +1. Cards 7, 8, and 9 are neutral middle cards, so each one is worth 0. Tens, face cards, and aces are high cards, so each one is worth -1.',
      'As cards appear, you keep one live total called the running count, or RC. If the first three cards are 5, king, and 3, the count goes +1, then back to 0, then up to +1. You are not trying to memorize the exact cards after they pass. You are translating each card into its tag and adding that tag to the current total.',
      'Middle cards are easy to overlook because they do not change the running count, but they still matter in this app. Logging 7, 8, and 9 keeps the app accurate about how many cards have been seen, how many decks are left, and how deep you are into the shoe.',
    ],
  },
  {
    title: 'READ SCREEN',
    paragraphs: [
      'The glasses count screen is compact, so each label carries a specific job. Seen is how many cards have already been logged. RC is the running count you are maintaining. Last shows the most recent inputs so you can catch mistakes quickly.',
      'True and TCi are both versions of true count, which adjust the running count for how many decks are left. Left estimates decks remaining, and penetration shows how far into the shoe you are.',
      'When you are brand new, focus first on the basics: log the correct group, check Last, and keep RC clean. The other labels become useful once the card groups feel automatic.',
    ],
  },
  {
    title: 'TRUE COUNT',
    paragraphs: [
      'The running count tells you the current score, but it does not tell the whole story by itself. A running count of +6 early in a six-deck shoe is very different from a running count of +6 when only one deck is left. The same score is much stronger when fewer unseen cards remain.',
      'The true count fixes that by dividing the running count by the estimated decks left. For example, if the running count is +6 and about three decks remain, the true count is about +2. If the running count is +6 and about one deck remains, the true count is about +6.',
      'This app shows both the decimal true count and TCi, an integer true count rounded toward zero for index plays. Higher true counts generally mean the remaining shoe is richer in high cards, which is why the display labels some situations as watch, favorable, or strong.',
    ],
  },
  {
    title: 'USE THE APP',
    paragraphs: [
      'When you practice, imagine cards are being exposed from a blackjack table. For every card you see, enter its group: low for 2 through 6, middle for 7 through 9, and high for 10 through ace. On the glasses, swipe down for low, tap for middle, and swipe up for high. In the web companion, use the group buttons.',
      'After each input, look at the latest card group and the running count. If you entered the wrong group, use Undo immediately so the running count, cards seen, decks remaining, and true count stay clean. Counting practice works best when accuracy comes before speed.',
      'The display is intentionally compact while you count. Seen tells you how many cards have been logged. RC is the running count. True and TCi estimate count strength after adjusting for decks left. Penetration shows how far into the shoe you are.',
    ],
  },
  {
    title: 'PRACTICE FLOW',
    paragraphs: [
      'Start by choosing the deck count and table rules that match the kind of shoe you want to practice. If you are brand new, do not worry about advanced plays yet. Deal cards one at a time, enter every card group, and keep checking whether your running count matches what you expected.',
      'A good first goal is simply to finish a shoe without losing the count. Once that feels steady, practice faster card recognition: low, middle, high, low, high, and so on. After that, begin paying attention to true count and the reference pages, which explain how a count can affect certain blackjack decisions.',
      'The Plays tab is for strategy deviations, which are decisions that change only when the true count reaches a certain number. Treat those as a later layer. The foundation is always the same: log every exposed card, keep the running count clean, and understand why the true count changes as decks are used up.',
    ],
  },
]

export const guidePages = [
  [
    'COUNT TABLE',
    '2 3 4 5 6  -> +1',
    '7 8 9      ->  0',
    '10 J Q K A -> -1',
    '',
    'Log every exposed card.',
    'MID cards keep decks left exact.',
  ],
  [
    'TRUE COUNT',
    'TC = RC / decks left.',
    'TCi is TC truncated toward 0.',
    '',
    'Cold      <= -1',
    'Neutral      0',
    'Watch       +1',
    'Favorable +2/+3',
    'Strong    >= +4',
  ],
  [
    'I18 1-6',
    'Insurance +3: insure/even money',
    '16 v 10 0: stand',
    '15 v 10 +4: stand',
    'T,T v 5 +5: split',
    'T,T v 6 +4: split',
    '10 v 10 +4: double',
  ],
  [
    'I18 7-12',
    '12 v 3 +2: stand',
    '12 v 2 +3: stand',
    '11 v A +1: double',
    '9 v 2 +1: double',
    '10 v A +4: double',
    '9 v 7 +3: double',
  ],
  [
    'I18 13-18',
    '16 v 9 +5: stand',
    '13 v 2 -1: stand',
    '12 v 4 0: stand',
    '12 v 5 -2: stand',
    '12 v 6 -1: stand',
    '13 v 3 -2: stand',
  ],
  [
    'FAB 4 SURRENDER',
    'Late surrender only',
    '14 v 10 +3: surrender',
    '15 v 10 0: surrender',
    '15 v 9 +2: surrender',
    '15 v A +1: surrender',
  ],
  [
    'S17 EXTRAS',
    'T,T v 4 +6: split',
    'A,8 v 4 +3: double',
    'A,8 v 5/6 +1: double',
    'A,6 v 2 +1: double',
    '16 v 9 +4: stand',
    '8 v 6 +2: double',
  ],
]

export function settingValueLabel(settings: GameSettings, item: SettingsItem): string {
  switch (item) {
    case 'Decks':
      return `${settings.deckCount}D`
    case 'Dealer soft 17':
      return settings.dealerSoft17
    case 'Double after split':
      return settings.doubleAfterSplit ? 'ON' : 'OFF'
    case 'Late surrender':
      return settings.lateSurrender ? 'ON' : 'OFF'
  }
}

export function updateSetting(settings: GameSettings, item: SettingsItem, step: 1 | -1 = 1): GameSettings {
  switch (item) {
    case 'Decks': {
      const currentIndex = deckOptions.indexOf(settings.deckCount)
      const nextDeckCount = deckOptions[wrapIndex(currentIndex + step, deckOptions.length)] ?? defaultGameSettings.deckCount
      return { ...settings, deckCount: nextDeckCount }
    }
    case 'Dealer soft 17':
      return { ...settings, dealerSoft17: settings.dealerSoft17 === 'S17' ? 'H17' : 'S17' }
    case 'Double after split':
      return { ...settings, doubleAfterSplit: !settings.doubleAfterSplit }
    case 'Late surrender':
      return { ...settings, lateSurrender: !settings.lateSurrender }
  }
}

function loadPersistedState(): PersistedState | null {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (!parsed.shoe) return null

    const deckCount = normalizeDeckCount(parsed.shoe.deckCount)
    const settings = normalizeGameSettings(parsed.settings, { ...defaultGameSettings, deckCount })
    const selectedBucket = isCardBucket(parsed.selectedBucket) ? parsed.selectedBucket : 'low'

    return {
      shoe: {
        ...createShoe(deckCount),
        ...parsed.shoe,
        deckCount,
        runningCount: Number(parsed.shoe.runningCount) || 0,
        cardsSeen: Math.max(Number(parsed.shoe.cardsSeen) || 0, 0),
        bucketCounts: {
          low: Math.max(Number(parsed.shoe.bucketCounts?.low) || 0, 0),
          mid: Math.max(Number(parsed.shoe.bucketCounts?.mid) || 0, 0),
          high: Math.max(Number(parsed.shoe.bucketCounts?.high) || 0, 0),
        },
        history: Array.isArray(parsed.shoe.history) ? parsed.shoe.history.filter(isCardBucket) : [],
      },
      settings,
      selectedBucket,
    }
  } catch {
    clearPersistedState()
    return null
  }
}

export function settingsNotice(settings: GameSettings): string {
  return `Settings ${formatGameSettings(settings)}`
}

function isCardBucket(value: unknown): value is CardBucket {
  return value === 'low' || value === 'mid' || value === 'high'
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length
}
