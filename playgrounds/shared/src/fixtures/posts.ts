import { createRandom, DAY_MS, FIXTURE_EPOCH, HOUR_MS } from './random.ts';

export interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string | null;
}

export interface Comment {
  postId: number;
  id: number;
  name: string;
  email: string;
  body: string;
  createdAt: string;
}

const POST_COUNT = 100;
const POSTS_PER_USER = 10;
const TAGS = ['news', 'guide', 'release', 'opinion', 'question', 'showcase', 'meta'];

function createPosts(): Post[] {
  const random = createRandom(68_002);
  return Array.from({ length: POST_COUNT }, (_, i) => {
    const id = i + 1;
    // Higher ids are newer, one post roughly every three days.
    const published = FIXTURE_EPOCH - (POST_COUNT - id) * 3 * DAY_MS - random.int(0, 48) * HOUR_MS;
    return {
      userId: Math.ceil(id / POSTS_PER_USER),
      id,
      title: random.sentence(3, 8).slice(0, -1),
      body: random.paragraph(2, 6),
      tags: random.some(TAGS, 3),
      publishedAt: new Date(published).toISOString(),
      updatedAt: random.bool(0.3)
        ? new Date(published + random.int(1, 72) * HOUR_MS).toISOString()
        : null
    };
  });
}

function createComments(forPosts: readonly Post[]): Comment[] {
  const random = createRandom(68_003);
  const result: Comment[] = [];
  for (const post of forPosts) {
    const count = random.int(0, 7);
    for (let n = 0; n < count; n++) {
      const author = random.person();
      result.push({
        postId: post.id,
        id: result.length + 1,
        name: random.sentence(2, 5).slice(0, -1),
        email: author.email,
        body: random.paragraph(1, 3),
        createdAt: new Date(
          Date.parse(post.publishedAt) + random.int(1, 240) * HOUR_MS
        ).toISOString()
      });
    }
  }
  return result;
}

export const posts: readonly Post[] = createPosts();
export const comments: readonly Comment[] = createComments(posts);
