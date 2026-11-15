import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShadowHost } from './shadow-host.tsx';

function host(): Element | null {
  return document.querySelector('[data-swr-devtools]');
}

describe('<ShadowHost />', () => {
  it('renders children into a shadow root on a host appended to body', () => {
    const { container } = render(
      <ShadowHost>
        <p>inside</p>
      </ShadowHost>
    );

    expect(host()?.parentElement).toBe(document.body);
    expect(host()?.shadowRoot?.querySelector('p')?.textContent).toBe('inside');
    // Not in the light DOM where the component was placed.
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('inside')).not.toBeInTheDocument();
  });

  it('injects the CSS, with design tokens, into the shadow root', () => {
    render(<ShadowHost>{null}</ShadowHost>);

    const css = host()?.shadowRoot?.querySelector('style')?.textContent ?? '';
    expect(css).toContain(':host');
    expect(css).toContain('all: initial !important');
    // `all` doesn't cover direction, so the host page's RTL would leak in.
    expect(css).toContain('direction: ltr !important');
    expect(css).toContain('unicode-bidi: isolate !important');
    // Keeps a resized panel on screen when the window shrinks.
    expect(css).toContain('max-height: calc(100vh - 40px)');
    expect(css).toContain('max-width: calc(100vw - 40px)');
    // Lets touch drags resize the panel instead of scrolling the page.
    expect(css).toContain('touch-action: none');
    // Narrow key rows wrap, keeping room for the key, instead of overflowing.
    expect(css).toMatch(/\.key-row \{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/\.key \{[^}]*flex: 1 1 128px/);
    for (const token of ['color-bg', 'space-1', 'radius-sm', 'font-sans', 'color-error']) {
      expect(css).toContain(`--swr-dt-${token}:`);
    }
    expect(document.head.querySelector('style')).toBeNull();
  });

  it('puts the host where it is rendered when inline', () => {
    const { container } = render(
      <ShadowHost inline>
        <p>inside</p>
      </ShadowHost>
    );

    expect(host()?.parentElement).toBe(container);
    expect(host()).toHaveAttribute('data-inline');
    expect(host()?.shadowRoot?.querySelector('p')?.textContent).toBe('inside');
  });

  it('removes the host when it unmounts', () => {
    const { unmount } = render(<ShadowHost>{null}</ShadowHost>);
    expect(host()).not.toBeNull();

    unmount();

    expect(host()).toBeNull();
  });
});
