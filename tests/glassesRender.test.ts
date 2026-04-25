import { describe, expect, it } from 'vitest'
import { applyBucket, createShoe } from '../src/counting'
import { renderGlasses, renderGlassesLayout } from '../src/glassesRender'
import { menuItems, type AppState } from '../src/state'

const textLineWidth = 58
const countDisplayLines = 8
const centeredMenuLines = 9
const upIcon = '\u2191'
const downIcon = '\u2193'

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    mode: 'count',
    shoe: createShoe(6, new Date('2026-01-01T00:00:00.000Z')),
    selectedBucket: 'low',
    selectedDeckIndex: 3,
    selectedMenuIndex: 0,
    guidePage: 0,
    notice: 'Ready',
    ...overrides,
  }
}

function expectFitsGlassesViewport(output: string): void {
  const lines = output.split('\n')

  expect(lines.length).toBeGreaterThanOrEqual(5)
  expect(lines.length).toBeLessThanOrEqual(centeredMenuLines)
  expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(textLineWidth)
}

function expectOneEventCapture(layout: ReturnType<typeof renderGlassesLayout>): void {
  expect(layout.filter((region) => region.isEventCapture === 1)).toHaveLength(1)
}

function estimateTextPixelWidth(value: string): number {
  return [...value].reduce((width, char) => width + estimateCharPixelWidth(char), 0)
}

function estimateCharPixelWidth(char: string): number {
  if (char === ' ') return 5
  if (char === '1' || char === 'I' || char === 'l' || char === 'i') return 7
  if (char === '.' || char === ',' || char === ':' || char === ';') return 5
  if (char === '+' || char === '-' || char === '|' || char === '/' || char === '<' || char === '>') return 8
  if (char === upIcon || char === downIcon) return 14
  if (/[0-9]/.test(char)) return 10
  if (/[A-Z]/.test(char)) return 13
  return 10
}

function expectTextRegionCentered(region: ReturnType<typeof renderGlassesLayout>[number]): void {
  const textCenter = region.xPosition + estimateTextPixelWidth(region.content) / 2

  expect(Math.abs(textCenter - 288)).toBeLessThanOrEqual(1)
}

