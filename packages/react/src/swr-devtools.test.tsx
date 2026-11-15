import { act, fireEvent, render } from '@testing-library/react';
import { SWRConfig, type Cache } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, STORAGE_KEY } from './storage.ts';
import { MIN_SIZE, SWRDevtools, type SWRDevtoolsProps } from './swr-devtools.tsx';

function renderDevtools(props: SWRDevtoolsProps = {}) {
  const cache: Cache = new Map([['/api/user', { data: 'Ada' }]]);
  return render(
    <SWRConfig value={{ provider: () => cache }}>
      <SWRDevtools {...props} />
    </SWRConfig>
  );
}

/** Finds an element in the devtools' shadow root, which `screen` can't reach. */
function find(selector: string): HTMLElement | null {
  return (
    document
      .querySelector('[data-swr-devtools]')
      ?.shadowRoot?.querySelector<HTMLElement>(selector) ?? null
  );
}

function get(selector: string): HTMLElement {
  const element = find(selector);
  if (!element) throw new Error(`Nothing matches ${selector}`);
  return element;
}

function click(selector: string) {
  act(() => get(selector).click());
}

function saved(): unknown {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('<SWRDevtools />', () => {
  it('starts closed, with a toggle in the bottom-right corner', () => {
    renderDevtools();

    expect(get('.toggle')).toHaveAttribute('data-position', 'bottom-right');
    expect(get('.toggle')).toHaveAccessibleName('Open SWR Devtools');
    expect(find('.panel')).toBeNull();
  });

  it('opens a panel docked at the bottom, and closes it again', () => {
    renderDevtools();

    click('.toggle');

    expect(find('.toggle')).toBeNull();
    expect(get('.panel')).toHaveAttribute('data-position', 'bottom');
    expect(get('.panel').style.height).toBe(`${DEFAULT_HEIGHT}px`);
    expect(get('.panel-content')).toHaveTextContent('/api/user');

    click('[aria-label="Close SWR Devtools"]');

    expect(find('.panel')).toBeNull();
    expect(document.querySelector('[data-swr-devtools]')?.shadowRoot?.activeElement).toBe(
      get('.toggle')
    );
  });

  it('opens straight away with initialIsOpen', () => {
    renderDevtools({ initialIsOpen: true });

    expect(find('.panel')).not.toBeNull();
  });

  it('puts the toggle in the chosen corner and docks the panel on the right', () => {
    renderDevtools({ buttonPosition: 'top-left', position: 'right' });
    expect(get('.toggle')).toHaveAttribute('data-position', 'top-left');

    click('.toggle');

    expect(get('.panel')).toHaveAttribute('data-position', 'right');
    expect(get('.panel').style.width).toBe(`${DEFAULT_WIDTH}px`);
  });

  describe('ages', () => {
    // SWR doesn't record when data changed, so the devtools time changes
    // themselves. They watch from mount, not only while the panel is open.
    it('are right when the panel first opens', () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
      renderDevtools();

      now.mockReturnValue(1_060_000);
      click('.toggle');

      expect(get('.panel-content')).toHaveTextContent('1m ago');
    });

    it("don't reset when the panel is closed and reopened", () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
      renderDevtools({ initialIsOpen: true });
      click('[aria-label="Close SWR Devtools"]');

      now.mockReturnValue(1_060_000);
      click('.toggle');

      expect(get('.panel-content')).toHaveTextContent('1m ago');
    });
  });

  describe('remembering state', () => {
    it('reopens after a reload once the user has opened it', () => {
      const { unmount } = renderDevtools();
      click('.toggle');
      expect(saved()).toEqual({ isOpen: true, height: DEFAULT_HEIGHT, width: DEFAULT_WIDTH });

      unmount();
      renderDevtools();

      expect(find('.panel')).not.toBeNull();
    });

    it("doesn't save initialIsOpen until the user opens or closes the panel", () => {
      renderDevtools({ initialIsOpen: true });

      expect(saved()).toBeNull();
    });

    it('prefers what the user chose over initialIsOpen', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ isOpen: false }));

      renderDevtools({ initialIsOpen: true });

      expect(find('.panel')).toBeNull();
    });

    it('still works when storage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      renderDevtools();

      click('.toggle');

      expect(find('.panel')).not.toBeNull();
    });
  });

  describe('resizing', () => {
    it('drags the top edge of a bottom panel', () => {
      renderDevtools({ initialIsOpen: true });
      const handle = get('[role="separator"]');

      fireEvent.pointerDown(handle);
      fireEvent.pointerMove(window, { clientY: window.innerHeight - 400 });
      fireEvent.pointerUp(window);
      fireEvent.pointerMove(window, { clientY: window.innerHeight - 500 });

      expect(get('.panel').style.height).toBe('400px');
      expect(saved()).toMatchObject({ height: 400 });
    });

    it('drags the left edge of a right panel', () => {
      renderDevtools({ initialIsOpen: true, position: 'right' });

      fireEvent.pointerDown(get('[role="separator"]'));
      fireEvent.pointerMove(window, { clientX: window.innerWidth - 300 });
      fireEvent.pointerUp(window);

      expect(get('.panel').style.width).toBe('300px');
      expect(saved()).toMatchObject({ width: 300 });
    });

    it('stops dragging when the browser cancels the pointer', () => {
      renderDevtools({ initialIsOpen: true });

      fireEvent.pointerDown(get('[role="separator"]'));
      fireEvent.pointerMove(window, { clientY: window.innerHeight - 400 });
      fireEvent.pointerCancel(window);
      fireEvent.pointerMove(window, { clientY: window.innerHeight - 500 });

      expect(get('.panel').style.height).toBe('400px');
    });

    it('resizes with the arrow keys', () => {
      renderDevtools({ initialIsOpen: true });
      const handle = get('[role="separator"]');
      expect(handle).toHaveAttribute('aria-valuenow', String(DEFAULT_HEIGHT));

      fireEvent.keyDown(handle, { key: 'ArrowUp' });

      expect(get('.panel').style.height).toBe(`${DEFAULT_HEIGHT + 16}px`);
      expect(get('[role="separator"]')).toHaveAttribute(
        'aria-valuenow',
        String(DEFAULT_HEIGHT + 16)
      );
    });

    it('keeps the panel between the minimum size and the viewport', () => {
      renderDevtools({ initialIsOpen: true });

      fireEvent.pointerDown(get('[role="separator"]'));
      fireEvent.pointerMove(window, { clientY: window.innerHeight - 10 });
      expect(get('.panel').style.height).toBe(`${MIN_SIZE}px`);

      fireEvent.pointerMove(window, { clientY: -500 });
      expect(get('.panel').style.height).toBe(`${window.innerHeight - 40}px`);
      fireEvent.pointerUp(window);
    });
  });
});
