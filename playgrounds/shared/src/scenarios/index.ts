import type { ComponentType } from 'react';
import { ErrorScenario } from './ErrorScenario.tsx';
import { FeedScenario } from './FeedScenario.tsx';
import { PostsScenario } from './PostsScenario.tsx';
import { SearchScenario } from './SearchScenario.tsx';
import { SlowScenario } from './SlowScenario.tsx';
import { TickerScenario } from './TickerScenario.tsx';
import { UserScenario } from './UserScenario.tsx';

export interface Scenario {
  id: string;
  label: string;
  Component: ComponentType;
}

export const scenarios: Scenario[] = [
  { id: 'user', label: 'Fast success', Component: UserScenario },
  { id: 'slow', label: 'Slow success', Component: SlowScenario },
  { id: 'error', label: 'Error', Component: ErrorScenario },
  { id: 'posts', label: 'Array key', Component: PostsScenario },
  { id: 'search', label: 'Object key', Component: SearchScenario },
  { id: 'feed', label: 'useSWRInfinite', Component: FeedScenario },
  { id: 'ticker', label: 'useSWRSubscription', Component: TickerScenario }
];
