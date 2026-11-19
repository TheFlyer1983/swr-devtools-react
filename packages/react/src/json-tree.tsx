import { getChildren, inspectValue } from '@swr-devtools-react/core';
import { useState, type ReactElement } from 'react';

/** Containers this shallow start open: the root only. */
const OPEN_DEPTH = 1;

/**
 * The most children shown at one level. Bigger containers are split into
 * ranges, `[0 … 99]` and so on, nested as deep as needed, so expanding a
 * 100,000-item array renders a few rows rather than all of them.
 */
const PAGE_SIZE = 100;

export interface JsonTreeProps {
  value: unknown;
  /** Names the tree for screen readers, e.g. "Data". */
  label: string;
}

/**
 * A value as a collapsible tree. Only the root starts open, and a closed
 * node's children aren't read or rendered, so a large payload costs only as
 * much as is opened.
 */
export function JsonTree({ value, label }: JsonTreeProps): ReactElement {
  return (
    <ul className="json-tree" aria-label={label}>
      <JsonNode value={value} depth={0} ancestors={[]} />
    </ul>
  );
}

interface JsonNodeProps {
  /** The property name or index. The root has none. */
  name?: string;
  value: unknown;
  depth: number;
  /** The containers above this node, to spot circular references. */
  ancestors: readonly unknown[];
}

function JsonNode({ name, value, depth, ancestors }: JsonNodeProps): ReactElement {
  const [open, setOpen] = useState(depth < OPEN_DEPTH);
  const { kind, preview, size } = inspectValue(value);
  const label = name !== undefined && <span className="json-name">{name}</span>;

  if (ancestors.includes(value)) {
    return (
      <li className="json-row">
        {label}
        <span className="json-value" data-kind="circular">
          [Circular]
        </span>
      </li>
    );
  }

  if (size === undefined) {
    return (
      <li className="json-row">
        {label}
        <span className="json-value" data-kind={kind}>
          {preview}
        </span>
      </li>
    );
  }

  return (
    <li className="json-row">
      <button
        type="button"
        className="json-toggle"
        aria-expanded={open}
        disabled={size === 0}
        onClick={() => setOpen(!open)}
      >
        {label}
        <span className="json-value" data-kind={kind}>
          {preview}
        </span>
      </button>
      {open && size > 0 && (
        <ul className="json-children">
          <JsonRange
            value={value}
            start={0}
            end={size}
            depth={depth + 1}
            ancestors={[...ancestors, value]}
          />
        </ul>
      )}
    </li>
  );
}

interface JsonRangeProps {
  value: unknown;
  start: number;
  end: number;
  depth: number;
  ancestors: readonly unknown[];
}

/** The children of `value` from `start` to `end`, in ranges if there are too many. */
function JsonRange({ value, start, end, depth, ancestors }: JsonRangeProps): ReactElement {
  const count = end - start;

  if (count <= PAGE_SIZE) {
    return (
      <>
        {getChildren(value, start, end).map((child, i) => (
          // Map entries can share a name, so they're keyed by position.
          <JsonNode
            key={start + i}
            name={child.name}
            value={child.value}
            depth={depth}
            ancestors={ancestors}
          />
        ))}
      </>
    );
  }

  let step = PAGE_SIZE;
  while (count / step > PAGE_SIZE) step *= PAGE_SIZE;
  const ranges: number[] = [];
  for (let from = start; from < end; from += step) ranges.push(from);

  return (
    <>
      {ranges.map((from) => (
        <JsonRangeNode
          key={from}
          value={value}
          start={from}
          end={Math.min(from + step, end)}
          depth={depth}
          ancestors={ancestors}
        />
      ))}
    </>
  );
}

function JsonRangeNode(props: JsonRangeProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <li className="json-row">
      <button
        type="button"
        className="json-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="json-range">
          [{props.start} … {props.end - 1}]
        </span>
      </button>
      {open && (
        <ul className="json-children">
          <JsonRange {...props} />
        </ul>
      )}
    </li>
  );
}
