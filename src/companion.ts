import {
  type CardBucket,
  type DeviationReferenceRow,
  type GameSettings,
  allDeviationRows,
  bucketDeltas,
  bucketLabels,
  bucketOrder,
  countReferenceRows,
  cueReferenceRows,
  deckOptions,
  expandedS17DeviationRows,
  fab4SurrenderRows,
  formatGameSettings,
  getDeviationAvailability,
  getShoeStats,
  illustrious18Rows,
  indexReferenceRows,
  matchesIndexAssumptions,
} from './counting'
import { type AppState, learnPages } from './state'

export interface CompanionActions {
  addBucket: (bucketIndex?: number) => void
  undo: () => void
  resetShoe: () => void
  resumeCount: () => void
  openSettings: () => void
  openLearn: (learnPage?: number) => void
  startShoe: () => void
  openGuide: (guidePage?: number) => void
  selectBucket: (bucketIndex: number) => void
  setDeckIndex: (deckIndex: number) => void
  updateSettings: (settings: GameSettings) => void
}

type CompanionSection = 'count' | 'setup' | 'learn' | 'reference' | 'plays'

const companionSections: Array<{ id: CompanionSection; label: string; detail: string }> = [
  { id: 'count', label: 'Count', detail: 'Live' },
  { id: 'setup', label: 'Setup', detail: 'Rules' },
  { id: 'learn', label: 'Learn', detail: 'Basics' },
  { id: 'reference', label: 'Ref', detail: 'Tags' },
  { id: 'plays', label: 'Plays', detail: 'Indexes' },
]

export function renderCompanion(root: HTMLElement, state: AppState, actions: CompanionActions): void {
  const activeSection = getActiveCompanionSection(state)

  root.innerHTML = `
    <section class="count-shell">
      <div class="app-chrome">
        <header class="count-header">
          <div class="brand-lockup">
            <span class="brand-mark" aria-hidden="true">HL</span>
            <div>
              <p class="eyebrow">Hi-Lo Count</p>
              <h1>Trainer</h1>
            </div>
          </div>
          <div class="header-actions">
            <span class="state-pill">${state.notice}</span>
          </div>
        </header>
        <nav class="section-tabs" aria-label="Companion sections">
          ${renderSectionTabs(activeSection)}
        </nav>
      </div>

      ${renderActiveSection(activeSection, state)}
    </section>
  `

  root.querySelectorAll<HTMLButtonElement>('[data-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = parseCompanionSection(button.dataset.section)
      if (!section) return

      navigateCompanionSection(section, actions)
    })
  })

  root.querySelector<HTMLButtonElement>('[data-action="add"]')?.addEventListener('click', () => {
    actions.addBucket()
  })
  root.querySelector<HTMLButtonElement>('[data-action="undo"]')?.addEventListener('click', () => {
    actions.undo()
  })
  root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', () => {
    actions.resetShoe()
  })
  root.querySelector<HTMLButtonElement>('[data-action="settings"]')?.addEventListener('click', () => {
    actions.openSettings()
  })
  root.querySelector<HTMLButtonElement>('[data-action="guide"]')?.addEventListener('click', () => {
    actions.openGuide()
  })
  root.querySelectorAll<HTMLButtonElement>('[data-bucket]').forEach((button) => {
    button.addEventListener('click', () => {
      const bucketIndex = Number(button.dataset.bucket)
      actions.selectBucket(bucketIndex)
      actions.addBucket(bucketIndex)
    })
  })

  root.querySelector<HTMLSelectElement>('[data-deck-select]')?.addEventListener('change', (event) => {
    const select = event.currentTarget as HTMLSelectElement
    actions.setDeckIndex(Number(select.value))
  })

  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('[data-setting]').forEach((control) => {
    control.addEventListener('change', () => {
      actions.updateSettings(settingsFromControls(root, state.settings))
    })

    control.addEventListener('click', () => {
      if (control instanceof HTMLButtonElement) {
        const key = control.dataset.setting
        const value = control.dataset.value
        if (key === 'dealerSoft17' && (value === 'S17' || value === 'H17')) {
          actions.updateSettings({ ...state.settings, dealerSoft17: value })
        }
      }
    })
  })

  root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', () => {
    actions.startShoe()
  })
  root.querySelector<HTMLButtonElement>('[data-action="start-settings"]')?.addEventListener('click', () => {
    actions.startShoe()
  })
}

