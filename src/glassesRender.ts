import {
  type CardBucket,
  bucketDeltas,
  bucketShortLabels,
  formatGameSettings,
  getShoeStats,
} from './counting'
import {
  type AppState,
  guidePages,
  menuItems,
  selectedDeckCount,
  settingValueLabel,
  settingsItems,
} from './state'

const displayWidth = 48
const fullDisplayWidth = 58
const canvasWidth = 576
const canvasHeight = 288
const rightEdgeInset = 2
const rightRailX = 376
const guideRightColumnX = 410
const lineHeight = 28
const appTitle = 'Card Counting'
const upIcon = '\u2191'
const downIcon = '\u2193'

export interface GlassesTextRegion {
  xPosition: number
  yPosition: number
  width: number
  height: number
  containerID: number
  containerName: string
  content: string
  isEventCapture: 0 | 1
}

export function renderGlasses(state: AppState): string {
  switch (state.mode) {
    case 'setup':
      return renderSetup(state)
    case 'menu':
      return renderMenu(state)
    case 'guide':
      return renderGuide(state)
    case 'learn':
      return renderLearn(state)
    case 'settings':
      return renderSettings(state)
    case 'count':
    default:
      return renderCount(state)
  }
}

export function renderGlassesLayout(state: AppState): GlassesTextRegion[] {
  if (state.mode === 'count') return renderCountLayout(state)
  if (state.mode === 'menu') return renderMenuLayout(state)
  if (state.mode === 'guide') return renderGuideLayout(state)
  if (state.mode === 'learn') return renderLearnLayout(state)
  if (state.mode === 'settings') return renderSettingsLayout(state)
  if (state.mode === 'setup') return renderSetupLayout(state)

  return [
    textRegion({
      id: 1,
      name: 'main',
      x: 0,
      y: 0,
      width: 576,
      height: 288,
      content: renderGlasses(state),
      capture: true,
    }),
  ]
}

function renderSetupLayout(state: AppState): GlassesTextRegion[] {
  const content = renderSetup(state)

  return [
    textRegion({
      id: 1,
      name: 'setup',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: content.split('\n').length * lineHeight,
      content,
    }),
    textRegion({
      id: 8,
      name: 'input',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      content: ' ',
      capture: true,
    }),
  ]
}

function renderSetup(state: AppState): string {
  return pageLines([
    leftRight('HI-LO SETUP', 'DECKS', fullDisplayWidth),
    '',
    leftRight('SHOE SIZE', `<< ${selectedDeckCount(state)}D SHOE >>`, fullDisplayWidth),
    '',
    leftRight('PRACTICE ONLY', '', fullDisplayWidth),
  ], fullDisplayWidth)
}

function renderCount(state: AppState): string {
  return renderCountLines(state).join('\n')
}

function renderCountLayout(state: AppState): GlassesTextRegion[] {
  const { leftLines, rightLines, actionLine } = renderCountParts(state)

  return [
    textRegion({
      id: 1,
      name: 'left',
      x: 0,
      y: 0,
      width: 360,
      height: lineHeight * leftLines.length,
      content: leftLines.join('\n'),
    }),
    ...rightLines.map((line, index) =>
      rightTextRegion(line, index === 0 ? 0 : index + 1, 2 + index, `r${index}`),
    ),
    centeredTextRegion(6, 'actions', actionLine, 206, 34),
    textRegion({
      id: 7,
      name: 'input',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      content: ' ',
      capture: true,
    }),
  ]
}

function renderCountLines(state: AppState): string[] {
  const { leftLines, rightLines, actionLine } = renderCountParts(state)

  return [
    leftRight(leftLines[0], rightLines[0]),
    leftLines[1],
    leftRight(leftLines[2], rightLines[1]),
    leftRight(leftLines[3], rightLines[2]),
    leftRight(leftLines[4], rightLines[3]),
    leftLines[5],
    leftLines[6],
    fullCenter(actionLine),
  ]
}

