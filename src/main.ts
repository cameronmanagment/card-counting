import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from '@evenrealities/even_hub_sdk'
import { type CardBucket, type GameSettings, applyBucket, createShoe, undoLast } from './counting'
import { installCompanionStyles, renderCompanion } from './companion'
import { type GlassesTextRegion, renderGlassesLayout } from './glassesRender'
import {
  type AppState,
  createInitialState,
  cycleDeckIndex,
  cycleGuidePage,
  cycleLearnPage,
  cycleMenuIndex,
  cycleSettingsIndex,
  menuItems,
  persistState,
  selectedDeckCount,
  settingsItems,
  settingsNotice,
  updateSetting,
} from './state'

type EvenBridge = Awaited<ReturnType<typeof waitForEvenAppBridge>>

interface EvenEventEnvelope {
  sysEvent?: EvenEventPayload
  textEvent?: EvenEventPayload
  listEvent?: EvenEventPayload
  eventType?: number | string
  action?: string
  value?: string
}

interface EvenEventPayload {
  eventType?: number | string
  action?: string
  value?: string
}

const root = getRootElement()

let state: AppState = createInitialState()
let bridge: EvenBridge | null = null
let unsubscribeEvents: (() => void) | null = null
let glassesPageReady = false
let pendingGlassesLayout: GlassesTextRegion[] | null = null
let isFlushingGlasses = false
let currentGlassesLayoutSignature = ''

installCompanionStyles()
renderAll()
installKeyboardControls()
void bootstrapBridge()

async function bootstrapBridge(): Promise<void> {
  bridge = await waitForBridgeWithTimeout(8000)

  if (!bridge) {
    state = { ...state, notice: 'Browser preview ready' }
    renderAll()
    return
  }

  await createGlassesPage()
  unsubscribeEvents = bridge.onEvenHubEvent((event) => {
    handleEvenEvent(event as EvenEventEnvelope)
  })
}

async function waitForBridgeWithTimeout(timeoutMs: number): Promise<EvenBridge | null> {
  let timeoutId: number | undefined
  const timeout = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(null), timeoutMs)
  })

  try {
    const resolvedBridge = await Promise.race([waitForEvenAppBridge(), timeout])
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    return resolvedBridge
  } catch (error) {
    console.error('Even bridge unavailable:', error)
    return null
  }
}

async function createGlassesPage(): Promise<void> {
  if (!bridge) return

  const layout = renderGlassesLayout(state)
  const textObject = layout.map(toTextContainer)

  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: textObject.length,
      textObject,
    }),
  )

  glassesPageReady = result === 0
  currentGlassesLayoutSignature = glassesPageReady ? layoutSignature(layout) : ''
  state = {
    ...state,
    notice: glassesPageReady ? 'Glasses ready' : `Display error ${result}`,
  }
  console.log(glassesPageReady ? 'app-ready' : `app-start-failed-${result}`)
  renderAll()
}

function handleEvenEvent(event: EvenEventEnvelope): void {
  const sysType = normalizeEventType(event.sysEvent)
  const textType = normalizeEventType(event.textEvent)
  const listType = normalizeEventType(event.listEvent)
  const envelopeType = normalizeEnvelopeEvent(event)
  const eventTypes = [sysType, textType, listType].filter((type): type is number => type !== null)
  if (envelopeType !== null) eventTypes.push(envelopeType)

  if (
    eventTypes.includes(OsEventTypeList.SYSTEM_EXIT_EVENT) ||
    eventTypes.includes(OsEventTypeList.ABNORMAL_EXIT_EVENT)
  ) {
    teardownBridgeListeners()
    persistState(state)
    return
  }

  if (eventTypes.includes(OsEventTypeList.FOREGROUND_EXIT_EVENT)) {
    persistState(state)
    return
  }

  if (eventTypes.includes(OsEventTypeList.FOREGROUND_ENTER_EVENT)) {
    scheduleGlassesRender()
    return
  }

  if (eventTypes.includes(OsEventTypeList.DOUBLE_CLICK_EVENT)) {
    handleDoublePress()
    return
  }

  if (eventTypes.includes(OsEventTypeList.SCROLL_TOP_EVENT)) {
    handleSwipe(-1)
    return
  }

  if (eventTypes.includes(OsEventTypeList.SCROLL_BOTTOM_EVENT)) {
    handleSwipe(1)
    return
  }

  if (eventTypes.includes(OsEventTypeList.CLICK_EVENT)) {
    handlePress()
  }
}

