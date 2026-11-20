/** A key's data as editable JSON text, or why it can't be edited. */
export type EditableData =
  | {
      editable: true;
      /** Pretty-printed JSON. Empty when the key has no data. */
      text: string;
      /**
       * False when JSON can't hold the data exactly, for example a Date
       * (becomes a string), a Map (becomes `{}`) or an `undefined` property
       * (dropped). Applying the text then changes those values.
       */
      exact: boolean;
    }
  | { editable: false; reason: string };

/** The result of reading the edited text back. */
export type ParsedData = { ok: true; data: unknown } | { ok: false; message: string };

const NOT_JSON: EditableData = {
  editable: false,
  reason: 'This data can’t be written as JSON, so it can’t be edited.'
};

/** Formats a key's data for the JSON editor. */
export function toEditableData(data: unknown): EditableData {
  if (data === undefined) return { editable: true, text: '', exact: true };
  let text: string | undefined;
  try {
    text = JSON.stringify(data, null, 2);
  } catch {
    // A circular reference or a BigInt.
    return NOT_JSON;
  }
  if (text === undefined) {
    // A function or symbol at the top level.
    return NOT_JSON;
  }
  return { editable: true, text, exact: isExactJson(data) };
}

/** Reads the edited text. Invalid JSON gives a message to show the user. */
export function parseEditedData(text: string): ParsedData {
  if (text.trim() === '') return { ok: false, message: 'Enter a JSON value, such as null.' };
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Invalid JSON: ${detail}` };
  }
}

/** Whether `JSON.parse(JSON.stringify(value))` gives back an equal value. */
function isExactJson(value: unknown): boolean {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true;
    case 'number':
      // NaN and Infinity become null.
      return Number.isFinite(value);
    case 'object': {
      if (value === null) return true;
      if (Array.isArray(value)) {
        // Holes become null; a sparse array isn't worth telling apart.
        return value.every((item) => isExactJson(item));
      }
      const proto: unknown = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) return false;
      return Object.values(value).every((item) => isExactJson(item));
    }
    default:
      // undefined, functions and symbols are dropped or become null.
      return false;
  }
}
