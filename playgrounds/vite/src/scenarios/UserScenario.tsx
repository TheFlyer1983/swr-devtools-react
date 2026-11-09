import useSWR from 'swr';
import { Card } from './Card.tsx';

interface User {
  id: number;
  name: string;
  role: string;
}

export function UserScenario() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<User>('/api/user');
  return (
    <Card
      title="Fast success"
      swrKey="'/api/user'"
      isLoading={isLoading}
      isValidating={isValidating}
      error={error}
      actions={<button onClick={() => mutate()}>Revalidate</button>}
    >
      {data ? (
        <p>
          {data.name} ({data.role})
        </p>
      ) : null}
    </Card>
  );
}
