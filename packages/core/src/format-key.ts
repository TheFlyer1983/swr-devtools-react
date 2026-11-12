const PREFIXES = ['$inf$', '$sub$'];

/** Values `stableHash` writes without quotes that can be decoded for certain. */
const TOKENS = [
  String.raw`-?\d+(\.\d+)?(e[+-]\d+)?`, // numbers and bigints
  'NaN|-?Infinity',
  'true|false|null|undefined',
  String.raw`[+-]?\d{4,6}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z` // Date#toJSON
];
const TOKEN = new RegExp(`^(?:${TOKENS.join('|')})$`);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function formatName(name: string): string {
  return IDENTIFIER.test(name) ? name : JSON.stringify(name);
}

/**
 * Turns an SWR cache key into something readable for the panel.
 *
 * SWR stores string keys as they are, and serialises array and object keys
 * with its internal `stableHash`: `["/api/posts", 2]` becomes
 * `@"/api/posts",2,` and `{ url, q }` becomes `#url:"/api/search",q:"ap",`.
 * This reverses that format for display. Infinite and subscription prefixes
 * are dropped (the panel shows the kind separately).
 *
 * The format isn't designed to be parsed, so the decoder only accepts values
 * it can recognise for certain. A key containing anything else (a regex, a
 * symbol, a Map or class instance) is shown raw rather than guessed at.
 */
export function formatKey(key: string): string {
  const prefix = PREFIXES.find((p) => key.startsWith(p));
  const body = prefix ? key.slice(prefix.length) : key;
  if (!body.startsWith('@') && !body.startsWith('#')) return body;

  const parser = new Parser(body);
  const formatted = parser.value();
  return formatted !== undefined && parser.done() ? formatted : body;
}

/**
 * Recursive-descent parser for `stableHash` output. Each method returns the
 * formatted text, or `undefined` when the input doesn't match.
 *
 * Grammar (every item and property ends with a comma):
 *   value  = array | object | string | token
 *   array  = "@" (value ",")*
 *   object = "#" (name ":" value ",")*
 *   string = a JSON string
 *   token  = a number, boolean, null, undefined or ISO date, up to the next comma
 *
 * Property names aren't escaped and may contain ":", so `#x:y:1,` is tried
 * as name "x" (value "y:1", not a valid token) and then name "x:y" (value 1).
 */
class Parser {
  private pos = 0;

  constructor(private readonly input: string) {}

  done(): boolean {
    return this.pos === this.input.length;
  }

  value(): string | undefined {
    const char = this.input[this.pos];
    if (char === '@') return this.array();
    if (char === '#') return this.object();
    if (char === '"') return this.string();
    return this.token();
  }

  private array(): string | undefined {
    this.pos++;
    const items: string[] = [];
    // An item is never empty, so a comma or the end of input closes the array.
    while (!this.done() && this.input[this.pos] !== ',') {
      const item = this.value();
      if (item === undefined || !this.consume(',')) return undefined;
      items.push(item);
    }
    return `[${items.join(', ')}]`;
  }

  private object(): string | undefined {
    this.pos++;
    const properties: string[] = [];
    while (!this.done() && this.input[this.pos] !== ',') {
      const property = this.property();
      if (property === undefined) return undefined;
      properties.push(property);
    }
    // stableHash writes properties in reverse alphabetical order.
    properties.reverse();
    return properties.length ? `{ ${properties.join(', ')} }` : '{}';
  }

  /** One `name:value,`, trying each colon in turn as the separator. */
  private property(): string | undefined {
    const start = this.pos;
    let colon = this.input.indexOf(':', start);
    while (colon !== -1) {
      this.pos = colon + 1;
      const value = this.value();
      if (value !== undefined && this.consume(',')) {
        return `${formatName(this.input.slice(start, colon))}: ${value}`;
      }
      colon = this.input.indexOf(':', colon + 1);
    }
    this.pos = start;
    return undefined;
  }

  private string(): string | undefined {
    let end = this.pos + 1;
    while (end < this.input.length && this.input[end] !== '"') {
      end += this.input[end] === '\\' ? 2 : 1;
    }
    if (end >= this.input.length) return undefined;
    end++;
    const text = this.input.slice(this.pos, end);
    this.pos = end;
    return text;
  }

  private token(): string | undefined {
    const comma = this.input.indexOf(',', this.pos);
    const end = comma === -1 ? this.input.length : comma;
    const text = this.input.slice(this.pos, end);
    if (!TOKEN.test(text)) return undefined;
    this.pos = end;
    return text;
  }

  private consume(char: string): boolean {
    if (this.input[this.pos] !== char) return false;
    this.pos++;
    return true;
  }
}
