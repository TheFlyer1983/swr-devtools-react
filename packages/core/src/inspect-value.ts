/** What kind of value a JSON tree node holds. */
export type ValueKind =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'symbol'
  | 'function'
  | 'date'
  | 'error'
  | 'array'
  | 'map'
  | 'set'
  | 'object';

/** A value as one line of a JSON tree. */
export interface InspectedValue {
  kind: ValueKind;
  /** The value itself for a leaf, or a summary such as `Array(3)` for a container. */
  preview: string;
  /** How many children a container has. Leaves have none. */
  size?: number;
}

/** One child of a container: an object property, array item or map entry. */
export interface ValueChild {
  name: string;
  value: unknown;
}

/**
 * Describes a value for one line of a JSON tree, without walking into it.
 * Containers report their size; read their children with `getChildren`, a
 * slice at a time, so a large payload is only read as far as it's opened.
 *
 * SWR data isn't always JSON: dates, maps, sets, errors and class instances
 * are shown for what they are, not as `{}`.
 */
export function inspectValue(value: unknown): InspectedValue {
  switch (typeof value) {
    case 'string':
      return { kind: 'string', preview: JSON.stringify(value) };
    case 'number':
      return { kind: 'number', preview: String(value) };
    case 'bigint':
      return { kind: 'bigint', preview: `${value}n` };
    case 'boolean':
      return { kind: 'boolean', preview: String(value) };
    case 'undefined':
      return { kind: 'undefined', preview: 'undefined' };
    case 'symbol':
      return { kind: 'symbol', preview: value.toString() };
    case 'function':
      return { kind: 'function', preview: `ƒ ${value.name || 'anonymous'}()` };
  }
  // Every other typeof is handled above, but TypeScript doesn't narrow on it.
  if (typeof value !== 'object' || value === null) return { kind: 'null', preview: 'null' };
  if (value instanceof Date) {
    return {
      kind: 'date',
      preview: Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString()
    };
  }
  if (value instanceof Error) {
    return {
      kind: 'error',
      preview: `${value.name}: ${value.message}`,
      size: errorFields(value).length
    };
  }
  if (Array.isArray(value))
    return { kind: 'array', preview: `Array(${value.length})`, size: value.length };
  if (value instanceof Map) return { kind: 'map', preview: `Map(${value.size})`, size: value.size };
  if (value instanceof Set) return { kind: 'set', preview: `Set(${value.size})`, size: value.size };

  const size = Object.keys(value).length;
  return { kind: 'object', preview: `${constructorName(value)}(${size})`, size };
}

/**
 * Reads the children of a container from `start` up to, not including,
 * `end`. Leaves have no children.
 */
export function getChildren(
  value: unknown,
  start: number = 0,
  end: number = Infinity
): ValueChild[] {
  if (typeof value !== 'object' || value === null || value instanceof Date) return [];

  if (Array.isArray(value)) {
    return value.slice(start, end).map((item, i) => ({ name: String(start + i), value: item }));
  }
  if (value instanceof Map) {
    return [...value].slice(start, end).map(([key, item]) => ({
      name: inspectValue(key).preview,
      value: item
    }));
  }
  if (value instanceof Set) {
    return [...value]
      .slice(start, end)
      .map((item, i) => ({ name: String(start + i), value: item }));
  }
  if (value instanceof Error) return errorFields(value).slice(start, end);

  return Object.entries(value)
    .slice(start, end)
    .map(([name, item]: [string, unknown]) => ({ name, value: item }));
}

/**
 * An error's message, then its own fields: a fetcher often adds the HTTP
 * status or response body (SWR's docs use `error.info` and `error.status`).
 * The stack is left out; it points into the fetcher, not the data.
 */
function errorFields(error: Error): ValueChild[] {
  const fields: ValueChild[] = [{ name: 'message', value: error.message }];
  for (const [name, value] of Object.entries(error) as [string, unknown][]) {
    if (name !== 'message') fields.push({ name, value });
  }
  if (error.cause !== undefined && !Object.keys(error).includes('cause')) {
    fields.push({ name: 'cause', value: error.cause });
  }
  return fields;
}

function constructorName(value: object): string {
  const proto = Reflect.getPrototypeOf(value);
  if (proto === null || proto === Object.prototype) return 'Object';
  // A prototype can lack a constructor, e.g. Object.create(Object.create(null)).
  const name: unknown = Reflect.get(proto, 'constructor')?.name;
  return typeof name === 'string' && name !== '' ? name : 'Object';
}
