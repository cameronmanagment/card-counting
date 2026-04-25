import { describe, expect, it } from 'vitest'
import { applyBucket, createShoe, defaultGameSettings } from '../src/counting'
import { renderGlasses, renderGlassesLayout } from '../src/glassesRender'
import { menuItems, type AppState } from '../src/state'

const textLineWidth = 58
const countDisplayLines = 8
const centeredMenuLines = 9
const upIcon = '\u2191'
const downIcon = '\u2193'
const underline = '\u0332'

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    mode: 'count',
    shoe: createShoe(6, new Date('2026-01-01T00:00:00.000Z')),
    settings: defaultGameSettings,
    selectedBucket: 'low',
    selectedDeckIndex: 3,
    selectedMenuIndex: 0,
    selectedSettingsIndex: 0,
    guidePage: 0,
    learnPage: 0,
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

describe('glasses renderer', () => {
  it('renders the count screen with concise self-contained navigation', () => {
    const shoe = applyBucket(applyBucket(createShoe(6), 'low'), 'high')
    const output = renderGlasses(state({ shoe, selectedBucket: 'high' }))
    const lines = output.split('\n')

    expect(output).not.toContain('HI-LO HUD')
    expect(output).toContain('RC: 0')
    expect(output).toContain('TCi: 0')
    expect(output).toContain('SEEN: 2/312')
    expect(output).toContain(`LAST: L H${underline}`)
    expect(output).toContain('TRUE: 0.0')
    expect(output).toContain('LEFT: 6.0D')
    expect(output).toContain('PEN: 1%')
    expect(output).not.toContain('INPUT')
    expect(output).not.toContain('Ready')
    expect(output).not.toContain('LOGGED')
    expect(output).toContain(`<${upIcon} HIGH -1>`)
    expect(output).toContain('TAP MID 0')
    expect(output).toContain(`${downIcon} LOW +1`)
    expect(output.indexOf(`${downIcon} LOW +1`)).toBeLessThan(output.indexOf('TAP MID 0'))
    expect(output.indexOf('TAP MID 0')).toBeLessThan(output.indexOf(`<${upIcon} HIGH -1>`))
    expect(output).not.toContain('DBL ACTIONS')
    expect(lines).toHaveLength(countDisplayLines)
    expect(lines[0]).toContain('SEEN: 2/312')
    expect(lines[1]).toBe('')
    expect(lines[6]).toBe('')
    expect(lines[4]).toContain(`LAST: L H${underline}`)
    expect(lines[5]).toBe('')
    expect(lines[7].indexOf(`${downIcon} LOW +1`)).toBeGreaterThan(5)
    expectFitsGlassesViewport(output)
  })

  it('positions count screen regions across the full 576px canvas', () => {
    const shoe = applyBucket(applyBucket(createShoe(6), 'low'), 'high')
    const layout = renderGlassesLayout(state({ shoe, selectedBucket: 'high', notice: 'HIGH logged' }))
    const byName = Object.fromEntries(layout.map((region) => [region.containerName, region]))

    expect(layout).toHaveLength(7)
    expectOneEventCapture(layout)
    expect(byName.left).toMatchObject({ xPosition: 0, yPosition: 0, width: 360, height: 196 })
    expect(byName.left.isEventCapture).toBe(0)
    expect(byName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
    expect(byName.r0.xPosition).toBe(byName.r1.xPosition)
    expect(byName.r1.xPosition).toBe(byName.r2.xPosition)
    expect(byName.r2.xPosition).toBe(byName.r3.xPosition)
    expect(byName.r0.xPosition + byName.r0.width).toBe(576)
    expect(byName.r1.xPosition).toBeGreaterThanOrEqual(360)
    expect(byName.r1.yPosition).toBe(56)
    expect(byName.rail).toBeUndefined()
    expect(byName.actions.xPosition).toBeGreaterThan(100)
    expect(byName.r1.content).toContain('TRUE: 0.0')
    expect(byName.left.content).toContain(`LAST: L H${underline}`)
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
    const rightRegionNames = ['r0', 'r1', 'r2', 'r3']

    rightRegionNames.forEach((name) => {
      expect(grownByName[name].xPosition).toBe(baseByName[name].xPosition)
      expect(grownByName[name].width).toBe(baseByName[name].width)
      expect(grownByName[name].content.trimStart()).toBe(grownByName[name].content.trim())
    })

    expect(grownByName.r1.content.trim()).toContain('TRUE: +')
    expect(grownByName.r1.content.length).toBeGreaterThan(grownByName.r1.content.trimStart().length)
  })

  it('renders an actions menu with a safe resume path', () => {
    const output = renderGlasses(state({ mode: 'menu' }))
    const lines = output.split('\n')
    const menuLines = lines.filter((line) => line.trim().length > 0)

    expect(output).toContain('Resume count')
    expect(output).toContain('Undo last')
    expect(output).toContain('New shoe')
    expect(output).toContain('Settings')
    expect(output).toContain('Learn')
    expect(output).toContain('Reference')
    expect(output).toContain('Exit')
    expect(output).not.toContain('HI-LO ACTIONS')
    expect(output).not.toContain('ACTION MENU')
    expect(output).not.toContain('SWIPE BROWSE')
    expect(output).not.toContain('DBL RESUME')
    expect(output).not.toContain('Double system exit')
    expect(lines).toHaveLength(centeredMenuLines)
    expect(lines[0]).toBe('')
    expect(menuLines).toHaveLength(7)
    expect(menuLines[0].indexOf('Resume count')).toBe(2)
    expect(menuLines[0].indexOf('>')).toBe(0)
    expect(menuLines[6].indexOf('Exit')).toBe(2)
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

  it('keeps the menu layout stable as selection changes', () => {
    const firstLayout = renderGlassesLayout(state({ mode: 'menu', selectedMenuIndex: 0 }))
    const laterLayout = renderGlassesLayout(state({ mode: 'menu', selectedMenuIndex: 3 }))
    const firstByName = Object.fromEntries(firstLayout.map((region) => [region.containerName, region]))
    const laterByName = Object.fromEntries(laterLayout.map((region) => [region.containerName, region]))
    const firstMenuLines = firstByName['menu-list'].content.split('\n')
    const laterMenuLines = laterByName['menu-list'].content.split('\n')

    expect(firstLayout).toHaveLength(2)
    expectOneEventCapture(firstLayout)
    expectOneEventCapture(laterLayout)
    expect(firstByName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
    expect(firstByName['menu-list']).toMatchObject({ xPosition: 0, yPosition: 46, width: 576, height: 196 })
    expect(laterByName['menu-list']).toMatchObject({
      xPosition: firstByName['menu-list'].xPosition,
      yPosition: firstByName['menu-list'].yPosition,
      width: firstByName['menu-list'].width,
      height: firstByName['menu-list'].height,
    })
    expect(firstMenuLines[0].indexOf('>')).toBe(0)
    expect(laterMenuLines[3].indexOf('>')).toBe(0)

    menuItems.forEach((item, index) => {
      expect(firstMenuLines[index]).toContain(item)
      expect(laterMenuLines[index]).toContain(item)
      expect(firstMenuLines[index].indexOf(item)).toBe(laterMenuLines[index].indexOf(item))
      expect(firstMenuLines[index].indexOf(item)).toBe(2)
    })
  })

  it('renders settings with selected game condition and one event capture', () => {
    const output = renderGlasses(state({ mode: 'settings', selectedSettingsIndex: 2 }))
    const layout = renderGlassesLayout(state({ mode: 'settings', selectedSettingsIndex: 2 }))
    const byName = Object.fromEntries(layout.map((region) => [region.containerName, region]))

    expect(output).toContain('SETTINGS')
    expect(output).toContain('6D / S17 / DAS / LS')
    expect(output).toContain('> DOUBLE AFTER SPLIT')
    expect(output).toContain('LATE SURRENDER')
    expectFitsGlassesViewport(output)
    expect(layout).toHaveLength(3)
    expectOneEventCapture(layout)
    expect(byName['settings-left']).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, isEventCapture: 0 })
    expect(byName['settings-right']).toMatchObject({ xPosition: 376, yPosition: 0, width: 200, isEventCapture: 0 })
    expect(byName['settings-right'].content.split('\n')[0].trim()).toBe('3/4')
    expect(byName['settings-right'].content.split('\n')[5].trim()).toBe('ON')
    expect(byName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
  })

  it('renders concise learn pages on the glasses', () => {
    const output = renderGlasses(state({ mode: 'learn', learnPage: 3 }))
    const layout = renderGlassesLayout(state({ mode: 'learn', learnPage: 3 }))
    const byName = Object.fromEntries(layout.map((region) => [region.containerName, region]))

    expect(output).toContain('LEARN 4/5')
    expect(output).toContain('USE THE APP')
    expect(output).toContain('Swipe up for HIGH 10-A.')
    expect(output).toContain('Double tap opens menu options.')
    expectFitsGlassesViewport(output)
    expect(layout).toHaveLength(3)
    expectOneEventCapture(layout)
    expect(byName['learn-left']).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 196 })
    expect(byName['learn-right']).toMatchObject({ xPosition: 410, yPosition: 0, width: 166, height: 196 })
    expect(byName['learn-right'].content.split('\n')[0]).toBe('USE THE APP')
    expect(byName.input).toMatchObject({ xPosition: 0, yPosition: 0, width: 576, height: 288, isEventCapture: 1 })
  })

  it('renders setup across the full glasses width without navigation hints', () => {
    const output = renderGlasses(state({ mode: 'setup' }))
    const lines = output.split('\n')

    expect(output).toContain('HI-LO SETUP')
    expect(output).toContain('SHOE SIZE')
    expect(output).toContain('<< 6D SHOE >>')
    expect(output).not.toContain('SWIPE SIZE')
    expect(output).not.toContain('TAP START')
    expect(output).not.toContain('DBL BACK')
    expect(lines[0]).toMatch(/^HI-LO SETUP\s+DECKS$/)
    expect(lines[2]).toMatch(/^SHOE SIZE\s+<< 6D SHOE >>$/)
    expectFitsGlassesViewport(output)
  })

  it('captures setup navigation without making setup text scrollable', () => {
    const layout = renderGlassesLayout(state({ mode: 'setup' }))
    const byName = Object.fromEntries(layout.map((region) => [region.containerName, region]))

    expect(layout).toHaveLength(2)
    expectOneEventCapture(layout)
    expect(byName.setup).toMatchObject({
      xPosition: 0,
      yPosition: 0,
      width: 576,
      isEventCapture: 0,
    })
    expect(byName.input).toMatchObject({
      xPosition: 0,
      yPosition: 0,
      width: 576,
      height: 288,
      content: ' ',
      isEventCapture: 1,
    })
  })

  it('keeps every reference page inside the glasses viewport', () => {
    const expectedTitles = ['COUNT TABLE', 'TRUE COUNT', 'I18 1-6', 'I18 7-12', 'I18 13-18', 'FAB 4', 'S17 EXTRAS']

    expectedTitles.forEach((title, guidePage) => {
      const output = renderGlasses(state({ mode: 'guide', guidePage }))

      expect(output).toContain(`HI-LO REF ${guidePage + 1}/7`)
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
        left: ['HI-LO REF 1/7', 'LOW 2-6', 'MID 7-9', 'HIGH 10-A', '', 'LOG EVERY EXPOSED CARD'],
        right: ['COUNT TABLE', '+1', '0', '-1', '', ''],
      },
      {
        title: 'TRUE COUNT',
        left: ['HI-LO REF 2/7', 'RC', 'DECKS LEFT', 'TC', 'TCi', 'COLD', 'WATCH', 'FAV', 'STRONG'],
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
        title: 'I18 1-6',
        left: ['HI-LO REF 3/7', 'INSURANCE', '16 v 10', '15 v 10', 'T,T v 5', 'T,T v 6', '10 v 10'],
        right: ['I18 1-6', '>= +3', '>= 0', '>= +4', '>= +5', '>= +4', '>= +4'],
      },
      {
        title: 'I18 7-12',
        left: ['HI-LO REF 4/7', '12 v 3', '12 v 2', '11 v A', '9 v 2', '10 v A', '9 v 7'],
        right: ['I18 7-12', '>= +2', '>= +3', '>= +1', '>= +1', '>= +4', '>= +3'],
      },
      {
        title: 'I18 13-18',
        left: ['HI-LO REF 5/7', '16 v 9', '13 v 2', '12 v 4', '12 v 5', '12 v 6', '13 v 3'],
        right: ['I18 13-18', '>= +5', '>= -1', '>= 0', '>= -2', '>= -1', '>= -2'],
      },
      {
        title: 'FAB 4',
        left: ['HI-LO REF 6/7', '14 v 10', '15 v 10', '15 v 9', '15 v A', 'LATE SURRENDER ONLY'],
        right: ['FAB 4', '>= +3', '>= 0', '>= +2', '>= +1', ''],
      },
      {
        title: 'S17 EXTRAS',
        left: ['HI-LO REF 7/7', 'T,T v 4', 'A,8 v 4', 'A,8 v 5/6', 'A,6 v 2', '16 v 9', '8 v 6'],
        right: ['S17 EXTRAS', '>= +6', '>= +3', '>= +1', '>= +1', '>= +4', '>= +2'],
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
