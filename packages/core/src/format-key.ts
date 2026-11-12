const PREFIXES = ['$inf$', '$sub$'];

/**
 * Turns an SWR cache key into something readable for the panel.
 *
 * SWR stores string keys as they are, and serialises array and object keys
 * with its internal `stableHash`: `["/api/posts", 2]` becomes
 * `@"/api/posts",2,` and `{ url, q }` becomes `#url:"/api/search",q:"ap",`.
 * This reverses that format for display. Infinite and subscription prefixes
 * are dropped (the panel shows the kind separately). Anything that doesn't
 * parse completely is returned unchanged.
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
 *   token  = anything up to the next comma (numbers, booleans, null, dates…)
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
      const colon = this.input.indexOf(':', this.pos);
      if (colon === -1) return undefined;
      const name = this.input.slice(this.pos, colon);
      this.pos = colon + 1;
      const value = this.value();
      if (value === undefined || !this.consume(',')) return undefined;
      properties.push(`${name}: ${value}`);
    }
    // stableHash writes properties in reverse alphabetical order.
    properties.reverse();
    return properties.length ? `{ ${properties.join(', ')} }` : '{}';
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
    if (end === this.pos) return undefined;
    const text = this.input.slice(this.pos, end);
    this.pos = end;
    return text;
  }

  private consume(char: string): boolean {
    if (this.input[this.pos] !== char) return false;
    this.pos++;
    return true;
  }
}
