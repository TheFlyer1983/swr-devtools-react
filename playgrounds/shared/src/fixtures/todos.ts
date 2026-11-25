import { createRandom, DAY_MS, FIXTURE_EPOCH } from './random.ts';

export interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
  dueDate: string | null;
}

const USER_COUNT = 10;
const TODOS_PER_USER = 20;

function createTodos(): Todo[] {
  const random = createRandom(68_004);
  return Array.from({ length: USER_COUNT * TODOS_PER_USER }, (_, i) => ({
    userId: Math.floor(i / TODOS_PER_USER) + 1,
    id: i + 1,
    title: random.words(2, 6),
    completed: random.bool(0.45),
    dueDate: random.bool(0.4)
      ? null
      : new Date(FIXTURE_EPOCH + random.int(-30, 60) * DAY_MS).toISOString()
  }));
}

export const todos: readonly Todo[] = createTodos();
