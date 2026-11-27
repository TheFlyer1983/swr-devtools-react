import { useState } from 'react';
import useSWR from 'swr';
import { Card } from './Card.tsx';

interface SearchResponse {
  q: string;
  total: { users: number; posts: number };
  users: { id: number; name: string; username: string }[];
  posts: { id: number; userId: number; title: string }[];
}

export function SearchScenario() {
  const [q, setQ] = useState('an');
  const { data, error, isLoading, isValidating } = useSWR<SearchResponse>({
    url: '/api/search',
    q
  });
  return (
    <Card
      title="Object key (search)"
      swrKey={`{ url: '/api/search', q: '${q}' }`}
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={
        <input
          aria-label="Search users and posts"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search users and posts"
        />
      }
    >
      {data ? (
        <>
          <p>
            {data.total.users} user(s): {data.users.map((user) => user.name).join(', ') || 'none'}
          </p>
          <p>{data.total.posts} post(s)</p>
          <ul>
            {data.posts.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
