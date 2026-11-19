import { useState } from 'react';
import useSWR from 'swr';
import { Card } from './Card.tsx';

interface PostsPage {
  page: number;
  posts: { id: number; title: string }[];
}

export function PostsScenario() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isValidating } = useSWR<PostsPage>(['/api/posts', page] as const);
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
          <span>Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)}>Next</button>
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