function renderCountParts(state: AppState): {
  leftLines: string[]
  rightLines: string[]
  actionLine: string
} {
  const stats = getShoeStats(state.shoe)
  const lastCards = formatRecentCards(state.shoe.history.slice(-6))

  return {
    leftLines: [
      `SEEN: ${state.shoe.cardsSeen}/${stats.totalCards}`,
      '',
      `RC: ${signed(state.shoe.runningCount)}`,
      `TCi: ${signed(stats.indexTrueCount)}`,
      `LAST: ${lastCards || '-'}`,
      '',
      '',
    ],
    rightLines: [
      stats.cue.toUpperCase(),
      `TRUE: ${signedDecimal(stats.trueCount)}`,
      `LEFT: ${formatDecimal(stats.decksRemaining)}D`,
      `PEN: ${Math.round(stats.penetrationPct)}%`,
    ],
    actionLine: directInputLine(state.selectedBucket),
  }
}

function formatRecentCards(buckets: CardBucket[]): string {
  return buckets
    .map((bucket, index) => {
      const label = bucketShortLabels[bucket]
      return index === buckets.length - 1 ? `[${label}]` : label
    })
    .join(' ')
}

function renderMenu(state: AppState): string {
  return page(renderMenuLines(state), fullDisplayWidth)
}

function renderMenuLines(state: AppState): string[] {
  return [
    appTitle,
    '',
    ...menuItems.map((item, index) => menuLine(item, index === state.selectedMenuIndex)),
  ]
}

function menuLine(item: (typeof menuItems)[number], isSelected: boolean): string {
  const marker = isSelected ? '>' : ' '

  return fit(`${marker} ${glassesMenuLabel(item)}`, fullDisplayWidth).trimEnd()
}

function glassesMenuLabel(item: (typeof menuItems)[number]): string {
  return item === 'Learn' ? 'How to count' : item
}

function renderMenuLayout(state: AppState): GlassesTextRegion[] {
  const menuLines = renderMenuLines(state)

  return [
    textRegion({
      id: 1,
      name: 'menu-list',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: menuLines.length * lineHeight,
      content: menuLines.join('\n'),
    }),
    textRegion({
      id: 8,
      name: 'input',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      content: ' ',
      capture: true,
    }),
  ]
}

function renderSettings(state: AppState): string {
  return pageLines(settingsRowsFor(state), fullDisplayWidth)
}

function renderSettingsLayout(state: AppState): GlassesTextRegion[] {
  const rows = settingsSplitRowsFor(state)
  const rightWidth = canvasWidth - rightRailX - rightEdgeInset

  return [
    textRegion({
      id: 1,
      name: 'settings-left',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: rows.length * lineHeight,
      content: rows.map((row) => row.left).join('\n'),
    }),
    textRegion({
      id: 2,
      name: 'settings-right',
      x: rightRailX,
      y: 0,
      width: canvasWidth - rightRailX,
      height: rows.length * lineHeight,
      content: rows.map((row) => (row.right === undefined ? '' : rightAlignForWidth(row.right, rightWidth))).join('\n'),
    }),
    textRegion({
      id: 8,
      name: 'input',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      content: ' ',
      capture: true,
    }),
  ]
}

function settingsRowsFor(state: AppState): string[] {
  return settingsSplitRowsFor(state).map((row) =>
    row.right === undefined ? fit(row.left, fullDisplayWidth) : leftRight(row.left, row.right, fullDisplayWidth),
  )
}

function settingsSplitRowsFor(state: AppState): GuideRow[] {
  return [
    { left: 'SETTINGS', right: `${state.selectedSettingsIndex + 1}/${settingsItems.length}` },
    { left: fit(formatGameSettings(state.settings), fullDisplayWidth) },
    { left: '' },
    ...settingsItems.map((item, index) => {
      const marker = index === state.selectedSettingsIndex ? '>' : ' '
      const value = settingValueLabel(state.settings, item)
      return { left: `${marker} ${item.toUpperCase()}`, right: value }
    }),
  ]
}

function renderGuide(state: AppState): string {
  return pageLines(
    guideRowsFor(state).map((row) =>
      row.right === undefined ? row.left : leftRight(row.left, row.right, fullDisplayWidth),
    ),
    fullDisplayWidth,
  )
}

