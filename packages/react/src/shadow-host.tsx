import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { styles } from './styles.ts';

export interface ShadowHostProps {
  children: ReactNode;
  /**
   * Put the host where the component is rendered, filling its container,
   * instead of on `document.body`. For `<SWRDevtoolsPanel />`, which the app
   * places itself.
   */
  inline?: boolean;
}

/**
 * Renders children into a shadow root, with the panel's CSS inside it. Host
 * styles can't leak in, and the panel's styles can't leak out.
 *
 * By default the host is appended to `document.body` rather than placed where
 * `<SWRDevtools />` is, so the app's layout and stacking contexts don't
 * affect the floating panel. React context, including `<SWRConfig>`, still
 * reaches through the portal.
 *
 * Renders nothing on the server, and nothing inside the host until the shadow
 * root exists.
 */
export function ShadowHost({ children, inline = false }: ShadowHostProps): ReactElement | null {
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const inlineHost = useRef<HTMLDivElement>(null);

  // A layout effect so the panel appears in the same paint as the app.
  useLayoutEffect(() => {
    let host = inlineHost.current;
    const owned = host === null;
    if (host === null) {
      host = document.createElement('div');
      host.setAttribute('data-swr-devtools', '');
      document.body.append(host);
    }
    // StrictMode runs this twice on the same inline host, and a shadow root
    // can only be attached once.
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    // Creating the shadow root is DOM work, so it happens here rather than
    // during render: that keeps server rendering and hydration free of it.
    // oxlint-disable-next-line react/set-state-in-effect
    setRoot(shadow);
    return () => {
      if (owned) host.remove();
      setRoot(null);
    };
  }, []);

  const content =
    root &&
    createPortal(
      <>
        <style>{styles}</style>
        {children}
      </>,
      root
    );

  if (inline) {
    return (
      <div ref={inlineHost} data-swr-devtools="" data-inline="">
        {content}
      </div>
    );
  }
  return content;
}