function normalizeEventType(event: EvenEventPayload | undefined): number | null {
  if (!event) return null
  if (typeof event.eventType === 'number') return event.eventType
  if (typeof event.eventType === 'string') return eventTypeFromAction(event.eventType)
  if (event.action) return eventTypeFromAction(event.action)
  if (event.value) return eventTypeFromAction(event.value)

  return OsEventTypeList.CLICK_EVENT
}

function normalizeEnvelopeEvent(event: EvenEventEnvelope): number | null {
  if (typeof event.eventType === 'number') return event.eventType
  if (typeof event.eventType === 'string') return eventTypeFromAction(event.eventType)
  if (event.action) return eventTypeFromAction(event.action)
  if (event.value) return eventTypeFromAction(event.value)
  return null
}

function eventTypeFromAction(action: string): number | null {
  switch (action.toLowerCase()) {
    case 'up':
    case 'scroll_top':
    case 'scroll_top_event':
      return OsEventTypeList.SCROLL_TOP_EVENT
    case 'down':
    case 'scroll_bottom':
    case 'scroll_bottom_event':
      return OsEventTypeList.SCROLL_BOTTOM_EVENT
    case 'double_click':
    case 'double_click_event':
      return OsEventTypeList.DOUBLE_CLICK_EVENT
    case 'click':
    case 'click_event':
      return OsEventTypeList.CLICK_EVENT
    default:
      return null
  }
}

function handlePress(): void {
  if (state.mode === 'setup') {
    startFreshShoe()
    return
  }

  if (state.mode === 'menu') {
    executeMenuItem(menuItems[state.selectedMenuIndex])
    return
  }

  if (state.mode === 'guide') {
    updateState({
      ...state,
      mode: 'count',
      notice: 'Reference closed',
    })
    return
  }

  if (state.mode === 'learn') {
    updateState({
      ...state,
      mode: 'count',
      notice: 'Learn closed',
    })
    return
  }

  if (state.mode === 'settings') {
    updateGameSettings(updateSetting(state.settings, settingsItems[state.selectedSettingsIndex] ?? settingsItems[0]))
    return
  }

  addSelectedBucket('mid')
}

function handleDoublePress(): void {
  if (state.mode === 'count') {
    updateState({
      ...state,
      mode: 'menu',
      selectedMenuIndex: 0,
      notice: 'Actions opened',
    })
    return
  }

  updateState({
    ...state,
    mode: 'count',
    notice: 'Back to count',
  })
}

function handleSwipe(step: 1 | -1): void {
  if (state.mode === 'setup') {
    updateState({
      ...state,
      selectedDeckIndex: cycleDeckIndex(state.selectedDeckIndex, step),
      notice: 'Decks changed',
    })
    return
  }

  if (state.mode === 'menu') {
    updateState({
      ...state,
      selectedMenuIndex: cycleMenuIndex(state.selectedMenuIndex, step),
      notice: 'Menu moved',
    })
    return
  }

  if (state.mode === 'guide') {
    updateState({
      ...state,
      guidePage: cycleGuidePage(state.guidePage, step),
      notice: 'Reference page changed',
    })
    return
  }

  if (state.mode === 'learn') {
    updateState({
      ...state,
      learnPage: cycleLearnPage(state.learnPage, step),
      notice: 'Learn page changed',
    })
    return
  }

  if (state.mode === 'settings') {
    updateState({
      ...state,
      selectedSettingsIndex: cycleSettingsIndex(state.selectedSettingsIndex, step),
      notice: 'Setting selected',
    })
    return
  }

  addSelectedBucket(step === -1 ? 'high' : 'low')
}