function renderGuideLayout(state: AppState): GlassesTextRegion[] {
  const rows = guideRowsFor(state)

  return [
    textRegion({
      id: 1,
      name: 'guide-left',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: rows.length * lineHeight,
      content: rows.map((row) => row.left).join('\n'),
    }),
    textRegion({
      id: 2,
      name: 'guide-right',
      x: guideRightColumnX,
      y: 0,
      width: canvasWidth - guideRightColumnX,
      height: rows.length * lineHeight,
      content: rows.map((row) => row.right ?? '').join('\n'),
    }),
    textRegion({
      id: 8,
      name: 'input',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      content: ' ',
      capture: true,
    }),
  ]
}

function renderLearn(_state: AppState): string {
  return pageLines(
    learnRowsFor().map((row) =>
      row.right === undefined ? row.left : leftRight(row.left, row.right, fullDisplayWidth),
    ),
    fullDisplayWidth,
  )
}

function renderLearnLayout(_state: AppState): GlassesTextRegion[] {
  const rows = learnRowsFor()

  return [
    textRegion({
      id: 1,
      name: 'learn-left',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: rows.length * lineHeight,
      content: rows.map((row) => row.left).join('\n'),
    }),
    textRegion({
      id: 2,
      name: 'learn-right',
      x: guideRightColumnX,
      y: 0,
      width: canvasWidth - guideRightColumnX,
      height: rows.length * lineHeight,
      content: rows.map((row) => row.right ?? '').join('\n'),
    }),
    textRegion({
      id: 8,
      name: 'input',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      content: ' ',
      capture: true,
    }),
  ]
}

function guideRowsFor(state: AppState): GuideRow[] {
  const page = compactGuidePages[state.guidePage] ?? compactGuidePages[0]

  return [
    { left: `HI-LO REF ${state.guidePage + 1}/${guidePages.length}`, right: page.title },
    ...page.rows,
  ]
}

function learnRowsFor(): GuideRow[] {
  return [
    { left: 'LEARN', right: 'PHONE GUIDE' },
    { left: '' },
    { left: 'Use Learn on your phone. Glasses are for practice.' },
  ]
}

function directInputLine(lastBucket: CardBucket): string {
  return [
    directInputAction('low', `${downIcon} LOW`, lastBucket),
    directInputAction('mid', 'TAP MID', lastBucket),
    directInputAction('high', `${upIcon} HIGH`, lastBucket),
  ].join(' | ')
}

function directInputAction(bucket: CardBucket, input: string, lastBucket: CardBucket): string {
  const label = `${input} ${signed(bucketDeltas[bucket])}`
  return bucket === lastBucket ? `<${label}>` : label
}

function page(lines: string[], width = displayWidth): string {
  return pageLines(lines, width)
}

function pageLines(lines: string[], width = displayWidth): string {
  return lines.map((line) => fit(line, width).trimEnd()).join('\n')
}

function leftRight(left: string, right: string, width = displayWidth): string {
  const fittedLeft = fit(left, width)
  const fittedRight = fit(right, width)
  const gap = Math.max(width - fittedLeft.length - fittedRight.length, 1)
  return `${fittedLeft}${' '.repeat(gap)}${fittedRight}`.slice(0, width)
}

function fullCenter(value: string): string {
  return centerWithin(value, fullDisplayWidth).trimEnd()
}

function centerWithin(value: string, width: number): string {
  const fitted = fit(value, width)
  const leftPadding = centerStartFor(fitted, width)
  const rightPadding = width - fitted.length - leftPadding

  return `${' '.repeat(leftPadding)}${fitted}${' '.repeat(rightPadding)}`
}

function centerStartFor(value: string, width: number): number {
  return Math.max(Math.floor((width - fit(value, width).length) / 2), 0)
}

function fit(value: string, width: number): string {
  return value.length > width ? value.slice(0, width) : value
}

function textRegion({
  id,
  name,
  x,
  y,
  width,
  height,
  content,
  capture = false,
}: {
  id: number
  name: string
  x: number
  y: number
  width: number
  height: number
  content: string
  capture?: boolean
}): GlassesTextRegion {
  return {
    xPosition: x,
    yPosition: y,
    width,
    height,
    containerID: id,
    containerName: name,
    content,
    isEventCapture: capture ? 1 : 0,
  }
}

function rightTextRegion(
  content: string,
  lineIndex: number,
  id = 2 + lineIndex,
  name = `r${lineIndex}`,
): GlassesTextRegion {
  return textRegion({
    id,
    name,
    x: rightRailX,
    y: lineIndex * lineHeight,
    width: canvasWidth - rightRailX,
    height: 28,
    content: rightAlignForRail(content),
  })
}

