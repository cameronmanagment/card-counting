export const deckOptions = [1, 2, 4, 6, 8] as const
export const dealerSoft17Options = ['S17', 'H17'] as const

export type DeckCount = (typeof deckOptions)[number]
export type DealerSoft17 = (typeof dealerSoft17Options)[number]
export type CardBucket = 'low' | 'mid' | 'high'
export type DeviationCategory = 'Illustrious 18' | 'Fab 4' | 'Expanded S17'
export type DeviationSource = 'Wizard of Odds' | 'Blackjack Apprenticeship'

export interface BucketCounts {
  low: number
  mid: number
  high: number
}

export interface ShoeState {
  deckCount: DeckCount
  runningCount: number
  cardsSeen: number
  bucketCounts: BucketCounts
  history: CardBucket[]
  startedAt: string
  updatedAt: string
}

export interface GameSettings {
  deckCount: DeckCount
  dealerSoft17: DealerSoft17
  doubleAfterSplit: boolean
  lateSurrender: boolean
}

export interface ShoeStats {
  totalCards: number
  cardsRemaining: number
  decksRemaining: number
  penetrationPct: number
  trueCount: number
  indexTrueCount: number
  cue: 'Cold' | 'Neutral' | 'Watch' | 'Favorable' | 'Strong'
  isComplete: boolean
}

export interface CountReferenceRow {
  label: string
  cards: string
  delta: number
  bucket: CardBucket
}

export interface CueReferenceRow {
  cue: ShoeStats['cue']
  range: string
  meaning: string
}

export interface IndexReferenceRow {
  play: string
  trigger: string
  note: string
}

export interface DeviationReferenceRow {
  priority?: number
  play: string
  index: number
  indexLabel: string
  action: string
  category: DeviationCategory
  source: DeviationSource
  requiresLateSurrender?: boolean
  s17ChartOnly?: boolean
}

export interface DeviationAvailability {
  isAvailable: boolean
  note: string
}

export const defaultGameSettings: GameSettings = {
  deckCount: 6,
  dealerSoft17: 'S17',
  doubleAfterSplit: true,
  lateSurrender: true,
}

export const bucketLabels: Record<CardBucket, string> = {
  low: 'LOW 2-6',
  mid: 'MID 7-9',
  high: 'HIGH 10-A',
}

export const bucketShortLabels: Record<CardBucket, string> = {
  low: 'L',
  mid: 'M',
  high: 'H',
}

export const bucketDeltas: Record<CardBucket, number> = {
  low: 1,
  mid: 0,
  high: -1,
}

export const bucketOrder: CardBucket[] = ['low', 'mid', 'high']

export const countReferenceRows: CountReferenceRow[] = [
  { label: 'Low cards', cards: '2 3 4 5 6', delta: 1, bucket: 'low' },
  { label: 'Middle cards', cards: '7 8 9', delta: 0, bucket: 'mid' },
  { label: 'High cards', cards: '10 J Q K A', delta: -1, bucket: 'high' },
]

export const cueReferenceRows: CueReferenceRow[] = [
  { cue: 'Cold', range: 'TCi <= -1', meaning: 'Shoe favors high cards less' },
  { cue: 'Neutral', range: 'TCi 0', meaning: 'Baseline practice state' },
  { cue: 'Watch', range: 'TCi +1', meaning: 'Count is starting to matter' },
  { cue: 'Favorable', range: 'TCi +2 to +3', meaning: 'Useful index drill range' },
  { cue: 'Strong', range: 'TCi >= +4', meaning: 'High-value drill range' },
]

export const indexReferenceRows: IndexReferenceRow[] = [
  { play: 'Insurance', trigger: 'TC >= +3', note: 'Take insurance/even money' },
  { play: '16 vs 10', trigger: 'TC >= 0', note: 'Stand instead of hit' },
  { play: '15 vs 10', trigger: 'TC >= +4', note: 'Stand instead of hit' },
  { play: '10,10 vs 5', trigger: 'TC >= +5', note: 'Split 10s' },
  { play: '10,10 vs 6', trigger: 'TC >= +4', note: 'Split 10s' },
]

