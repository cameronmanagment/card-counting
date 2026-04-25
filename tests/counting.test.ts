import { describe, expect, it } from 'vitest'
import { applyBucket, createShoe, getShoeStats, undoLast } from '../src/counting'

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
})
