import { useLayoutEffect, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { styles } from './styles.ts';

/**
 * Renders children into a shadow root on a host element appended to
 * `document.body`, with the panel's CSS inside it. Host styles can't leak in,
 * and the panel's styles can't leak out.
 *
 * The host lives on `body` rather than where `<SWRDevtools />` is placed, so
 * the app's layout and stacking contexts don't affect the floating panel.
 * React context, including `<SWRConfig>`, still reaches through the portal.
 *
 * Renders nothing on the server and until the shadow root exists.
 */
export function ShadowHost({ children }: { children: ReactNode }): ReactElement | null {
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  // A layout effect so the panel appears in the same paint as the app.
  useLayoutEffect(() => {
    const host = document.createElement('div');
    host.setAttribute('data-swr-devtools', '');
    const shadow = host.attachShadow({ mode: 'open' });
    document.body.append(host);
    // Creating the host is DOM work, so it happens here rather than during
    // render: that keeps server rendering and hydration free of the panel.
    // oxlint-disable-next-line react/set-state-in-effect
    setRoot(shadow);
    return () => {
      host.remove();
      setRoot(null);
    };
  }, []);

  if (!root) return null;
  return createPortal(
    <>
      <style>{styles}</style>
      {children}
    </>,
    root
  );
}