function getActiveCompanionSection(state: AppState): CompanionSection {
  if (state.mode === 'setup' || state.mode === 'settings') return 'setup'
  if (state.mode === 'learn') return 'learn'
  if (state.mode === 'guide') return state.guidePage >= 2 ? 'plays' : 'reference'
  if (state.mode === 'count') return 'count'
  return 'count'
}

function navigateCompanionSection(section: CompanionSection, actions: CompanionActions): void {
  switch (section) {
    case 'count':
      actions.resumeCount()
      break
    case 'setup':
      actions.openSettings()
      break
    case 'learn':
      actions.openLearn(0)
      break
    case 'reference':
      actions.openGuide(0)
      break
    case 'plays':
      actions.openGuide(2)
      break
  }
}

function parseCompanionSection(value: string | undefined): CompanionSection | null {
  return companionSections.some((section) => section.id === value) ? (value as CompanionSection) : null
}

function renderSectionTabs(activeSection: CompanionSection): string {
  return companionSections
    .map((section) => {
      const active = section.id === activeSection ? ' active' : ''
      const current = section.id === activeSection ? ' aria-current="page"' : ''

      return `
        <button class="section-tab${active}" data-section="${section.id}"${current}>
          <span>${section.label}</span>
          <small>${section.detail}</small>
        </button>
      `
    })
    .join('')
}

function renderActiveSection(section: CompanionSection, state: AppState): string {
  switch (section) {
    case 'setup':
      return renderSetupWorkspace(state)
    case 'learn':
      return renderLearnWorkspace(state)
    case 'reference':
      return renderReferenceWorkspace()
    case 'plays':
      return renderPlaysWorkspace(state)
    case 'count':
    default:
      return renderCountWorkspace(state)
  }
}

function renderCountWorkspace(state: AppState): string {
  const stats = getShoeStats(state.shoe)
  const penetration = Math.round(stats.penetrationPct)
  const lastCards = state.shoe.history.slice(-12)
  const selectedDelta = signed(bucketDeltas[state.selectedBucket])

  return `
    <div class="count-workspace count-workspace-count">
      <section class="count-console" aria-label="Counting console">
        <div class="count-panel">
          <div class="count-topline">
            <span class="cue-chip cue-${stats.cue.toLowerCase()}">${stats.cue}</span>
            <span>${formatGameSettings(state.settings)}</span>
          </div>

          <div class="count-hero">
            <div>
              <span class="metric-label">Running count</span>
              <strong class="running-value">${signed(state.shoe.runningCount)}</strong>
            </div>
            <div class="true-stack" aria-label="Derived counts">
              <div>
                <span class="metric-label">True</span>
                <strong>${stats.trueCount.toFixed(1)}</strong>
              </div>
              <div>
                <span class="metric-label">TCi</span>
                <strong>${signed(stats.indexTrueCount)}</strong>
              </div>
            </div>
          </div>

          <div class="progress-block" aria-label="Shoe progress">
            <div>
              <span>Penetration</span>
              <strong>${penetration}%</strong>
            </div>
            <div class="progress-track" aria-hidden="true">
              <span style="width: ${clamp(penetration, 0, 100)}%"></span>
            </div>
          </div>

          <dl class="shoe-metrics">
            <div>
              <dt>Seen</dt>
              <dd>${state.shoe.cardsSeen}/${stats.totalCards}</dd>
            </div>
            <div>
              <dt>Decks left</dt>
              <dd>${stats.decksRemaining.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Cards left</dt>
              <dd>${stats.cardsRemaining}</dd>
            </div>
          </dl>
        </div>

        <section class="bucket-grid" aria-label="Card buckets">
          ${bucketOrder.map((bucket, index) => renderBucketButton(bucket, index, state.selectedBucket)).join('')}
        </section>

        <div class="action-row" aria-label="Session actions">
          <button class="primary-action" data-action="add">Add ${bucketLabels[state.selectedBucket]} ${selectedDelta}</button>
          <button data-action="undo">Undo</button>
          <button data-action="reset">New</button>
          <button data-action="settings">Setup</button>
          <button data-action="guide">Ref</button>
        </div>

        <section class="history-strip" aria-label="Recent entries">
          <div>
            <span class="metric-label">Recent</span>
            <strong>${lastCards.length ? `${lastCards.length} shown` : 'Empty shoe'}</strong>
          </div>
          <div class="history-chips">
            ${
              lastCards.length
                ? lastCards.map((bucket) => `<b class="history-chip ${bucket}">${bucketLabels[bucket].split(' ')[0]}</b>`).join('')
                : '<em>No cards logged yet</em>'
            }
          </div>
        </section>
      </section>

    </div>
  `
}

