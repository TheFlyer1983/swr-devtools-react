import useSWR from 'swr';
import type { User } from '../fixtures/index.ts';
import { Card } from './Card.tsx';

export function UserScenario() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<User>('/api/users/1');
  return (
    <Card
      title="Fast success"
      swrKey="'/api/users/1'"
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={<button onClick={() => mutate()}>Revalidate</button>}
    >
      {data ? (
        <p>
          {data.name} ({data.role}), {data.company.name}
        </p>
      ) : null}
    </Card>
  );
}
