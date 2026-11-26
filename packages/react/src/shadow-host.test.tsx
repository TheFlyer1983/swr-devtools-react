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

  it('gives every colour token a light and a dark value', () => {
    render(<ShadowHost>{null}</ShadowHost>);

    const css = host()?.shadowRoot?.querySelector('style')?.textContent ?? '';
    const colours = css.match(/--swr-dt-color-[\w-]+: [^;]+;/g) ?? [];
    expect(colours.length).toBeGreaterThan(0);
    for (const declaration of colours) {
      expect(declaration).toMatch(/: light-dark\(#[\da-f]+, #[\da-f]+\);$/);
    }
    // The panel's own colour-scheme would override the one the theme sets.
    expect(css).not.toMatch(/\.panel-content \{[^}]*color-scheme/);
  });

  it('follows the system theme by default, and the theme prop when given', () => {
    const { rerender } = render(<ShadowHost>{null}</ShadowHost>);
    const css = host()?.shadowRoot?.querySelector('style')?.textContent ?? '';
    expect(host()).toHaveAttribute('data-theme', 'system');
    expect(css).toMatch(/:host \{[^}]*color-scheme: light dark !important/);

    rerender(<ShadowHost theme="dark">{null}</ShadowHost>);
    expect(host()).toHaveAttribute('data-theme', 'dark');
    expect(css).toMatch(/:host\(\[data-theme='dark'\]\) \{\s*color-scheme: dark !important/);

    rerender(<ShadowHost theme="light">{null}</ShadowHost>);
    expect(host()).toHaveAttribute('data-theme', 'light');
    expect(css).toMatch(/:host\(\[data-theme='light'\]\) \{\s*color-scheme: light !important/);
  });

  it('sets the theme on an inline host too', () => {
    render(
      <ShadowHost inline theme="dark">
        {null}
      </ShadowHost>
    );

    expect(host()).toHaveAttribute('data-inline');
    expect(host()).toHaveAttribute('data-theme', 'dark');
  });

  it('keeps the same host when the theme changes', () => {
    const { rerender } = render(<ShadowHost theme="light">{null}</ShadowHost>);
    const first = host();

    rerender(<ShadowHost theme="dark">{null}</ShadowHost>);

    expect(host()).toBe(first);
  });

  it('removes the host when it unmounts', () => {
    const { unmount } = render(<ShadowHost>{null}</ShadowHost>);
    expect(host()).not.toBeNull();

    unmount();

    expect(host()).toBeNull();
  });
});
