import useSWRInfinite from 'swr/infinite';
import { Card } from './Card.tsx';

interface FeedPage {
  page: number;
  items: { id: number; text: string }[];
  hasMore: boolean;
}

export function FeedScenario() {
  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite<FeedPage>(
    (index, previous: FeedPage | null) =>
      previous && !previous.hasMore ? null : `/api/feed?page=${index + 1}`
  );
  const items = data?.flatMap((page) => page.items) ?? [];
  const hasMore = data?.at(-1)?.hasMore ?? true;
  // A requested page hasn't arrived yet. Background revalidation (e.g. on
  // window focus) doesn't count, so it never blocks "Load more".
  const isLoadingMore = size > (data?.length ?? 0);
  return (
    <Card
      title="useSWRInfinite (feed)"
      swrKey="$inf$ + '/api/feed?page=1'"
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={
        <button disabled={!hasMore || isLoadingMore} onClick={() => setSize(size + 1)}>
          {!hasMore ? 'No more pages' : isLoadingMore ? 'Loading…' : `Load page ${size + 1}`}
        </button>
      }
    >
      <p>
        {items.length} items loaded across {data?.length ?? 0} page(s)
      </p>
    </Card>
  );
}