function addSelectedBucket(bucket = state.selectedBucket): void {
  const nextShoe = applyBucket(state.shoe, bucket)
  const notice = nextShoe.cardsSeen === state.shoe.cardsSeen ? 'Shoe complete' : `${bucket.toUpperCase()} logged`

  updateState({
    ...state,
    mode: 'count',
    shoe: nextShoe,
    selectedBucket: bucket,
    notice,
  })
}

function undo(): void {
  const hadHistory = state.shoe.history.length > 0
  const nextShoe = undoLast(state.shoe)

  updateState({
    ...state,
    mode: 'count',
    shoe: nextShoe,
    notice: hadHistory ? 'Last card undone' : 'Nothing to undo',
  })
}

function resetCurrentShoe(): void {
  updateState({
    ...state,
    mode: 'count',
    shoe: createShoe(state.settings.deckCount),
    selectedBucket: 'low',
    notice: 'Fresh shoe',
  })
}

function startFreshShoe(): void {
  const settings = { ...state.settings, deckCount: selectedDeckCount(state) }

  updateState({
    ...state,
    mode: 'count',
    settings,
    shoe: createShoe(settings.deckCount),
    selectedBucket: 'low',
    selectedMenuIndex: 0,
    selectedSettingsIndex: 0,
    guidePage: 0,
    learnPage: 0,
    notice: 'Fresh shoe',
  })
}

function startShoeFromSettings(): void {
  updateState({
    ...state,
    mode: 'count',
    shoe: createShoe(state.settings.deckCount),
    selectedBucket: 'low',
    selectedMenuIndex: 0,
    selectedSettingsIndex: 0,
    guidePage: 0,
    learnPage: 0,
    notice: 'Fresh shoe',
  })
}

function updateGameSettings(settings: GameSettings): void {
  updateState({
    ...state,
    settings,
    selectedDeckIndex: deckIndexFor(settings.deckCount),
    notice: settingsNotice(settings),
  })
}

function executeMenuItem(item: (typeof menuItems)[number] | undefined): void {
  switch (item) {
    case 'Resume count':
      updateState({ ...state, mode: 'count', notice: 'Back to count' })
      break
    case 'Undo last':
      undo()
      break
    case 'New shoe':
      resetCurrentShoe()
      break
    case 'Settings':
      updateState({
        ...state,
        mode: 'settings',
        selectedSettingsIndex: 0,
        notice: 'Settings opened',
      })
      break
    case 'Learn':
      updateState({
        ...state,
        mode: 'learn',
        learnPage: 0,
        notice: 'Learn opened',
      })
      break
    case 'Reference':
      updateState({
        ...state,
        mode: 'guide',
        guidePage: 0,
        notice: 'Reference opened',
      })
      break
    case 'Exit':
      void exitWithSystemDialog()
      break
    default:
      updateState({ ...state, mode: 'count', notice: 'Menu closed' })
  }
}

async function exitWithSystemDialog(): Promise<void> {
  persistState(state)

  if (!bridge) {
    updateState({ ...state, mode: 'count', notice: 'Exit works on glasses' })
    return
  }

  await bridge.shutDownPageContainer(1)
}

function updateState(nextState: AppState): void {
  state = nextState
  persistState(state)
  renderAll()
}

