import {
  type CardBucket,
  bucketDeltas,
  bucketShortLabels,
  getShoeStats,
} from './counting'
import { type AppState, guidePages, menuItems, selectedDeckCount } from './state'

const displayWidth = 48
const fullDisplayWidth = 58
const canvasWidth = 576
const canvasHeight = 288
const rightEdgeInset = 2
const rightRailX = 376
const guideRightColumnX = 410
const lineHeight = 28
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
    case 'count':
    default:
      return renderCount(state)
  }
}

export function renderGlassesLayout(state: AppState): GlassesTextRegion[] {
  if (state.mode === 'count') return renderCountLayout(state)
  if (state.mode === 'menu') return renderMenuLayout(state)
  if (state.mode === 'guide') return renderGuideLayout(state)

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

function renderSetup(state: AppState): string {
  return page([
    leftRight('HI-LO SETUP', 'DECKS'),
    center('SHOE SIZE'),
    center(`<< ${selectedDeckCount(state)}D SHOE >>`),
    '',
    leftRight('SWIPE SIZE', 'TAP START'),
    leftRight('DBL BACK', ''),
    '',
    center('PRACTICE ONLY'),
  ])
}

function renderCount(state: AppState): string {
  return renderCountLines(state).join('\n')
}

function renderCountLayout(state: AppState): GlassesTextRegion[] {
  const { leftLines, rightLines, statusLine, actionLine } = renderCountParts(state)

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
    rightTextRegion(statusLine, 5, 6, 'rail'),
    centeredTextRegion(7, 'actions', actionLine, 206, 34),
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

function renderCountLines(state: AppState): string[] {
  const { leftLines, rightLines, statusLine, actionLine } = renderCountParts(state)

  return [
    leftRight(leftLines[0], rightLines[0]),
    leftLines[1],
    leftRight(leftLines[2], rightLines[1]),
    leftRight(leftLines[3], rightLines[2]),
    leftRight(leftLines[4], rightLines[3]),
    leftRight(leftLines[5], statusLine, fullDisplayWidth),
    leftLines[6],
    fullCenter(actionLine),
  ]
}

function renderCountParts(state: AppState): {
  leftLines: string[]
  rightLines: string[]
  statusLine: string
  actionLine: string
} {
  const stats = getShoeStats(state.shoe)
  const lastCards = state.shoe.history.slice(-6).map((bucket) => bucketShortLabels[bucket]).join(' ')
  const statusLine = state.notice.endsWith('logged') ? state.notice.toUpperCase() : 'Ready'

  return {
    leftLines: [
      'HI-LO HUD',
      '',
      `RC: ${signed(state.shoe.runningCount)}`,
      `TCi: ${signed(stats.indexTrueCount)}`,
      `SEEN: ${state.shoe.cardsSeen}/${stats.totalCards}`,
      `LAST: ${lastCards || '-'}`,
      '',
    ],
    rightLines: [
      stats.cue.toUpperCase(),
      `TRUE ${signedDecimal(stats.trueCount)}`,
      `LEFT ${formatDecimal(stats.decksRemaining)}D`,
      `PEN ${Math.round(stats.penetrationPct)}%`,
    ],
    statusLine,
    actionLine: directInputLine(state.selectedBucket),
  }
}

function renderMenu(state: AppState): string {
  return page(
    [
    '',
    '',
    ...menuItems.map((item, index) => menuLine(item, index === state.selectedMenuIndex)),
    '',
    ],
    fullDisplayWidth,
  )
}

function menuLine(item: string, isSelected: boolean): string {
  const itemStart = centerStartFor(item, fullDisplayWidth)
  const markerStart = Math.max(itemStart - 3, 0)
  const marker = isSelected ? '>' : ' '
  const gap = Math.max(itemStart - markerStart - 1, 0)

  return fit(`${' '.repeat(markerStart)}${marker}${' '.repeat(gap)}${item}`, fullDisplayWidth).trimEnd()
}

function renderMenuLayout(state: AppState): GlassesTextRegion[] {
  const menuTop = Math.round((canvasHeight - menuItems.length * lineHeight) / 2)
  const selectedItem = menuItems[state.selectedMenuIndex] ?? menuItems[0]
  const selectedLabelX = centerXForText(selectedItem)

  return [
    ...menuItems.map((item, index) =>
      centeredTextRegion(1 + index, `menu-${index}`, item, menuTop + index * lineHeight, lineHeight),
    ),
    textRegion({
      id: 7,
      name: 'menu-marker',
      x: Math.max(selectedLabelX - 22, 0),
      y: menuTop + state.selectedMenuIndex * lineHeight,
      width: 16,
      height: lineHeight,
      content: '>',
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

function guideRowsFor(state: AppState): GuideRow[] {
  const page = compactGuidePages[state.guidePage] ?? compactGuidePages[0]

  return [
    { left: `HI-LO REF ${state.guidePage + 1}/${guidePages.length}`, right: page.title },
    ...page.rows,
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

function center(value: string): string {
  return centerWithin(value, displayWidth).trimEnd()
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
    title: 'INDEX DRILLS',
    rows: [
      { left: 'INSURANCE', right: '>= +3' },
      { left: '16 v 10', right: '>= 0' },
      { left: '15 v 10', right: '>= +4' },
      { left: '12 v 3', right: '>= +2' },
      { left: '12 v 2', right: '>= +3' },
    ],
  },
]
