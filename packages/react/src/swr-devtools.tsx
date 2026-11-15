import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement
} from 'react';
import { Panel, useCacheView } from './panel.tsx';
import { ShadowHost } from './shadow-host.tsx';
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  loadPanelState,
  savePanelState,
  type PanelPosition,
  type PanelState
} from './storage.ts';

/** Which corner of the viewport the toggle button sits in. */
export type ButtonPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface SWRDevtoolsProps {
  /** Start with the panel open, until the user opens or closes it. Then their choice is remembered. */
  initialIsOpen?: boolean;
  /** Corner for the toggle button. Defaults to `bottom-right`. */
  buttonPosition?: ButtonPosition;
  /** Where the panel docks. Defaults to `bottom`. */
  position?: PanelPosition;
}

/** Smallest panel size, in pixels. */
export const MIN_SIZE = 120;
/** Space always left for the app when the panel is at its largest, in pixels. */
const VIEWPORT_GAP = 40;
/** How far one arrow-key press resizes the panel, in pixels. */
const KEY_STEP = 16;

/**
 * A floating button that opens the devtools panel, docked to the bottom or
 * right of the viewport. Place it inside the app's `<SWRConfig>`.
 *
 * Whether it's open, and its size, are remembered in `localStorage`.
 */
export function SWRDevtools({
  initialIsOpen = false,
  buttonPosition = 'bottom-right',
  position = 'bottom'
}: SWRDevtoolsProps): ReactElement | null {
  return (
    <ShadowHost>
      <Floating initialIsOpen={initialIsOpen} buttonPosition={buttonPosition} position={position} />
    </ShadowHost>
  );
}

interface FloatingProps {
  initialIsOpen: boolean;
  buttonPosition: ButtonPosition;
  position: PanelPosition;
}

function Floating({ initialIsOpen, buttonPosition, position }: FloatingProps): ReactElement {
  // Watched here, not in the panel, so ages are right whenever it opens.
  const view = useCacheView();
  // Safe to read storage here: ShadowHost only renders this on the client,
  // after mount, so there's no server markup to mismatch.
  const [state, setState] = useState<PanelState>(() =>
    loadPanelState({ isOpen: initialIsOpen, height: DEFAULT_HEIGHT, width: DEFAULT_WIDTH })
  );
  // Only save what the user changed, so `initialIsOpen` keeps working until
  // they first open or close the panel.
  const changed = useRef(false);
  useEffect(() => {
    if (changed.current) savePanelState(state);
  }, [state]);

  const update = (patch: Partial<PanelState>) => {
    changed.current = true;
    setState((current) => ({ ...current, ...patch }));
  };

  const toggle = useRef<HTMLButtonElement>(null);
  const focusToggle = useRef(false);
  useEffect(() => {
    if (!state.isOpen && focusToggle.current) {
      focusToggle.current = false;
      toggle.current?.focus();
    }
  }, [state.isOpen]);

  if (!state.isOpen) {
    return (
      <button
        ref={toggle}
        type="button"
        className="toggle"
        data-position={buttonPosition}
        aria-label="Open SWR Devtools"
        onClick={() => update({ isOpen: true })}
      >
        SWR
      </button>
    );
  }

  const isBottom = position === 'bottom';
  const size = clampSize(isBottom ? state.height : state.width, isBottom);
  const resize = (next: number) =>
    update(isBottom ? { height: clampSize(next, true) } : { width: clampSize(next, false) });

  return (
    <aside
      className="panel"
      data-position={position}
      aria-label="SWR Devtools"
      style={isBottom ? { height: size } : { width: size }}
    >
      <ResizeHandle isBottom={isBottom} size={size} onResize={resize} />
      <Panel
        view={view}
        onClose={() => {
          focusToggle.current = true;
          update({ isOpen: false });
        }}
      />
    </aside>
  );
}

interface ResizeHandleProps {
  isBottom: boolean;
  size: number;
  onResize: (size: number) => void;
}

/** Drag, or focus and use the arrow keys, to resize the panel. */
function ResizeHandle({ isBottom, size, onResize }: ResizeHandleProps): ReactElement {
  // Stops an in-progress drag if the panel unmounts mid-drag.
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);

  const move = (event: PointerEvent) =>
    onResize(isBottom ? window.innerHeight - event.clientY : window.innerWidth - event.clientX);
  const stop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    stopDrag.current = null;
  };
  const startDrag = (event: ReactPointerEvent) => {
    event.preventDefault();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    // The browser cancels the pointer for things like palm rejection.
    window.addEventListener('pointercancel', stop);
    stopDrag.current = stop;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const grow = isBottom ? 'ArrowUp' : 'ArrowLeft';
    const shrink = isBottom ? 'ArrowDown' : 'ArrowRight';
    if (event.key !== grow && event.key !== shrink) return;
    event.preventDefault();
    onResize(size + (event.key === grow ? KEY_STEP : -KEY_STEP));
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      className="resize-handle"
      aria-label="Resize SWR Devtools"
      // The separator lies across the panel's edge: horizontal for a bottom
      // dock, vertical for a right one.
      aria-orientation={isBottom ? 'horizontal' : 'vertical'}
      aria-valuemin={MIN_SIZE}
      aria-valuemax={maxSize(isBottom)}
      aria-valuenow={size}
      onPointerDown={startDrag}
      onKeyDown={onKeyDown}
    />
  );
}

function maxSize(isBottom: boolean): number {
  const viewport = isBottom ? window.innerHeight : window.innerWidth;
  return Math.max(MIN_SIZE, viewport - VIEWPORT_GAP);
}

function clampSize(size: number, isBottom: boolean): number {
  return Math.round(Math.min(Math.max(size, MIN_SIZE), maxSize(isBottom)));
}
