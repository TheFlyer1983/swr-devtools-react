/**
 * The panel's CSS, injected into its shadow root. Host-page stylesheets don't
 * reach inside the shadow root, and `:host` cuts off inherited styles such as
 * `font` and `color`.
 *
 * Design tokens are CSS variables prefixed `--swr-dt-`. Components use the
 * tokens, never raw values, so a later move to Tailwind maps them across.
 */
export const styles = `
:host {
  /* Inner !important beats the host page's !important, so even an
     aggressive global reset can't restyle or hide the host element. */
  all: initial !important;
  /* \`all\` leaves these two out, so an RTL host page would flip the panel. */
  direction: ltr !important;
  unicode-bidi: isolate !important;

  /* Colours */
  --swr-dt-color-bg: #ffffff;
  --swr-dt-color-surface: #f6f7f9;
  --swr-dt-color-text: #1c2024;
  --swr-dt-color-muted: #60646c;
  --swr-dt-color-border: #e0e1e6;
  --swr-dt-color-accent: #0969da;
  --swr-dt-color-accent-text: #ffffff;

  /* Status colours, designed for SWR's states */
  --swr-dt-color-loading: #9a6700;
  --swr-dt-color-validating: #0969da;
  --swr-dt-color-success: #1f883d;
  --swr-dt-color-error: #d1242f;
  --swr-dt-color-idle: #60646c;

  /* Spacing */
  --swr-dt-space-1: 4px;
  --swr-dt-space-2: 8px;
  --swr-dt-space-3: 12px;
  --swr-dt-space-4: 16px;

  /* Radii */
  --swr-dt-radius-sm: 4px;
  --swr-dt-radius-md: 8px;
  --swr-dt-radius-full: 9999px;

  /* Fonts */
  --swr-dt-font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --swr-dt-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --swr-dt-font-size-sm: 12px;
  --swr-dt-font-size-md: 13px;
  --swr-dt-line-height: 1.4;

  /* Layering and elevation */
  --swr-dt-z-index: 99999;
  --swr-dt-shadow: 0 4px 16px rgb(0 0 0 / 0.16);
}

/* <SWRDevtoolsPanel /> fills the element the app renders it in. */
:host([data-inline]) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.toggle {
  position: fixed;
  z-index: var(--swr-dt-z-index);
  margin: var(--swr-dt-space-4);
  padding: var(--swr-dt-space-2) var(--swr-dt-space-3);
  font-family: var(--swr-dt-font-sans);
  font-size: var(--swr-dt-font-size-md);
  font-weight: 700;
  color: var(--swr-dt-color-accent-text);
  background: var(--swr-dt-color-accent);
  border-color: var(--swr-dt-color-accent);
  border-radius: var(--swr-dt-radius-full);
  box-shadow: var(--swr-dt-shadow);
}

.toggle:hover {
  border-color: var(--swr-dt-color-text);
}

.toggle[data-position^='top'] {
  top: 0;
}

.toggle[data-position^='bottom'] {
  bottom: 0;
}

.toggle[data-position$='left'] {
  left: 0;
}

.toggle[data-position$='right'] {
  right: 0;
}

.panel {
  position: fixed;
  z-index: var(--swr-dt-z-index);
  display: flex;
  background: var(--swr-dt-color-bg);
  box-shadow: var(--swr-dt-shadow);
}

.panel[data-position='bottom'] {
  left: 0;
  right: 0;
  bottom: 0;
  flex-direction: column;
  /* The size is clamped when it's set; this keeps it on screen when the
     window shrinks afterwards. 40px matches VIEWPORT_GAP. */
  max-height: calc(100vh - 40px);
  border-top: 1px solid var(--swr-dt-color-border);
}

.panel[data-position='right'] {
  top: 0;
  right: 0;
  bottom: 0;
  flex-direction: row;
  max-width: calc(100vw - 40px);
  border-left: 1px solid var(--swr-dt-color-border);
}

.resize-handle {
  flex: none;
  background: transparent;
  /* Without this, a touch drag on the edge scrolls the page instead. */
  touch-action: none;
}

.panel[data-position='bottom'] > .resize-handle {
  height: var(--swr-dt-space-1);
  cursor: ns-resize;
}

.panel[data-position='right'] > .resize-handle {
  width: var(--swr-dt-space-1);
  cursor: ew-resize;
}

.resize-handle:hover,
.resize-handle:focus-visible {
  background: var(--swr-dt-color-accent);
  outline: none;
}

.panel-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  color-scheme: light;
  font-family: var(--swr-dt-font-sans);
  font-size: var(--swr-dt-font-size-md);
  line-height: var(--swr-dt-line-height);
  color: var(--swr-dt-color-text);
  background: var(--swr-dt-color-bg);
}

.header {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--swr-dt-space-2);
  padding: var(--swr-dt-space-2) var(--swr-dt-space-3);
  background: var(--swr-dt-color-surface);
  border-bottom: 1px solid var(--swr-dt-color-border);
}

.title {
  font-weight: 600;
}

.mode {
  color: var(--swr-dt-color-muted);
}

.header-actions {
  display: flex;
  gap: var(--swr-dt-space-1);
  margin-left: auto;
}

.toolbar {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--swr-dt-space-2);
  padding: var(--swr-dt-space-2) var(--swr-dt-space-3);
  border-bottom: 1px solid var(--swr-dt-color-border);
}

.search {
  flex: 1 1 160px;
  min-width: 0;
}

.sort-label {
  flex: none;
  font-size: var(--swr-dt-font-size-sm);
  color: var(--swr-dt-color-muted);
}

.sort {
  flex: none;
}

.body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 var(--swr-dt-space-3) var(--swr-dt-space-3);
}

button,
input,
select {
  font: inherit;
  font-size: var(--swr-dt-font-size-sm);
  color: var(--swr-dt-color-text);
  background: var(--swr-dt-color-surface);
  border: 1px solid var(--swr-dt-color-border);
  border-radius: var(--swr-dt-radius-sm);
  padding: var(--swr-dt-space-1) var(--swr-dt-space-2);
}

button,
select {
  cursor: pointer;
}

button:hover,
select:hover {
  border-color: var(--swr-dt-color-accent);
}

input {
  background: var(--swr-dt-color-bg);
}

input::placeholder {
  color: var(--swr-dt-color-muted);
}

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--swr-dt-color-accent);
  outline-offset: 1px;
}

.empty {
  margin: 0;
  padding: var(--swr-dt-space-4) 0;
  color: var(--swr-dt-color-muted);
}

.key-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.key-row {
  display: flex;
  flex-wrap: wrap;
  /* Whatever wraps onto a second line sits on the right, like the first. */
  justify-content: flex-end;
  align-items: center;
  gap: var(--swr-dt-space-1) var(--swr-dt-space-2);
  min-height: 32px;
  padding: var(--swr-dt-space-1) 0;
  border-bottom: 1px solid var(--swr-dt-color-border);
}

/* In a narrow panel the key keeps 128px next to the badge, and the kind,
   age and actions wrap onto a second line. */
.key {
  flex: 1 1 128px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--swr-dt-font-mono);
  font-size: var(--swr-dt-font-size-sm);
}

/* A fixed width keeps the keys lined up, whatever the status. */
.badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--swr-dt-space-1);
  width: 92px;
  padding: 2px var(--swr-dt-space-2);
  font-size: var(--swr-dt-font-size-sm);
  font-weight: 600;
  color: var(--swr-dt-badge-color);
  background: color-mix(in srgb, var(--swr-dt-badge-color) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--swr-dt-badge-color) 30%, transparent);
  border-radius: var(--swr-dt-radius-full);
}

.badge::before {
  content: '';
  flex: none;
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: var(--swr-dt-radius-full);
}

/* Each state gets its own shape too: a hollow dot before any data arrives,
   a pulsing one while fetching in the background. */
.badge[data-status='loading'] {
  --swr-dt-badge-color: var(--swr-dt-color-loading);
}

.badge[data-status='loading']::before {
  background: transparent;
  border: 1.5px solid currentColor;
}

.badge[data-status='validating'] {
  --swr-dt-badge-color: var(--swr-dt-color-validating);
}

.badge[data-status='validating']::before {
  animation: swr-dt-pulse 1s ease-in-out infinite alternate;
}

.badge[data-status='success'] {
  --swr-dt-badge-color: var(--swr-dt-color-success);
}

.badge[data-status='error'] {
  --swr-dt-badge-color: var(--swr-dt-color-error);
}

.badge[data-status='idle'] {
  --swr-dt-badge-color: var(--swr-dt-color-idle);
}

@keyframes swr-dt-pulse {
  to {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge[data-status='validating']::before {
    animation: none;
  }
}

.kind {
  flex: none;
  padding: 0 var(--swr-dt-space-1);
  font-size: var(--swr-dt-font-size-sm);
  color: var(--swr-dt-color-muted);
  border: 1px solid var(--swr-dt-color-border);
  border-radius: var(--swr-dt-radius-sm);
}

.age {
  flex: none;
  min-width: 56px;
  text-align: right;
  font-size: var(--swr-dt-font-size-sm);
  font-variant-numeric: tabular-nums;
  color: var(--swr-dt-color-muted);
}

.actions {
  display: flex;
  flex: none;
  gap: var(--swr-dt-space-1);
}
`;
