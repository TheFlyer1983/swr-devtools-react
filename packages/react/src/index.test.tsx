import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// index.ts reads NODE_ENV once, when it's first imported, so each test stubs
// it and then imports a fresh copy.
async function importWith(nodeEnv: string, entry: './index.ts' | './production.ts') {
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.resetModules();
  return import(entry);
}

function devtoolsHosts(): number {
  return document.querySelectorAll('[data-swr-devtools]').length;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('production safety', () => {
  it('renders the devtools outside production', async () => {
    const { SWRDevtools, SWRDevtoolsPanel } = await importWith('development', './index.ts');
    render(
      <>
        <SWRDevtools />
        <SWRDevtoolsPanel />
      </>
    );
    expect(devtoolsHosts()).toBe(2);
  });

  it('renders nothing in production', async () => {
    const { SWRDevtools, SWRDevtoolsPanel } = await importWith('production', './index.ts');
    const { container } = render(
      <>
        <SWRDevtools />
        <SWRDevtoolsPanel />
      </>
    );
    expect(container).toBeEmptyDOMElement();
    expect(devtoolsHosts()).toBe(0);
  });

  it('renders the devtools in production from the production entry', async () => {
    const { SWRDevtools, SWRDevtoolsPanel } = await importWith('production', './production.ts');
    render(
      <>
        <SWRDevtools />
        <SWRDevtoolsPanel />
      </>
    );
    expect(devtoolsHosts()).toBe(2);
  });
});
