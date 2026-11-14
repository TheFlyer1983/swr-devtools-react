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
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.root {
  color-scheme: light;
  font-family: var(--swr-dt-font-sans);
  font-size: var(--swr-dt-font-size-md);
  line-height: var(--swr-dt-line-height);
  color: var(--swr-dt-color-text);
  background: var(--swr-dt-color-bg);
  border: 1px solid var(--swr-dt-color-border);
  border-radius: var(--swr-dt-radius-md);
  padding: var(--swr-dt-space-3);
  margin: var(--swr-dt-space-4);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--swr-dt-space-2);
  margin: 0 0 var(--swr-dt-space-2);
}

.title {
  font-weight: 600;
}

.mode {
  color: var(--swr-dt-color-muted);
}

button {
  font: inherit;
  font-size: var(--swr-dt-font-size-sm);
  color: var(--swr-dt-color-text);
  background: var(--swr-dt-color-surface);
  border: 1px solid var(--swr-dt-color-border);
  border-radius: var(--swr-dt-radius-sm);
  padding: var(--swr-dt-space-1) var(--swr-dt-space-2);
  cursor: pointer;
}

button:hover {
  border-color: var(--swr-dt-color-accent);
}

button:focus-visible {
  outline: 2px solid var(--swr-dt-color-accent);
  outline-offset: 1px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: var(--swr-dt-space-1) var(--swr-dt-space-2);
  border-bottom: 1px solid var(--swr-dt-color-border);
}

th {
  font-size: var(--swr-dt-font-size-sm);
  font-weight: 600;
  color: var(--swr-dt-color-muted);
}

.key {
  font-family: var(--swr-dt-font-mono);
  font-size: var(--swr-dt-font-size-sm);
}

.status {
  font-weight: 600;
}

.status[data-status='loading'] {
  color: var(--swr-dt-color-loading);
}

.status[data-status='validating'] {
  color: var(--swr-dt-color-validating);
}

.status[data-status='success'] {
  color: var(--swr-dt-color-success);
}

.status[data-status='error'] {
  color: var(--swr-dt-color-error);
}

.status[data-status='idle'] {
  color: var(--swr-dt-color-idle);
}

.actions {
  display: flex;
  gap: var(--swr-dt-space-1);
}
`;