function rightAlignForRail(content: string): string {
  return rightAlignForWidth(content, canvasWidth - rightRailX - rightEdgeInset)
}

function rightAlignForWidth(content: string, width: number): string {
  const missingWidth = Math.max(width - estimateTextPixelWidth(content), 0)
  const leadingSpaces = Math.floor(missingWidth / estimateCharPixelWidth(' '))

  return `${' '.repeat(leadingSpaces)}${content}`
}

function centeredTextRegion(
  id: number,
  name: string,
  content: string,
  y: number,
  height: number,
): GlassesTextRegion {
  const x = centerXForText(content)

  return textRegion({
    id,
    name,
    x,
    y,
    width: canvasWidth - x,
    height,
    content,
  })
}

function centerXForText(content: string): number {
  const estimatedWidth = estimateTextPixelWidth(content)
  return Math.max(Math.round((canvasWidth - estimatedWidth) / 2), 0)
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

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function formatDecimal(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0.0'
  return value.toFixed(1)
}

function signedDecimal(value: number): string {
  const formatted = formatDecimal(value)
  return value > 0 ? `+${formatted}` : formatted
}

interface GuideRow {
  left: string
  right?: string
}

interface CompactGuidePage {
  title: string
  rows: GuideRow[]
}

const compactGuidePages: CompactGuidePage[] = [
  {
    title: 'COUNT TABLE',
    rows: [
      { left: 'LOW 2-6', right: '+1' },
      { left: 'MID 7-9', right: '0' },
      { left: 'HIGH 10-A', right: '-1' },
      { left: '' },
      { left: 'LOG EVERY EXPOSED CARD' },
    ],
  },
  {
    title: 'TRUE COUNT',
    rows: [
      { left: 'RC', right: 'RUNNING' },
      { left: 'DECKS LEFT', right: 'REMAIN' },
      { left: 'TC', right: 'RC / LEFT' },
      { left: 'TCi', right: 'TOWARD 0' },
      { left: 'COLD', right: '<= -1' },
      { left: 'WATCH', right: '+1' },
      { left: 'FAV', right: '+2/+3' },
      { left: 'STRONG', right: '>= +4' },
    ],
  },
  {
    title: 'I18 1-6',
    rows: [
      { left: 'INSURANCE', right: '>= +3' },
      { left: '16 v 10', right: '>= 0' },
      { left: '15 v 10', right: '>= +4' },
      { left: 'T,T v 5', right: '>= +5' },
      { left: 'T,T v 6', right: '>= +4' },
      { left: '10 v 10', right: '>= +4' },
    ],
  },
  {
    title: 'I18 7-12',
    rows: [
      { left: '12 v 3', right: '>= +2' },
      { left: '12 v 2', right: '>= +3' },
      { left: '11 v A', right: '>= +1' },
      { left: '9 v 2', right: '>= +1' },
      { left: '10 v A', right: '>= +4' },
      { left: '9 v 7', right: '>= +3' },
    ],
  },
  {
    title: 'I18 13-18',
    rows: [
      { left: '16 v 9', right: '>= +5' },
      { left: '13 v 2', right: '>= -1' },
      { left: '12 v 4', right: '>= 0' },
      { left: '12 v 5', right: '>= -2' },
      { left: '12 v 6', right: '>= -1' },
      { left: '13 v 3', right: '>= -2' },
    ],
  },
  {
    title: 'FAB 4',
    rows: [
      { left: '14 v 10', right: '>= +3' },
      { left: '15 v 10', right: '>= 0' },
      { left: '15 v 9', right: '>= +2' },
      { left: '15 v A', right: '>= +1' },
      { left: 'LATE SURRENDER ONLY' },
    ],
  },
  {
    title: 'S17 EXTRAS',
    rows: [
      { left: 'T,T v 4', right: '>= +6' },
      { left: 'A,8 v 4', right: '>= +3' },
      { left: 'A,8 v 5/6', right: '>= +1' },
      { left: 'A,6 v 2', right: '>= +1' },
      { left: '16 v 9', right: '>= +4' },
      { left: '8 v 6', right: '>= +2' },
    ],
  },
]
