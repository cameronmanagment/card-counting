import { describe, expect, it } from 'vitest'
import {
  applyBucket,
  createShoe,
  defaultGameSettings,
  expandedS17DeviationRows,
  fab4SurrenderRows,
  getDeviationAvailability,
  getShoeStats,
  illustrious18Rows,
  normalizeGameSettings,
  undoLast,
} from '../src/counting'

describe('Hi-Lo counting engine', () => {
  it('applies low, mid, and high buckets with correct running count deltas', () => {
    let shoe = createShoe(6, new Date('2026-01-01T00:00:00.000Z'))

    shoe = applyBucket(shoe, 'low')
    shoe = applyBucket(shoe, 'mid')
    shoe = applyBucket(shoe, 'high')
    shoe = applyBucket(shoe, 'low')

    expect(shoe.runningCount).toBe(1)
    expect(shoe.cardsSeen).toBe(4)
    expect(shoe.bucketCounts).toEqual({ low: 2, mid: 1, high: 1 })
    expect(shoe.history).toEqual(['low', 'mid', 'high', 'low'])
  })

  it('uses cards seen to calculate decks remaining and true count', () => {
    let shoe = createShoe(1)

    for (let index = 0; index < 26; index += 1) {
      shoe = applyBucket(shoe, 'low')
    }

    const stats = getShoeStats(shoe)

    expect(stats.totalCards).toBe(52)
    expect(stats.cardsRemaining).toBe(26)
    expect(stats.decksRemaining).toBe(0.5)
    expect(stats.trueCount).toBe(52)
    expect(stats.indexTrueCount).toBe(52)
    expect(stats.penetrationPct).toBe(50)
  })

  it('undoes the last bucket and restores all derived counters', () => {
    let shoe = createShoe(2)

    shoe = applyBucket(shoe, 'high')
    shoe = applyBucket(shoe, 'mid')
    shoe = undoLast(shoe)

    expect(shoe.runningCount).toBe(-1)
    expect(shoe.cardsSeen).toBe(1)
    expect(shoe.bucketCounts).toEqual({ low: 0, mid: 0, high: 1 })
    expect(shoe.history).toEqual(['high'])
  })

  it('does not count past the end of the shoe', () => {
    let shoe = createShoe(1)

    for (let index = 0; index < 60; index += 1) {
      shoe = applyBucket(shoe, 'mid')
    }

    const stats = getShoeStats(shoe)

    expect(shoe.cardsSeen).toBe(52)
    expect(stats.cardsRemaining).toBe(0)
    expect(stats.isComplete).toBe(true)
  })

  it('ships the complete Illustrious 18 and Fab 4 decision tables', () => {
    expect(illustrious18Rows).toHaveLength(18)
    expect(fab4SurrenderRows).toHaveLength(4)
    expect(expandedS17DeviationRows).toHaveLength(20)
    expect(illustrious18Rows[0]).toMatchObject({ priority: 1, play: 'Insurance', index: 3 })
    expect(illustrious18Rows[17]).toMatchObject({ priority: 18, play: '13 vs 3', index: -2 })
    expect(fab4SurrenderRows.map((row) => row.play)).toEqual(['14 vs 10', '15 vs 10', '15 vs 9', '15 vs A'])
  })

  it('normalizes settings and disables unavailable surrender/S17-only rows', () => {
    const settings = normalizeGameSettings({
      deckCount: 8,
      dealerSoft17: 'H17',
      doubleAfterSplit: false,
      lateSurrender: false,
    })

    expect(settings).toEqual({
      deckCount: 8,
      dealerSoft17: 'H17',
      doubleAfterSplit: false,
      lateSurrender: false,
    })
    expect(getDeviationAvailability(fab4SurrenderRows[0], settings)).toEqual({
      isAvailable: false,
      note: 'Late surrender off',
    })
    expect(getDeviationAvailability(expandedS17DeviationRows[0], settings)).toEqual({
      isAvailable: false,
      note: 'S17 chart',
    })
    expect(getDeviationAvailability(illustrious18Rows[0], defaultGameSettings).isAvailable).toBe(true)
  })
})
