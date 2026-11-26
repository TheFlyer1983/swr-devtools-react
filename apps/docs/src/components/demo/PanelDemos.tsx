import type { Todo, User } from '@swr-devtools-react/playground-shared/fixtures';
import { DemoFrame } from './DemoFrame.tsx';
import { PostsRequest, Request } from './requests.tsx';

/** A large nested object, plus a slow and a failing request for the statuses. */
export function InspectingDataDemo() {
  return (
    <DemoFrame>
      <Request label="'/api/users/1'" swrKey="/api/users/1" />
      <Request label="'/api/slow'" swrKey="/api/slow" />
      <Request label="'/api/error'" swrKey="/api/error" />
    </DemoFrame>
  );
}

/** Keys that sort differently by key, status and time, and a pager that adds more. */
export function SearchAndSortDemo() {
  return (
    <DemoFrame>
      <Request label="'/api/posts/2'" swrKey="/api/posts/2" />
      <Request label="'/api/posts/10'" swrKey="/api/posts/10" />
      <PostsRequest />
      <Request label="'/api/slow'" swrKey="/api/slow" />
      <Request label="'/api/error'" swrKey="/api/error" />
    </DemoFrame>
  );
}

/** One todo, rendered by the app, so edits in the panel show up straight away. */
export function EditingDemo() {
  return (
    <DemoFrame>
      <Request<Todo> label="'/api/todos/1'" swrKey="/api/todos/1" revalidateButton={false}>
        {(todo) => (
          <label>
            <input type="checkbox" checked={todo.completed} readOnly /> {todo.title}
          </label>
        )}
      </Request>
    </DemoFrame>
  );
}

/** Data the app renders, so revalidating and deleting from the panel are visible. */
export function RevalidatingDemo() {
  return (
    <DemoFrame>
      <Request<{ servedAt: string }>
        label="'/api/slow'"
        swrKey="/api/slow"
        revalidateButton={false}
      >
        {({ servedAt }) => `Served at ${new Date(servedAt).toLocaleTimeString()}`}
      </Request>
      <Request<User> label="'/api/users/2'" swrKey="/api/users/2" revalidateButton={false}>
        {(user) => user.name}
      </Request>
    </DemoFrame>
  );
}
