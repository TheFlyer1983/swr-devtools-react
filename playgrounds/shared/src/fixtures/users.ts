import { createRandom, DAY_MS, FIXTURE_EPOCH, type Random } from './random.ts';

export interface Geo {
  lat: string;
  lng: string;
}

export interface Address {
  street: string;
  suite: string | null;
  city: string;
  zipcode: string;
  geo: Geo;
}

export interface Company {
  name: string;
  catchPhrase: string;
  bs: string;
}

export interface Widget {
  id: string;
  type: 'posts' | 'todos' | 'activity' | 'chart';
  position: { row: number; column: number };
  options: {
    title: string;
    limit: number | null;
    filters: { tags: string[]; completed: boolean | null };
  };
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  locale: string;
  notifications: {
    email: {
      enabled: boolean;
      digest: {
        frequency: 'daily' | 'weekly' | 'never';
        sendAt: { hour: number; timezone: string };
      };
      topics: string[];
    };
    push: { enabled: boolean; quietHours: { start: string; end: string } | null };
  };
  dashboard: { layout: 'grid' | 'list'; widgets: Widget[] };
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  website: string | null;
  role: 'admin' | 'editor' | 'viewer';
  address: Address;
  company: Company;
  bio: string;
  avatarUrl: string | null;
  tags: string[];
  createdAt: string;
  lastSeenAt: string | null;
  preferences: Preferences;
}

type UserBase = Omit<User, 'bio' | 'createdAt' | 'lastSeenAt' | 'preferences'> & {
  timezone: string;
};

const TOPICS = ['mentions', 'replies', 'releases', 'security', 'digest', 'billing'];
const WIDGET_TYPES: Widget['type'][] = ['posts', 'todos', 'activity', 'chart'];

const bases: UserBase[] = [
  {
    id: 1,
    name: 'Ada Lovelace',
    username: 'ada',
    email: 'ada@analytical.example',
    phone: '+44 20 7946 0101',
    website: 'analytical.example',
    role: 'admin',
    address: {
      street: 'St James Square',
      suite: 'No. 12',
      city: 'London',
      zipcode: 'SW1Y 4JH',
      geo: { lat: '51.5074', lng: '-0.1345' }
    },
    company: {
      name: 'Analytical Engines',
      catchPhrase: 'Weaving algebraic patterns',
      bs: 'compute general-purpose results'
    },
    avatarUrl: 'https://avatars.example/ada.png',
    tags: ['mathematics', 'poetry', 'engines'],
    timezone: 'Europe/London'
  },
  {
    id: 2,
    name: 'Grace Hopper',
    username: 'amazing.grace',
    email: 'grace@compilers.example',
    phone: '+1 202 555 0102',
    website: 'compilers.example',
    role: 'editor',
    address: {
      street: 'Navy Yard Road',
      suite: 'Building 7',
      city: 'Arlington',
      zipcode: '22202',
      geo: { lat: '38.8700', lng: '-77.0560' }
    },
    company: {
      name: 'Compiler Works',
      catchPhrase: 'It is easier to ask forgiveness',
      bs: 'translate business English into code'
    },
    avatarUrl: null,
    tags: ['compilers', 'cobol'],
    timezone: 'America/New_York'
  },
  {
    id: 3,
    name: 'Alan Turing',
    username: 'aturing',
    email: 'alan@bletchley.example',
    phone: null,
    website: 'bletchley.example',
    role: 'viewer',
    address: {
      street: 'Sherwood Drive',
      suite: null,
      city: 'Bletchley',
      zipcode: 'MK3 6EB',
      geo: { lat: '51.9977', lng: '-0.7407' }
    },
    company: {
      name: 'Bombe Ltd',
      catchPhrase: 'Machines that think',
      bs: 'decode intercepted signals'
    },
    avatarUrl: 'https://avatars.example/alan.png',
    tags: [],
    timezone: 'Europe/London'
  },
  {
    id: 4,
    name: 'Katherine Johnson',
    username: 'kjohnson',
    email: 'katherine@orbits.example',
    phone: '+1 757 555 0104',
    website: null,
    role: 'editor',
    address: {
      street: 'Langley Boulevard',
      suite: 'Suite 400',
      city: 'Hampton',
      zipcode: '23681',
      geo: { lat: '37.0871', lng: '-76.3772' }
    },
    company: {
      name: 'Trajectory Partners',
      catchPhrase: 'Check the numbers by hand',
      bs: 'compute orbital re-entry windows'
    },
    avatarUrl: null,
    tags: ['orbits', 'geometry'],
    timezone: 'America/New_York'
  },
  {
    id: 5,
    name: 'Edsger Dijkstra',
    username: 'ewd',
    email: 'edsger@shortest.example',
    phone: '+31 20 555 0105',
    website: 'shortest.example',
    role: 'viewer',
    address: {
      street: 'Plantage Muidergracht',
      suite: '24',
      city: 'Amsterdam',
      zipcode: '1018 TV',
      geo: { lat: '52.3637', lng: '4.9123' }
    },
    company: {
      name: 'Shortest Path BV',
      catchPhrase: 'Simplicity is prerequisite for reliability',
      bs: 'eliminate harmful statements'
    },
    avatarUrl: 'https://avatars.example/edsger.png',
    tags: ['graphs', 'semaphores', 'structured-programming'],
    timezone: 'Europe/Amsterdam'
  },
  {
    id: 6,
    name: 'Hedy Lamarr',
    username: 'hedy',
    email: 'hedy@frequency.example',
    phone: '+1 310 555 0106',
    website: 'frequency.example',
    role: 'viewer',
    address: {
      street: 'Sunset Boulevard',
      suite: 'Apt 9',
      city: 'Los Angeles',
      zipcode: '90028',
      geo: { lat: '34.0983', lng: '-118.3267' }
    },
    company: {
      name: 'Frequency Hop Inc',
      catchPhrase: 'Signals that cannot be jammed',
      bs: 'spread spectrum across channels'
    },
    avatarUrl: null,
    tags: ['radio'],
    timezone: 'America/Los_Angeles'
  },
  {
    id: 7,
    name: 'Claude Shannon',
    username: 'cshannon',
    email: 'claude@entropy.example',
    phone: null,
    website: null,
    role: 'editor',
    address: {
      street: 'Mountain Avenue',
      suite: null,
      city: 'Murray Hill',
      zipcode: '07974',
      geo: { lat: '40.6840', lng: '-74.4012' }
    },
    company: {
      name: 'Entropy Labs',
      catchPhrase: 'Information is the resolution of uncertainty',
      bs: 'compress messages to their limit'
    },
    avatarUrl: 'https://avatars.example/claude.png',
    tags: ['information-theory', 'juggling'],
    timezone: 'America/New_York'
  },
  {
    id: 8,
    name: 'Dorothy Vaughan',
    username: 'dvaughan',
    email: 'dorothy@fortran.example',
    phone: '+1 757 555 0108',
    website: 'fortran.example',
    role: 'admin',
    address: {
      street: 'West Area Road',
      suite: 'Room 1236',
      city: 'Hampton',
      zipcode: '23666',
      geo: { lat: '37.0299', lng: '-76.3452' }
    },
    company: {
      name: 'West Computing',
      catchPhrase: 'Learn the machine before it arrives',
      bs: 'teach teams new languages'
    },
    avatarUrl: null,
    tags: ['fortran', 'leadership'],
    timezone: 'America/New_York'
  },
  {
    id: 9,
    name: 'Charles Babbage',
    username: 'babbage',
    email: 'charles@difference.example',
    phone: '+44 20 7946 0109',
    website: 'difference.example',
    role: 'viewer',
    address: {
      street: 'Dorset Street',
      suite: '1',
      city: 'London',
      zipcode: 'W1U 4EG',
      geo: { lat: '51.5203', lng: '-0.1566' }
    },
    company: {
      name: 'Difference Engines',
      catchPhrase: 'Errors using inadequate data are much less',
      bs: 'tabulate polynomial functions'
    },
    avatarUrl: 'https://avatars.example/charles.png',
    tags: [],
    timezone: 'Europe/London'
  },
  {
    id: 10,
    name: 'John von Neumann',
    username: 'johnny',
    email: 'john@stored-program.example',
    phone: '+1 609 555 0110',
    website: 'stored-program.example',
    role: 'editor',
    address: {
      street: 'Olden Lane',
      suite: null,
      city: 'Princeton',
      zipcode: '08540',
      geo: { lat: '40.3311', lng: '-74.6672' }
    },
    company: {
      name: 'Stored Program Co',
      catchPhrase: 'Keep instructions with the data',
      bs: 'architect general-purpose machines'
    },
    avatarUrl: null,
    tags: ['game-theory', 'architecture', 'automata'],
    timezone: 'America/New_York'
  }
];

