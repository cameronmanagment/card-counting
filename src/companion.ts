import {
  type CardBucket,
  bucketDeltas,
  bucketLabels,
  bucketOrder,
  countReferenceRows,
  cueReferenceRows,
  getShoeStats,
  indexReferenceRows,
} from './counting'
import { type AppState, guidePages, menuItems, selectedDeckCount } from './state'

export interface CompanionActions {
  addBucket: (bucketIndex?: number) => void
  undo: () => void
  resetShoe: () => void
  changeDecks: () => void
  startShoe: () => void
  openGuide: () => void
  openMenu: () => void
  selectBucket: (bucketIndex: number) => void
  setDeckIndex: (deckIndex: number) => void
}

export function renderCompanion(root: HTMLElement, state: AppState, actions: CompanionActions): void {
  const stats = getShoeStats(state.shoe)
  const penetration = Math.round(stats.penetrationPct)
  const lastCards = state.shoe.history.slice(-12)
  const selectedDelta = signed(bucketDeltas[state.selectedBucket])

  root.innerHTML = `
    <section class="count-shell">
      <header class="count-header">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">HL</span>
          <div>
            <p class="eyebrow">Hi-Lo Count</p>
            <h1>Hi-Lo Trainer</h1>
          </div>
        </div>
        <div class="header-actions">
          <span class="state-pill">${state.notice}</span>
          <button class="menu-button" data-action="menu" aria-label="Open glasses actions" title="Open glasses actions">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>
      </header>

      <div class="count-grid">
        <section class="count-console" aria-label="Counting console">
          <div class="count-panel">
            <div class="count-topline">
              <span class="cue-chip cue-${stats.cue.toLowerCase()}">${stats.cue}</span>
              <span>${state.shoe.deckCount} deck shoe</span>
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
                <dt>Cards seen</dt>
                <dd>${state.shoe.cardsSeen}/${stats.totalCards}</dd>
              </div>
              <div>
                <dt>Decks left</dt>
                <dd>${stats.decksRemaining.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
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
            <button data-action="reset">New shoe</button>
            <button data-action="decks">Decks</button>
            <button data-action="guide">Reference</button>
          </div>

          <section class="history-strip" aria-label="Recent entries">
            <div>
              <span class="metric-label">Recent entries</span>
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

        <section class="side-surface" aria-label="Reference and device state">
          ${renderModePanel(state)}
          ${renderCountTable()}
          ${renderIndexTable()}
        </section>
      </div>

      <footer class="count-footer">
        <span>Companion and glasses each use the same local counting engine.</span>
        <strong>Practice only. Follow local law, house rules, and event rules.</strong>
      </footer>
    </section>
  `

  root.querySelector<HTMLButtonElement>('[data-action="add"]')?.addEventListener('click', () => {
    actions.addBucket()
  })
  root.querySelector<HTMLButtonElement>('[data-action="undo"]')?.addEventListener('click', actions.undo)
  root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', actions.resetShoe)
  root.querySelector<HTMLButtonElement>('[data-action="decks"]')?.addEventListener('click', actions.changeDecks)
  root.querySelector<HTMLButtonElement>('[data-action="guide"]')?.addEventListener('click', actions.openGuide)
  root.querySelector<HTMLButtonElement>('[data-action="menu"]')?.addEventListener('click', actions.openMenu)

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

  root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', actions.startShoe)
}

