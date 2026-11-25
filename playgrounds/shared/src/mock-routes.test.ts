import { describe, expect, it, vi } from 'vitest';
import { comments, posts, todos, users } from './fixtures/index.ts';
import { resolveMock, type MockResponse } from './mock-routes.ts';

function get(path: string): MockResponse {
  const mock = resolveMock(new URL(path, 'http://localhost'));
  if (!mock) throw new Error(`No mock for ${path}`);
  return mock;
}

// oxlint-disable-next-line typescript/no-explicit-any -- test bodies are checked field by field
function body(path: string): any {
  return get(path).body;
}

describe('fixtures', () => {
  it('have JSONPlaceholder-like sizes', () => {
    expect(users).toHaveLength(10);
    expect(posts).toHaveLength(100);
    expect(comments.length).toBeGreaterThan(posts.length * 2);
    expect(todos).toHaveLength(200);
  });

  it('are identical on every run', async () => {
    const before = JSON.stringify({ users, posts, comments, todos });
    // A fresh module instance regenerates the data from the same seeds.
    vi.resetModules();
    const fresh = await import('./fixtures/index.ts');
    expect(
      JSON.stringify({
        users: fresh.users,
        posts: fresh.posts,
        comments: fresh.comments,
        todos: fresh.todos
      })
    ).toBe(before);
  });

  it('have nulls, empty arrays and ISO dates for the panel to show', () => {
    expect(users.some((user) => user.avatarUrl === null)).toBe(true);
    expect(users.some((user) => user.tags.length === 0)).toBe(true);
    expect(posts.some((post) => post.updatedAt === null)).toBe(true);
    expect(todos.some((todo) => todo.completed) && todos.some((todo) => !todo.completed)).toBe(
      true
    );
    expect(new Date(posts[0]!.publishedAt).toISOString()).toBe(posts[0]!.publishedAt);
  });
});

describe('resolveMock', () => {
  it('serves user 1 as a large, deeply nested object', () => {
    const user = body('/api/users/1');
    expect(user).toMatchObject({ id: 1, name: 'Ada Lovelace', address: { geo: {} } });
    expect(user.preferences.dashboard.widgets.length).toBeGreaterThanOrEqual(8);
    expect(user.preferences.notifications.email.digest.sendAt.timezone).toBe('Europe/London');
  });

  it('answers 404 for a missing resource', () => {
    expect(get('/api/users/99').status).toBe(404);
    expect(get('/api/posts/999/comments').status).toBe(404);
  });

  it('pages posts with a total', () => {
    expect(body('/api/posts?page=2')).toMatchObject({ page: 2, total: 100, totalPages: 20 });
    expect(body('/api/posts?page=2').posts.map((p: { id: number }) => p.id)).toEqual([
      6, 7, 8, 9, 10
    ]);
    expect(body('/api/posts?page=21').posts).toEqual([]);
    expect(body('/api/posts?page=nope').page).toBe(1);
  });

  it('serves a post and its comments', () => {
    expect(body('/api/posts/3')).toMatchObject({ id: 3, userId: 1 });
    const postComments = body('/api/posts/3/comments');
    expect(postComments.every((c: { postId: number }) => c.postId === 3)).toBe(true);
  });

  it('filters todos', () => {
    const open = body('/api/todos?userId=2&completed=false');
    expect(open.length).toBeGreaterThan(0);
    expect(
      open.every((t: { userId: number; completed: boolean }) => t.userId === 2 && !t.completed)
    ).toBe(true);
  });

  it('searches users and posts', () => {
    const result = body('/api/search?q=LOVELACE');
    expect(result.users).toEqual([{ id: 1, name: 'Ada Lovelace', username: 'ada' }]);
    expect(body('/api/search?q=an').total.posts).toBeGreaterThan(5);
    expect(body('/api/search?q=an').posts).toHaveLength(5);
  });

  it('pages the feed, newest first, until it runs out', () => {
    const first = body('/api/feed?page=1');
    expect(first.items[0]).toMatchObject({ id: 100, author: { id: 10 } });
    expect(first.hasMore).toBe(true);
    expect(body('/api/feed?page=4').hasMore).toBe(false);
    expect(body('/api/feed?page=5').items).toEqual([]);
  });

  it('keeps the error and slow scenarios', () => {
    expect(get('/api/error').status).toBe(500);
    expect(get('/api/slow').delay).toBe(2000);
  });

  it('answers 404 for unknown API paths and leaves other paths alone', () => {
    expect(get('/api/nothing').status).toBe(404);
    expect(resolveMock(new URL('http://localhost/index.html'))).toBeUndefined();
  });
});
