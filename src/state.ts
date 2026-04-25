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

export type AppMode = 'setup' | 'count' | 'menu' | 'guide' | 'settings'

export interface AppState {
  mode: AppMode
  shoe: ReturnType<typeof createShoe>
  settings: GameSettings
  selectedBucket: CardBucket
  selectedDeckIndex: number
  selectedMenuIndex: number
  selectedSettingsIndex: number
  guidePage: number
  notice: string
}

export const menuItems = ['Resume count', 'Undo last', 'New shoe', 'Settings', 'Reference', 'Exit'] as const
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
