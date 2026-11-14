/**
 * A deliberately hostile global stylesheet, for checking that the host page's
 * CSS can't reach the devtools panel (issue #10). Toggle it from the header.
 */
export const aggressiveReset = `
*, *::before, *::after {
  all: unset !important;
  box-sizing: content-box !important;
  font: italic 22px/1 Georgia, serif !important;
  color: #d000d0 !important;
  background: #fff700 !important;
  border: 2px dashed #ff0000 !important;
}
html, body { direction: rtl !important; }
head, style, script { display: none !important; }
/* Keep the playground's own checkboxes usable: visible state and focus. */
input { all: revert !important; }
div, p, header, main, fieldset, table, label { display: block !important; }
[data-swr-devtools] { display: none !important; opacity: 0.2 !important; }
`;
