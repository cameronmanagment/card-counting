import {
  type CardBucket,
  type DeckCount,
  bucketOrder,
  createShoe,
  deckOptions,
  normalizeDeckCount,
} from './counting'

export type AppMode = 'setup' | 'count' | 'menu' | 'guide'

export interface AppState {
  mode: AppMode
  shoe: ReturnType<typeof createShoe>
  selectedBucket: CardBucket
  selectedDeckIndex: number
  selectedMenuIndex: number
  guidePage: number
  notice: string
}

export const menuItems = ['Resume count', 'Undo last', 'New shoe', 'Change decks', 'Reference', 'Exit'] as const

export type MenuItem = (typeof menuItems)[number]

const storageKey = 'card-counting-state-v1'

interface PersistedState {
  shoe: ReturnType<typeof createShoe>
  selectedBucket: CardBucket
}

export function createInitialState(): AppState {
  const persisted = loadPersistedState()
  const shoe = persisted?.shoe ?? createShoe(6)
  const selectedBucket = persisted?.selectedBucket ?? 'low'

  return {
    mode: persisted ? 'count' : 'setup',
    shoe,
    selectedBucket,
    selectedDeckIndex: deckOptions.indexOf(shoe.deckCount),
    selectedMenuIndex: 0,
    guidePage: 0,
    notice: persisted ? 'Shoe restored' : 'Choose decks',
  }
}

export function persistState(state: AppState): void {
  const persisted: PersistedState = {
    shoe: state.shoe,
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

export function cycleGuidePage(page: number, step: 1 | -1): number {
  return wrapIndex(page + step, guidePages.length)
}

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
    'INDEX DRILLS',
    'Insurance: TC >= +3',
    '16 v 10: stand at TC >= 0',
    '15 v 10: stand at TC >= +4',
    '12 v 3 : stand at TC >= +2',
    '12 v 2 : stand at TC >= +3',
  ],
]

function loadPersistedState(): PersistedState | null {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (!parsed.shoe) return null

    const deckCount = normalizeDeckCount(parsed.shoe.deckCount)
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
      selectedBucket,
    }
  } catch {
    clearPersistedState()
    return null
  }
}

function isCardBucket(value: unknown): value is CardBucket {
  return value === 'low' || value === 'mid' || value === 'high'
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length
}
