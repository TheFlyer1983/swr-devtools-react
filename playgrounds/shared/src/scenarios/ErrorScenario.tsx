import useSWR from 'swr';
import { Card } from './Card.tsx';

export function ErrorScenario() {
  const { error, isLoading, isValidating, mutate } = useSWR('/api/error', {
    shouldRetryOnError: false
  });
  return (
    <Card
      title="Error (500)"
      swrKey="'/api/error'"
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={<button onClick={() => mutate()}>Retry</button>}
    />
  );
}
