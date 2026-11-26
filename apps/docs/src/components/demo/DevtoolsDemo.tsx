import { DemoFrame } from './DemoFrame.tsx';
import { PostsRequest, Request } from './requests.tsx';

/** A bit of everything, for the live demo page. */
export function DevtoolsDemo() {
  return (
    <DemoFrame>
      <Request label="'/api/users/1'" swrKey="/api/users/1" />
      <PostsRequest />
      <Request label="'/api/slow'" swrKey="/api/slow" />
      <Request label="'/api/error'" swrKey="/api/error" />
    </DemoFrame>
  );
}
