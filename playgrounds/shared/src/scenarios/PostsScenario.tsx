import { useState } from 'react';
import useSWR from 'swr';
import type { Post } from '../fixtures/index.ts';
import { Card } from './Card.tsx';

interface PostsPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  posts: Post[];
}

export function PostsScenario() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isValidating } = useSWR<PostsPage>(['/api/posts', page] as const);
  // Until the current page loads, its totalPages is unknown, so Next waits for it.
  const canGoNext = data !== undefined && page < data.totalPages;
  return (
    <Card
      title="Array key (pagination)"
      swrKey={`['/api/posts', ${page}]`}
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={
        <>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page}
            {data ? ` of ${data.totalPages}` : null}
          </span>
          <button disabled={!canGoNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </>
      }
    >
      <ul>
        {data?.posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </Card>
  );
}
