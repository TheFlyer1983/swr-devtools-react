import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SWRDevtools } from './swr-devtools.tsx';

describe('<SWRDevtools />', () => {
  it('renders', () => {
    render(<SWRDevtools />);
    expect(screen.getByText('SWR Devtools')).toBeInTheDocument();
  });
});
