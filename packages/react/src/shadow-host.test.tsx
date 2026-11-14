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
    for (const token of ['color-bg', 'space-1', 'radius-sm', 'font-sans', 'color-error']) {
      expect(css).toContain(`--swr-dt-${token}:`);
    }
    expect(document.head.querySelector('style')).toBeNull();
  });

  it('removes the host when it unmounts', () => {
    const { unmount } = render(<ShadowHost>{null}</ShadowHost>);
    expect(host()).not.toBeNull();

    unmount();

    expect(host()).toBeNull();
  });
});
