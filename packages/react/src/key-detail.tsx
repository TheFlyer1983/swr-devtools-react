import {
  parseEditedData,
  toEditableData,
  type CacheActions,
  type CacheEntry
} from '@swr-devtools-react/core';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react';
import { JsonTree } from './json-tree.tsx';
import { KIND_NAMES, StatusBadge, UNUSED_NOTE } from './key-list.tsx';

export interface KeyDetailProps {
  entry: CacheEntry;
  actions: CacheActions;
  onClose: () => void;
}

/**
 * Why Revalidate can't refetch a key, if it can't. `mutate(key)` refetches
 * through the key's mounted hook, and a subscription's hook has no fetcher.
 * This also covers `useSWRInfinite`'s page keys: only its `$inf$` key has a
 * hook.
 */
function revalidateUnavailable({ kind, hooks }: CacheEntry): string | undefined {
  if (kind === 'subscription') {
    return 'Subscription keys have no fetcher, so they can’t be revalidated.';
  }
  if (hooks === 0) return 'No mounted hook uses this key, so there’s no fetcher to call.';
  return undefined;
}

/** One key in full: its key, status, error (if any) and data, with actions. */
export function KeyDetail({ entry, actions, onClose }: KeyDetailProps): ReactElement {
  // Only for Edit's disabled reason. Edit reads the data again when clicked,
  // since an app can change its data in place and keep the same object.
  const editable = useMemo(() => toEditableData(entry.data), [entry.data]);
  // The text the editor started from, or null when not editing. Taken once,
  // so a live update doesn't overwrite what the user is typing.
  const [editing, setEditing] = useState<{ text: string; exact: boolean } | null>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  // Only move focus back to Edit after the editor closes, not on first render.
  const hasEdited = useRef(false);

  useEffect(() => {
    if (hasEdited.current && editing === null) editRef.current?.focus();
  }, [editing]);

  const stopEditing = () => {
    hasEdited.current = true;
    setEditing(null);
  };

  return (
    <section className="detail" aria-label="Key details">
      <header className="detail-header">
        <StatusBadge status={entry.status} />
        <h2 className="detail-key">{entry.label}</h2>
        <button type="button" aria-label="Close key details" onClick={onClose}>
          ✕
        </button>
      </header>
      <dl className="detail-meta">
        {entry.kind !== 'standard' && (
          <>
            <dt>Type</dt>
            <dd>{KIND_NAMES[entry.kind]}</dd>
          </>
        )}
        {/* SWR's serialised form, as it appears in the cache and in mutate(). */}
        {entry.key !== entry.label && (
          <>
            <dt>Cache key</dt>
            <dd className="detail-raw-key">{entry.key}</dd>
          </>
        )}
        {entry.hooks !== undefined && (
          <>
            <dt>Hooks</dt>
            <dd>{entry.hooks === 0 ? `None mounted. ${UNUSED_NOTE}` : `${entry.hooks} mounted`}</dd>
          </>
        )}
        <dt>Updated</dt>
        <dd>
          <time dateTime={new Date(entry.updatedAt).toISOString()}>
            {new Date(entry.updatedAt).toLocaleString()}
          </time>
        </dd>
      </dl>
      <div className="detail-actions">
        <ActionButton
          reason={revalidateUnavailable(entry)}
          onClick={() => void actions.revalidate(entry.key)}
        >
          Revalidate
        </ActionButton>
        <button type="button" className="danger" onClick={() => void actions.remove(entry.key)}>
          Delete
        </button>
        {editing === null && (
          <ActionButton
            buttonRef={editRef}
            reason={editable.editable ? undefined : editable.reason}
            onClick={() => {
              const current = toEditableData(entry.data);
              if (current.editable) setEditing({ text: current.text, exact: current.exact });
            }}
          >
            Edit
          </ActionButton>
        )}
      </div>
      {entry.error !== undefined && (
        <>
          <h3 className="detail-heading">Error</h3>
          <JsonTree value={entry.error} label="Error" />
        </>
      )}
      <h3 className="detail-heading">Data</h3>
      {editing === null ? (
        <JsonTree value={entry.data} label="Data" />
      ) : (
        <DataEditor
          initialText={editing.text}
          exact={editing.exact}
          onApply={async (data) => {
            await actions.setData(entry.key, data);
            stopEditing();
          }}
          onCancel={stopEditing}
        />
      )}
    </section>
  );
}

/**
 * An action button, or, with a reason, a disabled one that says why. It uses
 * `aria-disabled` rather than `disabled`, so it stays focusable and shows its
 * tooltip: disabled buttons don't get hover or focus in every browser.
 */
function ActionButton({
  buttonRef,
  reason,
  onClick,
  children
}: {
  /** Not `ref`, which React 18 doesn't pass to function components. */
  buttonRef?: Ref<HTMLButtonElement>;
  reason: string | undefined;
  onClick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-disabled={reason !== undefined || undefined}
      title={reason}
      onClick={reason === undefined ? onClick : undefined}
    >
      {children}
    </button>
  );
}

/**
 * The JSON editor that replaces the data tree while editing. Invalid JSON
 * shows an error under the text and isn't applied. Escape cancels, and
 * Ctrl+Enter (⌘+Enter on a Mac) applies.
 */
function DataEditor({
  initialText,
  exact,
  onApply,
  onCancel
}: {
  initialText: string;
  exact: boolean;
  onApply: (data: unknown) => Promise<void>;
  onCancel: () => void;
}): ReactElement {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const noteId = useId();

  const apply = () => {
    const parsed = parseEditedData(text);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    void onApply(parsed.data);
  };

  const describedBy = [error !== null && errorId, !exact && noteId].filter(Boolean).join(' ');

  return (
    <div
      className="editor"
      role="group"
      aria-label="Edit data"
      // On the group, so Escape also cancels from Apply or Cancel.
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      {!exact && (
        <p id={noteId} className="editor-note">
          Some values, such as dates or Maps, can’t be written as JSON exactly. Applying saves them
          as plain JSON.
        </p>
      )}
      <textarea
        className="editor-text"
        aria-label="Data as JSON"
        aria-invalid={error !== null || undefined}
        aria-describedby={describedBy || undefined}
        spellCheck={false}
        autoFocus
        rows={Math.min(Math.max(text.split('\n').length + 1, 4), 20)}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            apply();
          }
        }}
      />
      {error !== null && (
        <p id={errorId} className="editor-error" role="alert">
          {error}
        </p>
      )}
      <div className="detail-actions">
        <button type="button" onClick={apply}>
          Apply
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