describe('glasses renderer', () => {
  it('renders the count screen with concise self-contained navigation', () => {
    const shoe = applyBucket(applyBucket(createShoe(6), 'low'), 'high')
    const output = renderGlasses(state({ shoe, selectedBucket: 'high' }))
    const lines = output.split('\n')

    expect(output).toContain('HI-LO HUD')
    expect(output).toContain('RC: 0')
    expect(output).toContain('TCi: 0')
    expect(output).toContain('SEEN: 2/312')
    expect(output).toContain('LAST: L H')
    expect(output).toContain('TRUE 0.0')
    expect(output).toContain('LEFT 6.0D')
    expect(output).toContain('PEN 1%')
    expect(output).not.toContain('INPUT')
    expect(output).toContain('Ready')
    expect(output).toContain(`<${upIcon} HIGH -1>`)
    expect(output).toContain('TAP MID 0')
    expect(output).toContain(`${downIcon} LOW +1`)
    expect(output.indexOf(`${downIcon} LOW +1`)).toBeLessThan(output.indexOf('TAP MID 0'))
    expect(output.indexOf('TAP MID 0')).toBeLessThan(output.indexOf(`<${upIcon} HIGH -1>`))
    expect(output).not.toContain('DBL ACTIONS')
    expect(lines).toHaveLength(countDisplayLines)
    expect(lines[1]).toBe('')
    expect(lines[6]).toBe('')
    expect(lines[5]).toContain('LAST: L H')
    expect(lines[5].trimEnd().endsWith('Ready')).toBe(true)
    expect(lines[5].indexOf('Ready')).toBeGreaterThan(45)
    expect(lines[7].indexOf(`${downIcon} LOW +1`)).toBeGreaterThan(5)
    expectFitsGlassesViewport(output)
  })

  it('positions count screen regions across the full 576px canvas', () => {
    const shoe = applyBucket(applyBucket(createShoe(6), 'low'), 'high')
    const layout = renderGlassesLayout(state({ shoe, selectedBucket: 'high', notice: 'HIGH logged' }))
    const byName = Object.fromEntries(layout.map((region) => [region.containerName, region]))

    expect(layout).toHaveLength(8)
    expectOneEventCapture(layout)
    expect(byName.left).toMatchObject({ xPosition: 0, yPosition: 0, width: 360, height: 196 })
    expect(byName.left.isEventCapture).toBe(0)
    expect(byName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
    expect(byName.r0.xPosition).toBe(byName.r1.xPosition)
    expect(byName.r1.xPosition).toBe(byName.r2.xPosition)
    expect(byName.r2.xPosition).toBe(byName.r3.xPosition)
    expect(byName.r3.xPosition).toBe(byName.rail.xPosition)
    expect(byName.r0.xPosition + byName.r0.width).toBe(576)
    expect(byName.r1.xPosition).toBeGreaterThanOrEqual(360)
    expect(byName.r1.yPosition).toBe(56)
    expect(byName.rail.yPosition).toBe(140)
    expect(byName.rail.xPosition + byName.rail.width).toBe(byName.r3.xPosition + byName.r3.width)
    expect(byName.actions.xPosition).toBeGreaterThan(100)
    expect(byName.r1.content).toContain('TRUE 0.0')
    expect(byName.rail.content.trim()).toBe('HIGH LOGGED')
    expect(byName.actions.content).toContain(`${downIcon} LOW +1 | TAP MID 0 | <${upIcon} HIGH -1>`)
  })

  it('keeps right rail positions stable as right-side values grow', () => {
    const baseLayout = renderGlassesLayout(state())
    let grownShoe = createShoe(6)

    for (let index = 0; index < 120; index += 1) {
      grownShoe = applyBucket(grownShoe, 'low')
    }

    const grownLayout = renderGlassesLayout(state({ shoe: grownShoe, selectedBucket: 'low', notice: 'LOW logged' }))
    const baseByName = Object.fromEntries(baseLayout.map((region) => [region.containerName, region]))
    const grownByName = Object.fromEntries(grownLayout.map((region) => [region.containerName, region]))
    const rightRegionNames = ['r0', 'r1', 'r2', 'r3', 'rail']

    rightRegionNames.forEach((name) => {
      expect(grownByName[name].xPosition).toBe(baseByName[name].xPosition)
      expect(grownByName[name].width).toBe(baseByName[name].width)
      expect(grownByName[name].content.trimStart()).toBe(grownByName[name].content.trim())
    })

    expect(grownByName.r1.content.trim()).toContain('TRUE +')
    expect(grownByName.r1.content.length).toBeGreaterThan(grownByName.r1.content.trimStart().length)
  })

  it('renders an actions menu with a safe resume path', () => {
    const output = renderGlasses(state({ mode: 'menu' }))
    const lines = output.split('\n')
    const menuLines = lines.filter((line) => line.trim().length > 0)

    expect(output).toContain('Resume count')
    expect(output).toContain('Undo last')
    expect(output).toContain('New shoe')
    expect(output).toContain('Change decks')
    expect(output).toContain('Reference')
    expect(output).toContain('Exit')
    expect(output).not.toContain('HI-LO ACTIONS')
    expect(output).not.toContain('ACTION MENU')
    expect(output).not.toContain('SWIPE BROWSE')
    expect(output).not.toContain('DBL RESUME')
    expect(output).not.toContain('Double system exit')
    expect(lines).toHaveLength(centeredMenuLines)
    expect(lines.slice(0, 2).every((line) => line === '')).toBe(true)
    expect(menuLines).toHaveLength(6)
    expect(menuLines[0].indexOf('Resume count')).toBeGreaterThanOrEqual(20)
    expect(menuLines[0].indexOf('>')).toBe(menuLines[0].indexOf('Resume count') - 3)
    expect(menuLines[5].indexOf('Exit')).toBeGreaterThan(menuLines[0].indexOf('Resume count'))
    expectFitsGlassesViewport(output)
  })

  it('keeps fallback menu label positions stable as selection changes', () => {
    const firstSelected = renderGlasses(state({ mode: 'menu', selectedMenuIndex: 0 })).split('\n')
    const laterSelected = renderGlasses(state({ mode: 'menu', selectedMenuIndex: 3 })).split('\n')

    menuItems.forEach((item) => {
      const firstLine = firstSelected.find((line) => line.includes(item))
      const laterLine = laterSelected.find((line) => line.includes(item))

      expect(firstLine?.indexOf(item)).toBe(laterLine?.indexOf(item))
    })
  })

  it('centers menu rows on the glasses canvas', () => {
    const firstLayout = renderGlassesLayout(state({ mode: 'menu', selectedMenuIndex: 0 }))
    const laterLayout = renderGlassesLayout(state({ mode: 'menu', selectedMenuIndex: 3 }))
    const firstByName = Object.fromEntries(firstLayout.map((region) => [region.containerName, region]))
    const laterByName = Object.fromEntries(laterLayout.map((region) => [region.containerName, region]))

    expect(firstLayout).toHaveLength(8)
    expectOneEventCapture(firstLayout)
    expectOneEventCapture(laterLayout)
    expect(firstByName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
    expect(firstByName['menu-0']).toMatchObject({ yPosition: 60, height: 28, content: 'Resume count' })
    expect(firstByName['menu-5']).toMatchObject({ yPosition: 200, height: 28, content: 'Exit' })
    expect(firstByName['menu-marker'].yPosition).toBe(firstByName['menu-0'].yPosition)
    expect(laterByName['menu-marker'].yPosition).toBe(laterByName['menu-3'].yPosition)

    menuItems.forEach((item, index) => {
      const name = `menu-${index}`

      expect(firstByName[name].content).toBe(item)
      expect(firstByName[name].content).toBe(firstByName[name].content.trim())
      expectTextRegionCentered(firstByName[name])
      expect(laterByName[name].xPosition).toBe(firstByName[name].xPosition)
      expect(laterByName[name].yPosition).toBe(firstByName[name].yPosition)
    })
  })

  it('keeps setup navigation clear on the glasses', () => {
    const output = renderGlasses(state({ mode: 'setup' }))

    expect(output).toContain('HI-LO SETUP')
    expect(output).toContain('SHOE SIZE')
    expect(output).toContain('<< 6D SHOE >>')
    expect(output).toContain('SWIPE SIZE')
    expect(output).toContain('TAP START')
    expectFitsGlassesViewport(output)
  })

  it('keeps every reference page inside the glasses viewport', () => {
    const expectedTitles = ['COUNT TABLE', 'TRUE COUNT', 'INDEX DRILLS']

    expectedTitles.forEach((title, guidePage) => {
      const output = renderGlasses(state({ mode: 'guide', guidePage }))

      expect(output).toContain(`HI-LO REF ${guidePage + 1}/3`)
      expect(output).toContain(title)
      expect(output).not.toContain('SWIPE PAGE')
      expect(output).not.toContain('TAP BACK')
      expect(output).not.toContain('DBL BACK')
      expectFitsGlassesViewport(output)
    })
  })

  it('aligns every reference page to the full left and right edges', () => {
    const expectedPages = [
      {
        title: 'COUNT TABLE',
        left: ['HI-LO REF 1/3', 'LOW 2-6', 'MID 7-9', 'HIGH 10-A', '', 'LOG EVERY EXPOSED CARD'],
        right: ['COUNT TABLE', '+1', '0', '-1', '', ''],
      },
      {
        title: 'TRUE COUNT',
        left: ['HI-LO REF 2/3', 'RC', 'DECKS LEFT', 'TC', 'TCi', 'COLD', 'WATCH', 'FAV', 'STRONG'],
        right: [
          'TRUE COUNT',
          'RUNNING',
          'REMAIN',
          'RC / LEFT',
          'TOWARD 0',
          '<= -1',
          '+1',
          '+2/+3',
          '>= +4',
        ],
      },
      {
        title: 'INDEX DRILLS',
        left: ['HI-LO REF 3/3', 'INSURANCE', '16 v 10', '15 v 10', '12 v 3', '12 v 2'],
        right: ['INDEX DRILLS', '>= +3', '>= 0', '>= +4', '>= +2', '>= +3'],
      },
    ]

    expectedPages.forEach((expectedPage, guidePage) => {
      const layout = renderGlassesLayout(state({ mode: 'guide', guidePage }))
      const byName = Object.fromEntries(layout.map((region) => [region.containerName, region]))
      const leftLines = byName['guide-left'].content.split('\n')
      const rightLines = byName['guide-right'].content.split('\n')

      expect(layout).toHaveLength(3)
      expectOneEventCapture(layout)
      expect(byName['guide-left']).toMatchObject({
        xPosition: 0,
        yPosition: 0,
        width: 576,
        height: expectedPage.left.length * 28,
      })
      expect(byName['guide-right']).toMatchObject({
        xPosition: 410,
        yPosition: 0,
        width: 166,
        height: expectedPage.right.length * 28,
      })
      expect(byName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
      expect(leftLines).toEqual(expectedPage.left)
      expect(rightLines).toEqual(expectedPage.right)
      expect(rightLines[0]).toBe(expectedPage.title)

      leftLines.forEach((line) => {
        expect(line).toBe(line.trimStart())
      })

      rightLines.forEach((line) => {
        expect(line).toBe(line.trim())
        expect(estimateTextPixelWidth(line)).toBeLessThanOrEqual(byName['guide-right'].width)
      })
    })
  })
})