function renderSetupWorkspace(state: AppState): string {
  return `
    <div class="count-workspace setup-workspace">
      ${renderSettingsPanel(state)}
    </div>
  `
}

function renderReferenceWorkspace(): string {
  return `
    <div class="count-workspace reference-workspace">
      ${renderCountTable()}
    </div>
  `
}

function renderLearnWorkspace(state: AppState): string {
  return `
    <div class="count-workspace learn-workspace">
      <section class="reference-panel learn-panel" aria-label="Learn card counting">
        <div class="panel-heading">
          <div>
            <span>Learn</span>
            <h2>Card counting basics</h2>
          </div>
          <strong>${state.learnPage + 1}/${learnPages.length}</strong>
        </div>
        <div class="learn-grid">
          ${learnPages.map((page, index) => renderLearnCard(page.title, page.rows, index === state.learnPage)).join('')}
        </div>
      </section>
    </div>
  `
}

function renderPlaysWorkspace(state: AppState): string {
  return `
    <div class="count-workspace plays-workspace">
      ${renderDeviationReference(state)}
    </div>
  `
}

function renderLearnCard(title: string, rows: readonly string[], isActive: boolean): string {
  const active = isActive ? ' active' : ''

  return `
    <article class="learn-card${active}">
      <h3>${title}</h3>
      <ul>
        ${rows.map((row) => `<li>${row}</li>`).join('')}
      </ul>
    </article>
  `
}