function renderAll(): void {
  renderCompanion(root, state, {
    addBucket: (bucketIndex) => {
      if (bucketIndex === undefined) {
        addSelectedBucket()
        return
      }

      const bucket = bucketFromIndex(bucketIndex)
      if (bucket) addSelectedBucket(bucket)
    },
    undo,
    resetShoe: resetCurrentShoe,
    resumeCount: () => {
      updateState({ ...state, mode: 'count', notice: 'Back to count' })
    },
    openSettings: () => {
      updateState({ ...state, mode: 'settings', selectedSettingsIndex: 0, notice: 'Settings opened' })
    },
    openLearn: (learnPage = 0) => {
      updateState({ ...state, mode: 'learn', learnPage, notice: 'Learn opened' })
    },
    startShoe: () => {
      if (state.mode === 'setup') {
        startFreshShoe()
        return
      }

      startShoeFromSettings()
    },
    openGuide: (guidePage = 0) => {
      updateState({
        ...state,
        mode: 'guide',
        guidePage,
        notice: guidePage >= 2 ? 'Plays opened' : 'Reference opened',
      })
    },
    selectBucket: (bucketIndex) => {
      const bucket = bucketFromIndex(bucketIndex)
      if (bucket) state = { ...state, selectedBucket: bucket }
    },
    setDeckIndex: (deckIndex) => {
      updateState({ ...state, selectedDeckIndex: deckIndex, notice: 'Decks changed' })
    },
    updateSettings: updateGameSettings,
  })

  scheduleGlassesRender()
}

function scheduleGlassesRender(): void {
  pendingGlassesLayout = renderGlassesLayout(state)
  void flushGlassesRender()
}

async function flushGlassesRender(): Promise<void> {
  if (isFlushingGlasses || !bridge || !glassesPageReady) return

  isFlushingGlasses = true
  const activeBridge = bridge

  try {
    while (pendingGlassesLayout !== null) {
      const layout = pendingGlassesLayout
      pendingGlassesLayout = null
      const signature = layoutSignature(layout)

      if (signature === currentGlassesLayoutSignature) {
        await Promise.all(layout.map((region) => activeBridge.textContainerUpgrade(toTextContainerUpgrade(region))))
      } else {
        const textObject = layout.map(toTextContainer)

        await activeBridge.rebuildPageContainer(
          new RebuildPageContainer({
            containerTotalNum: textObject.length,
            textObject,
          }),
        )
        currentGlassesLayoutSignature = signature
      }
    }
  } finally {
    isFlushingGlasses = false
  }
}

function toTextContainer(region: GlassesTextRegion): TextContainerProperty {
  return new TextContainerProperty({
    xPosition: region.xPosition,
    yPosition: region.yPosition,
    width: region.width,
    height: region.height,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 0,
    containerID: region.containerID,
    containerName: region.containerName,
    content: region.content,
    isEventCapture: region.isEventCapture,
  })
}

function toTextContainerUpgrade(region: GlassesTextRegion): TextContainerUpgrade {
  return new TextContainerUpgrade({
    containerID: region.containerID,
    containerName: region.containerName,
    content: region.content,
    contentOffset: 0,
    contentLength: region.content.length,
  })
}

function layoutSignature(layout: GlassesTextRegion[]): string {
  return layout
    .map(
      (region) =>
        [
          region.containerID,
          region.containerName,
          region.xPosition,
          region.yPosition,
          region.width,
          region.height,
          region.isEventCapture,
        ].join(':'),
    )
    .join('|')
}

function bucketFromIndex(index: number): CardBucket | null {
  if (index === 0) return 'low'
  if (index === 1) return 'mid'
  if (index === 2) return 'high'
  return null
}

function deckIndexFor(deckCount: GameSettings['deckCount']): number {
  const index = [1, 2, 4, 6, 8].indexOf(deckCount)
  return index === -1 ? 3 : index
}

function installKeyboardControls(): void {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      handleSwipe(-1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      handleSwipe(1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePress()
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      undo()
      return
    }

    if (event.key === 'Escape') {
      handleDoublePress()
    }
  })
}

function teardownBridgeListeners(): void {
  unsubscribeEvents?.()
  unsubscribeEvents = null
}

function getRootElement(): HTMLElement {
  const appRoot = document.querySelector<HTMLElement>('#app')
  if (!appRoot) {
    throw new Error('Missing #app root element')
  }

  return appRoot
}
