import useSWRSubscription from 'swr/subscription';
import type { SWRSubscriptionOptions } from 'swr/subscription';
import { Card } from './Card.tsx';

/** Pushes a new value every second, like a WebSocket would. */
function subscribe(_key: string, { next }: SWRSubscriptionOptions<number, Error>) {
  let count = 0;
  const id = setInterval(() => {
    count += 1;
    next(null, count);
  }, 1000);
  return () => clearInterval(id);
}

export function TickerScenario() {
  const { data, error } = useSWRSubscription('ticker', subscribe);
  return (
    <Card title="useSWRSubscription (ticker)" swrKey="$sub$ + 'ticker'" error={error}>
      <p>Tick {data ?? '…'}</p>
    </Card>
  );
}