export function installCompanionStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    :root {
      color-scheme: light;
      --ink: #171a20;
      --muted: #657080;
      --subtle: #8993a3;
      --soft: #f5f7fa;
      --panel: #ffffff;
      --panel-muted: #fbfcfe;
      --line: #d9e0ea;
      --line-strong: #b7c1cf;
      --green: #0b7d62;
      --green-soft: #e8f6f1;
      --amber: #a76610;
      --amber-soft: #fff3d5;
      --red: #b64141;
      --red-soft: #ffe8e5;
      --blue: #3451c9;
      --blue-soft: #e9eefc;
      --shadow: 0 12px 30px rgb(24 32 47 / 7%);
    }

    * {
      box-sizing: border-box;
    }

    button,
    select {
      letter-spacing: 0;
    }

    .count-shell {
      width: min(1120px, 100%);
      min-height: 100vh;
      margin: 0 auto;
      padding: 0 16px 18px;
      color: var(--ink);
    }

    .app-chrome {
      position: sticky;
      top: 0;
      z-index: 20;
      padding: 12px 0 10px;
      border-bottom: 1px solid rgb(217 224 234 / 80%);
      background: rgb(245 247 250 / 94%);
      backdrop-filter: blur(14px);
    }

    .count-header,
    .brand-lockup,
    .header-actions,
    .count-topline,
    .progress-block > div:first-child,
    .deviation-heading {
      display: flex;
      align-items: center;
    }

    .count-header {
      justify-content: space-between;
      gap: 12px;
      padding: 0 0 10px;
    }

    .brand-lockup {
      gap: 10px;
      min-width: 0;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      flex: 0 0 auto;
      border-radius: 8px;
      background: var(--ink);
      color: #ffffff;
      font-size: 13px;
      font-weight: 850;
      letter-spacing: 0;
    }

    .eyebrow,
    h1 {
      margin: 0;
      letter-spacing: 0;
    }

    .eyebrow {
      color: var(--green);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }

    h1 {
      color: var(--ink);
      font-size: 21px;
      line-height: 1.05;
      font-weight: 850;
    }

    .header-actions {
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
    }

    .state-pill,
    .cue-chip {
      min-height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 850;
      white-space: nowrap;
    }

    .state-pill {
      max-width: min(360px, 42vw);
      overflow: hidden;
      border: 1px solid var(--line);
      background: var(--panel);
      color: #394454;
      text-overflow: ellipsis;
    }

    .section-tabs {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #eef2f6;
    }

    .section-tab {
      min-width: 0;
      min-height: 42px;
      display: grid;
      place-items: center;
      gap: 1px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #465163;
      cursor: pointer;
    }

    .section-tab span,
    .section-tab small {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .section-tab span {
      font-size: 13px;
      font-weight: 900;
    }

    .section-tab small {
      color: var(--subtle);
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .section-tab.active {
      background: var(--panel);
      color: var(--ink);
      box-shadow: 0 3px 10px rgb(24 32 47 / 10%);
    }

    .section-tab.active small {
      color: var(--green);
    }

    .count-workspace {
      display: grid;
      gap: 12px;
      align-items: start;
      padding-top: 14px;
    }

    .count-workspace-count {
      width: min(920px, 100%);
      grid-template-columns: 1fr;
      margin: 0 auto;
    }

    .setup-workspace {
      width: min(760px, 100%);
      grid-template-columns: 1fr;
      margin: 0 auto;
    }

    .learn-workspace,
    .reference-workspace,
    .plays-workspace {
      width: min(920px, 100%);
      margin: 0 auto;
    }

    .count-console {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .count-panel,
    .device-panel,
    .reference-panel,
    .history-strip {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .count-panel {
      padding: 16px;
    }

    .count-topline {
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
      min-width: 0;
    }

    .count-topline > span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cue-cold {
      background: var(--blue-soft);
      color: #31527d;
    }

    .cue-neutral {
      background: #eef2f6;
      color: #4c5665;
    }

    .cue-watch {
      background: var(--amber-soft);
      color: #7c520f;
    }

    .cue-favorable,
    .cue-strong {
      background: var(--green-soft);
      color: #086349;
    }

    .count-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.35fr);
      gap: 14px;
      align-items: stretch;
    }

    .metric-label,
    .shoe-metrics dt,
    .reference-panel th,
    .device-list span,
    .progress-block span,
    .bucket-meta {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .running-value {
      display: block;
      margin-top: 2px;
      color: var(--ink);
      font-size: 72px;
      line-height: 0.9;
      font-weight: 900;
      letter-spacing: 0;
    }

    .true-stack {
      display: grid;
      gap: 8px;
    }

    .true-stack div {
      min-height: 70px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-muted);
    }

    .true-stack strong {
      display: block;
      margin-top: 5px;
      font-size: 26px;
      line-height: 1;
    }

    .progress-block {
      display: grid;
      gap: 8px;
      margin-top: 14px;
    }

    .progress-block > div:first-child {
      justify-content: space-between;
      gap: 12px;
    }

    .progress-block strong {
      font-size: 13px;
    }

    .progress-track {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: #e7ecf3;
    }

    .progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--green);
    }

    .shoe-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 14px 0 0;
    }

    .shoe-metrics div {
      min-height: 58px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-muted);
      min-width: 0;
    }

    .shoe-metrics dd {
      margin: 5px 0 0;
      color: var(--ink);
      font-size: 20px;
      line-height: 1;
      font-weight: 850;
      overflow-wrap: anywhere;
    }

    .bucket-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .bucket-button {
      min-height: 96px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      text-align: left;
      cursor: pointer;
      box-shadow: 0 8px 18px rgb(24 32 47 / 5%);
    }

    @media (hover: hover) {
      .bucket-button:hover,
      .action-row button:hover,
      .settings-actions button:hover,
      .section-tab:hover,
      .segmented-control button:hover,
      .deck-row select:hover {
        border-color: var(--line-strong);
        background: var(--panel-muted);
      }
    }

    .bucket-button.selected {
      border-color: var(--green);
      box-shadow: inset 0 0 0 2px var(--green), 0 10px 22px rgb(15 138 104 / 12%);
    }

    .bucket-name,
    .bucket-delta {
      display: block;
      font-weight: 850;
    }

    .bucket-name {
      min-height: 22px;
      font-size: 14px;
    }

    .bucket-meta {
      display: block;
      margin-top: 4px;
    }

    .bucket-delta {
      margin-top: 14px;
      font-size: 30px;
      line-height: 1;
    }

    .tone-low {
      color: var(--green);
    }

    .tone-mid {
      color: var(--amber);
    }

    .tone-high {
      color: var(--red);
    }

    .action-row {
      display: grid;
      grid-template-columns: minmax(160px, 1.35fr) repeat(4, minmax(68px, 0.65fr));
      gap: 8px;
    }

    .action-row button,
    .deck-row select,
    .deck-row button,
    .settings-actions button {
      min-height: 42px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      font-weight: 850;
      cursor: pointer;
      min-width: 0;
    }

    .action-row .primary-action,
    .deck-row .primary-action,
    .settings-actions .primary-action {
      border-color: var(--ink);
      background: var(--ink);
      color: #ffffff;
    }

    .action-row .primary-action:hover,
    .deck-row .primary-action:hover,
    .settings-actions .primary-action:hover {
      background: #2a2d32;
    }

    .history-strip {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 12px;
      min-height: 58px;
      padding: 12px;
      box-shadow: none;
    }

    .history-strip strong {
      display: block;
      margin-top: 2px;
      font-size: 13px;
    }

    .history-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
      min-width: 0;
    }

    .history-chip {
      min-width: 38px;
      padding: 5px 8px;
      border-radius: 999px;
      text-align: center;
      font-size: 12px;
      font-weight: 850;
    }

    .history-chip.low {
      background: var(--green-soft);
      color: #086349;
    }

    .history-chip.mid {
      background: var(--amber-soft);
      color: #7c520f;
    }

    .history-chip.high {
      background: var(--red-soft);
      color: #8b2c2c;
    }

    .history-strip em {
      color: var(--muted);
      font-style: normal;
      font-weight: 700;
    }

    .device-panel,
    .reference-panel {
      padding: 14px;
    }

    .panel-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 10px;
      min-width: 0;
    }

    .panel-heading span {
      color: var(--green);
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
    }

    .panel-heading h2 {
      margin: 2px 0 0;
      color: var(--ink);
      font-size: 17px;
      line-height: 1.15;
    }

    .panel-heading strong {
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
      text-align: right;
    }

    .device-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 0;
    }

    .device-list div {
      min-height: 58px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-muted);
      min-width: 0;
    }

    .device-list dd {
      margin: 5px 0 0;
      font-size: 16px;
      font-weight: 850;
      overflow-wrap: anywhere;
    }

    .device-pre {
      min-height: 128px;
      margin: 0;
      overflow: auto;
      white-space: pre-wrap;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #15191f;
      color: #f6f8fb;
      padding: 12px;
      font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace;
    }

    .deck-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: end;
    }

    .deck-row label {
      display: grid;
      gap: 7px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }

    .deck-row select {
      width: 100%;
      min-width: 120px;
    }

    .settings-panel {
      display: grid;
      gap: 12px;
    }

    .learn-panel {
      display: grid;
      gap: 12px;
    }

    .learn-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .learn-card {
      min-width: 0;
      min-height: 170px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-muted);
    }

    .learn-card.active {
      border-color: rgb(11 125 98 / 45%);
      background: var(--green-soft);
    }

    .learn-card h3 {
      margin: 0 0 8px;
      color: var(--ink);
      font-size: 14px;
      line-height: 1.2;
    }

    .learn-card ul {
      display: grid;
      gap: 6px;
      margin: 0;
      padding-left: 18px;
      color: #394454;
      font-size: 13px;
      line-height: 1.35;
      font-weight: 700;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .settings-grid label,
    .segmented-field {
      display: grid;
      gap: 7px;
      min-height: 78px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-muted);
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      min-width: 0;
    }

    .settings-grid select {
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      color: var(--ink);
      font: inherit;
      font-weight: 850;
    }

    .segmented-control {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px;
      padding: 4px;
      border-radius: 8px;
      background: #eef2f6;
    }

    .segmented-control button {
      min-height: 34px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #4c5665;
      font: inherit;
      font-weight: 850;
      cursor: pointer;
    }

    .segmented-control button.active {
      background: #ffffff;
      color: var(--ink);
      box-shadow: 0 4px 12px rgb(31 41 55 / 12%);
    }

    .toggle-row {
      grid-template-columns: 1fr auto;
      align-items: center;
    }

    .toggle-row input {
      width: 42px;
      height: 24px;
      accent-color: var(--green);
    }

    .settings-actions {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: center;
    }

    .settings-actions span,
    .settings-note,
    .reference-callout span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      font-weight: 750;
    }

    .settings-note {
      margin: 0;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--line);
    }

    .settings-note.match,
    .reference-callout.match {
      background: var(--green-soft);
      border-color: #b8e4d6;
    }

    .settings-note.caution,
    .reference-callout.caution {
      background: var(--amber-soft);
      border-color: #efd186;
    }

    .reference-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .reference-table th,
    .reference-table td {
      padding: 9px 8px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    .reference-table th:last-child,
    .reference-table td:last-child {
      text-align: right;
    }

    .reference-table tr:last-child td {
      border-bottom: 0;
    }

    .reference-table td {
      color: #293241;
      font-size: 13px;
      font-weight: 750;
    }

    .reference-callout {
      display: grid;
      gap: 4px;
      margin-bottom: 12px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .reference-callout strong {
      font-size: 13px;
    }

    .deviation-group {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .deviation-heading {
      justify-content: space-between;
      gap: 12px;
      align-items: end;
    }

    .deviation-heading h3 {
      margin: 0;
      color: var(--ink);
      font-size: 15px;
      line-height: 1.2;
    }

    .deviation-heading span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      text-align: right;
    }

    .table-scroll {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .table-scroll .reference-table th,
    .table-scroll .reference-table td {
      border-bottom-color: #e7edf4;
    }

    .deviation-table {
      min-width: 520px;
    }

    .deviation-table th:first-child,
    .deviation-table td:first-child {
      width: 44px;
      text-align: center;
    }

    .deviation-table th:nth-child(3),
    .deviation-table td:nth-child(3) {
      width: 72px;
      text-align: center;
    }

    .deviation-table th:last-child,
    .deviation-table td:last-child {
      text-align: left;
    }

    .deviation-table tr.unavailable td {
      color: #7c8797;
      background: #f8fafc;
    }

    .index-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      white-space: nowrap;
      font-weight: 900;
    }

    .index-badge {
      min-width: 42px;
      padding: 4px 8px;
      background: #eef2f6;
      color: var(--ink);
    }

    .memorize-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .memorize-strip span {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      min-height: 30px;
      padding: 5px 8px;
      border-radius: 999px;
      background: #eef2f6;
      color: #394454;
      font-size: 12px;
      font-weight: 850;
    }

    .tag-badge {
      display: inline-flex;
      min-width: 44px;
      justify-content: center;
      border-radius: 999px;
      padding: 4px 9px;
      font-weight: 900;
    }

    .tag-badge.low {
      background: var(--green-soft);
      color: #086349;
    }

    .tag-badge.mid {
      background: var(--amber-soft);
      color: #7c520f;
    }

    .tag-badge.high {
      background: var(--red-soft);
      color: #8b2c2c;
    }

    .cue-list {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 6px;
      margin-top: 10px;
    }

    .cue-list div {
      min-height: 68px;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-muted);
      min-width: 0;
    }

    .cue-list strong,
    .cue-list span {
      display: block;
    }

    .cue-list strong {
      font-size: 13px;
    }

    .cue-list span {
      margin-top: 4px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.25;
      font-weight: 750;
    }

    button:active {
      transform: translateY(1px);
    }

    @media (max-width: 900px) {
      .count-workspace-count,
      .setup-workspace {
        grid-template-columns: 1fr;
      }

      .learn-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .count-shell {
        padding: 0 10px 14px;
      }

      .app-chrome {
        padding: 8px 0;
      }

      .count-header {
        gap: 8px;
        padding-bottom: 8px;
      }

      h1 {
        font-size: 18px;
      }

      .eyebrow {
        font-size: 10px;
      }

      .brand-mark {
        width: 34px;
        height: 34px;
        font-size: 12px;
      }

      .state-pill {
        max-width: 38vw;
        min-height: 32px;
        padding: 6px 9px;
      }

      .section-tab {
        min-height: 38px;
      }

      .section-tab small {
        display: none;
      }

      .count-workspace {
        padding-top: 10px;
      }

      .count-panel,
      .device-panel,
      .reference-panel {
        padding: 12px;
      }

      .count-hero {
        grid-template-columns: 1fr;
      }

      .true-stack {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .running-value {
        font-size: 58px;
      }

      .shoe-metrics dd {
        font-size: 17px;
      }

      .bucket-button {
        min-height: 84px;
        padding: 10px;
      }

      .bucket-name {
        font-size: 13px;
      }

      .bucket-meta {
        font-size: 11px;
      }

      .bucket-delta {
        margin-top: 10px;
        font-size: 26px;
      }

      .action-row {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .action-row .primary-action {
        grid-column: 1 / -1;
      }

      .history-strip,
      .deck-row,
      .settings-actions {
        grid-template-columns: 1fr;
      }

      .history-chips {
        justify-content: flex-start;
      }

      .settings-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .device-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cue-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .reference-table {
        table-layout: auto;
      }
    }

    @media (max-width: 390px) {
      .state-pill {
        max-width: 32vw;
      }

      .settings-grid,
      .device-list {
        grid-template-columns: 1fr;
      }

      .shoe-metrics {
        gap: 6px;
      }

      .shoe-metrics div {
        padding: 8px;
      }
    }
  `

  document.head.append(style)
}

function renderBucketButton(bucket: CardBucket, index: number, selectedBucket: CardBucket): string {
  const selected = bucket === selectedBucket ? ' selected' : ''
  return `
    <button class="bucket-button${selected}" data-bucket="${index}">
      <span class="bucket-name">${bucketLabels[bucket]}</span>
      <span class="bucket-meta">${countReferenceRows.find((row) => row.bucket === bucket)?.cards ?? ''}</span>
      <strong class="bucket-delta tone-${bucket}">${signed(bucketDeltas[bucket])}</strong>
    </button>
  `
}

function renderSettingsPanel(state: AppState): string {
  const shoeDeckMismatch = state.shoe.deckCount !== state.settings.deckCount
  const assumptionMatch = matchesIndexAssumptions(state.settings)

  return `
    <section class="device-panel settings-panel">
      <div class="panel-heading">
        <div>
          <span>Settings</span>
          <h2>Game conditions</h2>
        </div>
        <strong>${formatGameSettings(state.settings)}</strong>
      </div>
      <div class="settings-grid" aria-label="Game settings">
        <label>
          <span>Decks</span>
          <select data-setting="deckCount">
            ${deckOptions
              .map((deckCount) => {
                const selected = deckCount === state.settings.deckCount ? ' selected' : ''
                return `<option value="${deckCount}"${selected}>${deckCount}</option>`
              })
              .join('')}
          </select>
        </label>
        <div class="segmented-field">
          <span>Dealer soft 17</span>
          <div class="segmented-control" role="group" aria-label="Dealer soft 17 rule">
            ${(['S17', 'H17'] as const)
              .map((value) => {
                const active = value === state.settings.dealerSoft17 ? ' active' : ''
                return `<button type="button" class="${active}" data-setting="dealerSoft17" data-value="${value}">${value}</button>`
              })
              .join('')}
          </div>
        </div>
        <label class="toggle-row">
          <span>Double after split</span>
          <input type="checkbox" data-setting="doubleAfterSplit"${state.settings.doubleAfterSplit ? ' checked' : ''}>
        </label>
        <label class="toggle-row">
          <span>Late surrender</span>
          <input type="checkbox" data-setting="lateSurrender"${state.settings.lateSurrender ? ' checked' : ''}>
        </label>
      </div>
      <div class="settings-actions">
        <button class="primary-action" data-action="start-settings">Start new shoe</button>
        <span>${shoeDeckMismatch ? `Current shoe is ${state.shoe.deckCount}D until a new shoe starts.` : 'Current shoe matches deck setting.'}</span>
      </div>
      <p class="settings-note ${assumptionMatch ? 'match' : 'caution'}">
        ${assumptionMatch ? 'Indexes match the 6D/S17/DAS/late-surrender source assumptions.' : 'Indexes are shown from the 6D/S17/DAS/late-surrender tables; recalibrate for materially different games.'}
      </p>
    </section>
  `
}

function renderCountTable(): string {
  return `
    <section class="reference-panel">
      <div class="panel-heading">
        <div>
          <span>Reference</span>
          <h2>Hi-Lo count table</h2>
        </div>
        <strong>Local</strong>
      </div>
      <table class="reference-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Cards</th>
            <th>Tag</th>
          </tr>
        </thead>
        <tbody>
          ${countReferenceRows
            .map(
              (row) => `
                <tr>
                  <td>${row.label}</td>
                  <td>${row.cards}</td>
                  <td><span class="tag-badge ${row.bucket}">${signed(row.delta)}</span></td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
      <div class="cue-list">
        ${cueReferenceRows
          .map(
            (row) => `
              <div>
                <strong>${row.cue}</strong>
                <span>${row.range}</span>
                <span>${row.meaning}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function renderDeviationReference(state: AppState): string {
  const assumptionClass = matchesIndexAssumptions(state.settings) ? 'match' : 'caution'

  return `
    <section class="reference-panel">
      <div class="panel-heading">
        <div>
          <span>Decision table</span>
          <h2>Hi-Lo deviations</h2>
        </div>
        <strong>${allDeviationRows.length} plays</strong>
      </div>
      <div class="reference-callout ${assumptionClass}">
        <strong>${formatGameSettings(state.settings)}</strong>
        <span>Use true count. At or above the index, make the listed deviation; otherwise use basic strategy.</span>
      </div>
      ${renderDeviationTable('Illustrious 18', 'Wizard of Odds', illustrious18Rows, state.settings)}
      ${renderDeviationTable('Fab 4 surrender', 'Wizard of Odds', fab4SurrenderRows, state.settings)}
      ${renderDeviationTable('Expanded S17 highlights', 'Blackjack Apprenticeship S17 chart', expandedS17DeviationRows, state.settings)}
      <div class="memorize-strip" aria-label="Memorization order">
        ${indexReferenceRows
          .map((row) => `<span>${row.play} <b>${row.trigger.replace('TC >= ', '')}</b></span>`)
          .join('')}
      </div>
    </section>
  `
}

function renderDeviationTable(
  title: string,
  source: string,
  rows: DeviationReferenceRow[],
  settings: GameSettings,
): string {
  return `
    <div class="deviation-group">
      <div class="deviation-heading">
        <h3>${title}</h3>
        <span>${source}</span>
      </div>
      <div class="table-scroll">
        <table class="reference-table deviation-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Play</th>
              <th>Index</th>
              <th>What to do</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => renderDeviationRow(row, settings)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function renderDeviationRow(row: DeviationReferenceRow, settings: GameSettings): string {
  const availability = getDeviationAvailability(row, settings)
  const unavailable = availability.isAvailable ? '' : ' unavailable'

  return `
    <tr class="${unavailable}">
      <td>${row.priority ?? ''}</td>
      <td>${row.play}</td>
      <td><span class="index-badge">${row.indexLabel}</span></td>
      <td>${row.action}</td>
    </tr>
  `
}

function settingsFromControls(root: HTMLElement, fallback: GameSettings): GameSettings {
  const deckControl = root.querySelector<HTMLSelectElement>('[data-setting="deckCount"]')
  const dasControl = root.querySelector<HTMLInputElement>('[data-setting="doubleAfterSplit"]')
  const surrenderControl = root.querySelector<HTMLInputElement>('[data-setting="lateSurrender"]')
  const deckCount = Number(deckControl?.value)

  return {
    ...fallback,
    deckCount: deckOptions.includes(deckCount as GameSettings['deckCount']) ? (deckCount as GameSettings['deckCount']) : fallback.deckCount,
    doubleAfterSplit: dasControl?.checked ?? fallback.doubleAfterSplit,
    lateSurrender: surrenderControl?.checked ?? fallback.lateSurrender,
  }
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}
