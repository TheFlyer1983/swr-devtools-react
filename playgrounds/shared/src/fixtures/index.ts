/**
 * Demo data for the mock API, shaped like JSONPlaceholder's resources
 * (https://jsonplaceholder.typicode.com) but written or generated here with a
 * fixed seed, so it's identical on every run. It also has what a realistic API
 * might not: ISO dates, nulls, empty arrays, long strings and one large,
 * deeply nested object (user 1's preferences).
 */
export { comments, posts, type Comment, type Post } from './posts.ts';
export { todos, type Todo } from './todos.ts';
export {
  users,
  type Address,
  type Company,
  type Geo,
  type Preferences,
  type User,
  type Widget
} from './users.ts';