export function installCompanionStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    :root {
      color-scheme: light;
      --ink: #15171a;
      --muted: #657080;
      --soft: #f4f7fb;
      --panel: #ffffff;
      --line: #dbe3ee;
      --line-strong: #bdc9d8;
      --green: #0f8a68;
      --green-soft: #e7f7f1;
      --amber: #b87512;
      --amber-soft: #fff2d1;
      --red: #b94343;
      --red-soft: #ffe7e4;
      --blue: #3157d4;
      --shadow: 0 18px 45px rgb(31 41 55 / 10%);
    }

    * {
      box-sizing: border-box;
    }

    .count-shell {
      width: min(1180px, 100%);
      min-height: 100vh;
      margin: 0 auto;
      padding: 22px;
      color: var(--ink);
    }

    .count-header,
    .brand-lockup,
    .header-actions,
    .count-topline,
    .progress-block > div:first-child,
    .count-footer {
      display: flex;
      align-items: center;
    }

    .count-header {
      justify-content: space-between;
      gap: 18px;
      padding: 4px 0 20px;
    }

    .brand-lockup {
      gap: 12px;
      min-width: 0;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      flex: 0 0 auto;
      border-radius: 8px;
      background: #15171a;
      color: #ffffff;
      font-size: 14px;
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
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
    }

    h1 {
      color: var(--ink);
      font-size: 30px;
      line-height: 1.08;
      font-weight: 850;
    }

    .header-actions {
      justify-content: flex-end;
      gap: 10px;
    }

    .state-pill,
    .cue-chip {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 850;
      white-space: nowrap;
    }

    .state-pill {
      border: 1px solid var(--line);
      background: var(--panel);
      color: #394454;
    }

    .menu-button {
      width: 44px;
      min-width: 44px;
      height: 44px;
      display: inline-grid;
      place-items: center;
      gap: 3px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      cursor: pointer;
    }

    .menu-button span {
      display: block;
      width: 18px;
      height: 2px;
      border-radius: 999px;
      background: var(--ink);
    }

    .count-grid {
      display: grid;
      grid-template-columns: minmax(330px, 0.95fr) minmax(380px, 1.05fr);
      gap: 18px;
      align-items: start;
    }

    .count-console,
    .side-surface {
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
      padding: 18px;
    }

    .count-topline {
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 800;
    }

    .cue-cold {
      background: #e8eef8;
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
      grid-template-columns: 1fr minmax(118px, 0.42fr);
      gap: 18px;
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
      margin-top: 4px;
      color: var(--ink);
      font-size: 78px;
      line-height: 0.92;
      font-weight: 900;
      letter-spacing: 0;
    }

    .true-stack {
      display: grid;
      gap: 8px;
    }

    .true-stack div {
      min-height: 78px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
    }

    .true-stack strong {
      display: block;
      margin-top: 6px;
      font-size: 28px;
      line-height: 1;
    }

    .progress-block {
      display: grid;
      gap: 8px;
      margin-top: 18px;
    }

    .progress-block > div:first-child {
      justify-content: space-between;
      gap: 12px;
    }

    .progress-block strong {
      font-size: 13px;
    }

    .progress-track {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: #e7ecf3;
    }

    .progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--green), var(--blue));
    }

    .shoe-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 18px 0 0;
    }

    .shoe-metrics div {
      min-height: 64px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
    }

    .shoe-metrics dd {
      margin: 5px 0 0;
      color: var(--ink);
      font-size: 22px;
      line-height: 1;
      font-weight: 850;
    }

    .bucket-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .bucket-button {
      min-height: 118px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      text-align: left;
      cursor: pointer;
      box-shadow: 0 10px 26px rgb(31 41 55 / 7%);
    }

    .bucket-button:hover,
    .menu-button:hover,
    .action-row button:hover,
    .deck-row select:hover {
      border-color: var(--line-strong);
      background: #fbfcfe;
    }

    .bucket-button.selected {
      border-color: var(--green);
      box-shadow: inset 0 0 0 2px var(--green), 0 12px 28px rgb(15 138 104 / 12%);
    }

    .bucket-name,
    .bucket-delta {
      display: block;
      font-weight: 850;
    }

    .bucket-name {
      min-height: 22px;
      font-size: 15px;
    }

    .bucket-meta {
      display: block;
      margin-top: 4px;
    }

    .bucket-delta {
      margin-top: 18px;
      font-size: 34px;
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
      grid-template-columns: 1.4fr repeat(4, minmax(86px, 0.7fr));
      gap: 8px;
    }

    .action-row button,
    .deck-row select,
    .deck-row button {
      min-height: 46px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      font-weight: 850;
      cursor: pointer;
    }

    .action-row .primary-action,
    .deck-row .primary-action {
      border-color: var(--ink);
      background: var(--ink);
      color: #ffffff;
    }

    .action-row .primary-action:hover,
    .deck-row .primary-action:hover {
      background: #2a2d32;
    }

    .history-strip {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 12px;
      min-height: 64px;
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
      min-width: 42px;
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
      padding: 16px;
    }

    .panel-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 12px;
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
      font-size: 18px;
      line-height: 1.15;
    }

    .panel-heading strong {
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }

    .device-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 0;
    }

    .device-list div {
      min-height: 62px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
    }

    .device-list dd {
      margin: 5px 0 0;
      font-size: 18px;
      font-weight: 850;
    }

    .device-pre {
      min-height: 148px;
      margin: 0;
      overflow: auto;
      white-space: pre-wrap;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #101317;
      color: #f6f8fb;
      padding: 14px;
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

    .reference-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .reference-table th,
    .reference-table td {
      padding: 10px 8px;
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
      font-size: 14px;
      font-weight: 750;
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
      margin-top: 12px;
    }

    .cue-list div {
      min-height: 72px;
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
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

    .count-footer {
      justify-content: space-between;
      gap: 14px;
      padding: 18px 0 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
    }

    .count-footer strong {
      color: #394454;
    }

    button:active {
      transform: translateY(1px);
    }

    @media (max-width: 940px) {
      .count-grid {
        grid-template-columns: 1fr;
      }

      .action-row {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }

    @media (max-width: 680px) {
      .count-shell {
        padding: 16px;
      }

      .count-header,
      .count-footer {
        align-items: flex-start;
        flex-direction: column;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      h1 {
        font-size: 26px;
      }

      .count-hero,
      .shoe-metrics,
      .bucket-grid,
      .action-row,
      .device-list,
      .deck-row,
      .history-strip {
        grid-template-columns: 1fr;
      }

      .running-value {
        font-size: 66px;
      }

      .history-chips {
        justify-content: flex-start;
      }

      .cue-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .reference-table {
        table-layout: auto;
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

function renderModePanel(state: AppState): string {
  if (state.mode === 'setup') {
    return `
      <section class="device-panel">
        <div class="panel-heading">
          <div>
            <span>Device state</span>
            <h2>Deck setup</h2>
          </div>
          <strong>${selectedDeckCount(state)} decks</strong>
        </div>
        <div class="deck-row">
          <label for="deck-select">
            Decks in shoe
            <select id="deck-select" data-deck-select>
              ${[1, 2, 4, 6, 8]
                .map((deckCount, index) => {
                  const selected = deckCount === selectedDeckCount(state) ? ' selected' : ''
                  return `<option value="${index}"${selected}>${deckCount}</option>`
                })
                .join('')}
            </select>
          </label>
          <button class="primary-action" data-action="start">Start shoe</button>
        </div>
      </section>
    `
  }

  if (state.mode === 'menu') {
    return `
      <section class="device-panel">
        <div class="panel-heading">
          <div>
            <span>Device state</span>
            <h2>Glasses actions</h2>
          </div>
          <strong>${state.selectedMenuIndex + 1}/${menuItems.length}</strong>
        </div>
        <pre class="device-pre">${menuItems.map((item, index) => `${index === state.selectedMenuIndex ? '>' : ' '} ${item}`).join('\n')}</pre>
      </section>
    `
  }

  if (state.mode === 'guide') {
    return `
      <section class="device-panel">
        <div class="panel-heading">
          <div>
            <span>Device state</span>
            <h2>Glasses reference</h2>
          </div>
          <strong>${state.guidePage + 1}/${guidePages.length}</strong>
        </div>
        <pre class="device-pre">${guidePages[state.guidePage]?.join('\n') ?? ''}</pre>
      </section>
    `
  }

  const lastBucket = state.shoe.history.at(-1)

  return `
    <section class="device-panel">
      <div class="panel-heading">
        <div>
          <span>Device state</span>
          <h2>Count mode</h2>
        </div>
        <strong>${state.shoe.deckCount} decks</strong>
      </div>
      <dl class="device-list">
        <div>
          <dt><span>Selected</span></dt>
          <dd>${bucketLabels[state.selectedBucket]}</dd>
        </div>
        <div>
          <dt><span>Last entry</span></dt>
          <dd>${lastBucket ? bucketLabels[lastBucket] : '-'}</dd>
        </div>
        <div>
          <dt><span>Notice</span></dt>
          <dd>${state.notice}</dd>
        </div>
      </dl>
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

function renderIndexTable(): string {
  return `
    <section class="reference-panel">
      <div class="panel-heading">
        <div>
          <span>Drills</span>
          <h2>Common index table</h2>
        </div>
        <strong>TCi</strong>
      </div>
      <table class="reference-table">
        <thead>
          <tr>
            <th>Play</th>
            <th>Trigger</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${indexReferenceRows
            .map(
              (row) => `
                <tr>
                  <td>${row.play}</td>
                  <td>${row.trigger}</td>
                  <td>${row.note}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}