export const illustrious18Rows: DeviationReferenceRow[] = [
  deviation(1, 'Insurance', 3, 'Take insurance/even money', 'Illustrious 18', 'Wizard of Odds'),
  deviation(2, '16 vs 10', 0, 'Stand instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(3, '15 vs 10', 4, 'Stand instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(4, '10,10 vs 5', 5, 'Split 10s', 'Illustrious 18', 'Wizard of Odds'),
  deviation(5, '10,10 vs 6', 4, 'Split 10s', 'Illustrious 18', 'Wizard of Odds'),
  deviation(6, '10 vs 10', 4, 'Double instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(7, '12 vs 3', 2, 'Stand instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(8, '12 vs 2', 3, 'Stand instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(9, '11 vs A', 1, 'Double instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(10, '9 vs 2', 1, 'Double instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(11, '10 vs A', 4, 'Double instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(12, '9 vs 7', 3, 'Double instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(13, '16 vs 9', 5, 'Stand instead of hit', 'Illustrious 18', 'Wizard of Odds'),
  deviation(14, '13 vs 2', -1, 'Stand at -1 or higher', 'Illustrious 18', 'Wizard of Odds'),
  deviation(15, '12 vs 4', 0, 'Stand at 0 or higher', 'Illustrious 18', 'Wizard of Odds'),
  deviation(16, '12 vs 5', -2, 'Stand at -2 or higher', 'Illustrious 18', 'Wizard of Odds'),
  deviation(17, '12 vs 6', -1, 'Stand at -1 or higher', 'Illustrious 18', 'Wizard of Odds'),
  deviation(18, '13 vs 3', -2, 'Stand at -2 or higher', 'Illustrious 18', 'Wizard of Odds'),
]

export const fab4SurrenderRows: DeviationReferenceRow[] = [
  deviation(1, '14 vs 10', 3, 'Surrender', 'Fab 4', 'Wizard of Odds', { requiresLateSurrender: true }),
  deviation(2, '15 vs 10', 0, 'Surrender', 'Fab 4', 'Wizard of Odds', { requiresLateSurrender: true }),
  deviation(3, '15 vs 9', 2, 'Surrender', 'Fab 4', 'Wizard of Odds', { requiresLateSurrender: true }),
  deviation(4, '15 vs A', 1, 'Surrender', 'Fab 4', 'Wizard of Odds', { requiresLateSurrender: true }),
]

export const expandedS17DeviationRows: DeviationReferenceRow[] = [
  deviation(undefined, 'Insurance/even money', 3, 'Take it', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '10,10 vs 4', 6, 'Split 10s', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '10,10 vs 5', 5, 'Split 10s', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '10,10 vs 6', 4, 'Split 10s', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, 'A,8 vs 4', 3, 'Double instead of stand', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, 'A,8 vs 5', 1, 'Double instead of stand', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, 'A,8 vs 6', 1, 'Double instead of stand', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, 'A,6 vs 2', 1, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '16 vs 9', 4, 'Stand instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '16 vs 10', 0, 'Stand at any positive running count', 'Expanded S17', 'Blackjack Apprenticeship', {
    indexLabel: '0+',
    s17ChartOnly: true,
  }),
  deviation(undefined, '15 vs 10', 4, 'Stand instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '12 vs 2', 3, 'Stand instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '12 vs 3', 2, 'Stand instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '12 vs 4', 0, 'Hit at any negative running count; otherwise stand', 'Expanded S17', 'Blackjack Apprenticeship', {
    indexLabel: '0-',
    s17ChartOnly: true,
  }),
  deviation(undefined, '11 vs A', 1, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '10 vs 10', 4, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '10 vs A', 4, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '9 vs 2', 1, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '9 vs 7', 3, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
  deviation(undefined, '8 vs 6', 2, 'Double instead of hit', 'Expanded S17', 'Blackjack Apprenticeship', {
    s17ChartOnly: true,
  }),
]

export const allDeviationRows: DeviationReferenceRow[] = [
  ...illustrious18Rows,
  ...fab4SurrenderRows,
  ...expandedS17DeviationRows,
]

export function createShoe(deckCount: DeckCount, now = new Date()): ShoeState {
  const timestamp = now.toISOString()

  return {
    deckCount,
    runningCount: 0,
    cardsSeen: 0,
    bucketCounts: { low: 0, mid: 0, high: 0 },
    history: [],
    startedAt: timestamp,
    updatedAt: timestamp,
  }
}

export function totalCards(deckCount: DeckCount): number {
  return deckCount * 52
}

export function getShoeStats(shoe: ShoeState): ShoeStats {
  const total = totalCards(shoe.deckCount)
  const cardsRemaining = Math.max(total - shoe.cardsSeen, 0)
  const decksRemaining = cardsRemaining / 52
  const trueCountDenominator = Math.max(decksRemaining, 0.25)
  const trueCount = shoe.runningCount / trueCountDenominator
  const indexTrueCount = trueCount < 0 ? Math.ceil(trueCount) : Math.floor(trueCount)
  const penetrationPct = total === 0 ? 0 : (shoe.cardsSeen / total) * 100

  return {
    totalCards: total,
    cardsRemaining,
    decksRemaining,
    penetrationPct,
    trueCount,
    indexTrueCount,
    cue: getCue(indexTrueCount),
    isComplete: cardsRemaining === 0,
  }
}

export function applyBucket(shoe: ShoeState, bucket: CardBucket, now = new Date()): ShoeState {
  const stats = getShoeStats(shoe)
  if (stats.isComplete) {
    return { ...shoe, updatedAt: now.toISOString() }
  }

  return {
    ...shoe,
    runningCount: shoe.runningCount + bucketDeltas[bucket],
    cardsSeen: shoe.cardsSeen + 1,
    bucketCounts: {
      ...shoe.bucketCounts,
      [bucket]: shoe.bucketCounts[bucket] + 1,
    },
    history: [...shoe.history, bucket],
    updatedAt: now.toISOString(),
  }
}

export function undoLast(shoe: ShoeState, now = new Date()): ShoeState {
  const lastBucket = shoe.history.at(-1)
  if (!lastBucket) {
    return { ...shoe, updatedAt: now.toISOString() }
  }

  return {
    ...shoe,
    runningCount: shoe.runningCount - bucketDeltas[lastBucket],
    cardsSeen: Math.max(shoe.cardsSeen - 1, 0),
    bucketCounts: {
      ...shoe.bucketCounts,
      [lastBucket]: Math.max(shoe.bucketCounts[lastBucket] - 1, 0),
    },
    history: shoe.history.slice(0, -1),
    updatedAt: now.toISOString(),
  }
}

export function normalizeDeckCount(value: unknown, fallback: DeckCount = 6): DeckCount {
  const numericValue = Number(value)
  return deckOptions.includes(numericValue as DeckCount) ? (numericValue as DeckCount) : fallback
}

export function normalizeDealerSoft17(value: unknown, fallback: DealerSoft17 = 'S17'): DealerSoft17 {
  return dealerSoft17Options.includes(value as DealerSoft17) ? (value as DealerSoft17) : fallback
}

export function normalizeGameSettings(value: unknown, fallback: GameSettings = defaultGameSettings): GameSettings {
  const maybeSettings = value && typeof value === 'object' ? (value as Partial<GameSettings>) : {}

  return {
    deckCount: normalizeDeckCount(maybeSettings.deckCount, fallback.deckCount),
    dealerSoft17: normalizeDealerSoft17(maybeSettings.dealerSoft17, fallback.dealerSoft17),
    doubleAfterSplit:
      typeof maybeSettings.doubleAfterSplit === 'boolean' ? maybeSettings.doubleAfterSplit : fallback.doubleAfterSplit,
    lateSurrender: typeof maybeSettings.lateSurrender === 'boolean' ? maybeSettings.lateSurrender : fallback.lateSurrender,
  }
}

export function formatGameSettings(settings: GameSettings): string {
  return [
    `${settings.deckCount}D`,
    settings.dealerSoft17,
    settings.doubleAfterSplit ? 'DAS' : 'No DAS',
    settings.lateSurrender ? 'LS' : 'No LS',
  ].join(' / ')
}

export function matchesIndexAssumptions(settings: GameSettings): boolean {
  return (
    settings.deckCount === 6 &&
    settings.dealerSoft17 === 'S17' &&
    settings.doubleAfterSplit &&
    settings.lateSurrender
  )
}

export function getDeviationAvailability(row: DeviationReferenceRow, settings: GameSettings): DeviationAvailability {
  if (row.requiresLateSurrender && !settings.lateSurrender) {
    return { isAvailable: false, note: 'Late surrender off' }
  }

  if (row.s17ChartOnly && settings.dealerSoft17 !== 'S17') {
    return { isAvailable: false, note: 'S17 chart' }
  }

  return { isAvailable: true, note: row.source }
}

function deviation(
  priority: number | undefined,
  play: string,
  index: number,
  action: string,
  category: DeviationCategory,
  source: DeviationSource,
  options: Partial<Pick<DeviationReferenceRow, 'indexLabel' | 'requiresLateSurrender' | 's17ChartOnly'>> = {},
): DeviationReferenceRow {
  return {
    priority,
    play,
    index,
    indexLabel: options.indexLabel ?? signed(index),
    action,
    category,
    source,
    requiresLateSurrender: options.requiresLateSurrender,
    s17ChartOnly: options.s17ChartOnly,
  }
}

function getCue(indexTrueCount: number): ShoeStats['cue'] {
  if (indexTrueCount <= -1) return 'Cold'
  if (indexTrueCount >= 4) return 'Strong'
  if (indexTrueCount >= 2) return 'Favorable'
  if (indexTrueCount >= 1) return 'Watch'
  return 'Neutral'
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}