function widgetsFor(userId: number, count: number, random: Random): Widget[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `u${userId}-w${i + 1}`,
    type: random.pick(WIDGET_TYPES),
    position: { row: Math.floor(i / 2), column: i % 2 },
    options: {
      title: random.sentence(2, 4).slice(0, -1),
      limit: random.bool(0.3) ? null : random.int(3, 20),
      filters: {
        tags: random.some(['news', 'drafts', 'urgent', 'later', 'pinned'], 3),
        completed: random.pick([true, false, null])
      }
    }
  }));
}

function preferencesFor(base: UserBase, random: Random): Preferences {
  const emailEnabled = random.bool(0.7);
  return {
    theme: random.pick(['light', 'dark', 'system'] as const),
    locale: base.timezone.startsWith('Europe') ? 'en-GB' : 'en-US',
    notifications: {
      email: {
        enabled: emailEnabled,
        digest: {
          frequency: emailEnabled ? random.pick(['daily', 'weekly'] as const) : 'never',
          sendAt: { hour: random.int(6, 10), timezone: base.timezone }
        },
        topics: emailEnabled ? random.some(TOPICS, 4) : []
      },
      push: {
        enabled: random.bool(),
        quietHours: random.bool() ? { start: '22:00', end: '07:00' } : null
      }
    },
    // User 1 gets a full dashboard, so the detail view has a large object to show.
    dashboard: {
      layout: random.pick(['grid', 'list'] as const),
      widgets: widgetsFor(base.id, base.id === 1 ? 8 : random.int(0, 3), random)
    }
  };
}

function createUsers(): User[] {
  const random = createRandom(68_001);
  return bases.map((base) => {
    const { timezone: _timezone, ...fields } = base;
    return {
      ...fields,
      // One long bio, for how the panel handles long strings.
      bio: base.id === 1 ? random.paragraph(12, 16) : random.paragraph(1, 2),
      createdAt: random.dateBefore(1500),
      lastSeenAt: random.bool(0.2)
        ? null
        : new Date(FIXTURE_EPOCH - random.int(1, 30) * DAY_MS).toISOString(),
      preferences: preferencesFor(base, random)
    };
  });
}

export const users: readonly User[] = createUsers();
