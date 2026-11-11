import { useState } from 'react';
import useSWR from 'swr';
import { Card } from './Card.tsx';

interface SearchResponse {
  q: string;
  results: string[];
}

export function SearchScenario() {
  const [q, setQ] = useState('ap');
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
          aria-label="Search fruit"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search fruit"
        />
      }
    >
      <p>{data ? data.results.join(', ') || 'No matches' : null}</p>
    </Card>
  );
}
