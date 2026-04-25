export const deckOptions = [1, 2, 4, 6, 8] as const

export type DeckCount = (typeof deckOptions)[number]
export type CardBucket = 'low' | 'mid' | 'high'

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
  { play: 'Insurance', trigger: 'TCi >= +3', note: 'Against dealer ace' },
  { play: '16 vs 10', trigger: 'TCi >= 0', note: 'Stand at or above zero' },
  { play: '15 vs 10', trigger: 'TCi >= +4', note: 'Stand on strong counts' },
  { play: '12 vs 3', trigger: 'TCi >= +2', note: 'Stand in favorable shoes' },
  { play: '12 vs 2', trigger: 'TCi >= +3', note: 'Stand in stronger shoes' },
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

function getCue(indexTrueCount: number): ShoeStats['cue'] {
  if (indexTrueCount <= -1) return 'Cold'
  if (indexTrueCount >= 4) return 'Strong'
  if (indexTrueCount >= 2) return 'Favorable'
  if (indexTrueCount >= 1) return 'Watch'
  return 'Neutral'
}
