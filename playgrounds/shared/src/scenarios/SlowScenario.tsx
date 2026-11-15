import useSWR from 'swr';
import { Card } from './Card.tsx';

interface SlowResponse {
  message: string;
  servedAt: string;
}

export function SlowScenario() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<SlowResponse>('/api/slow');
  return (
    <Card
      title="Slow success (2s)"
      swrKey="'/api/slow'"
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={<button onClick={() => mutate()}>Revalidate</button>}
    >
      {data ? (
        <p>
          {data.message} at {new Date(data.servedAt).toLocaleTimeString()}
        </p>
      ) : null}
    </Card>
  );
}
