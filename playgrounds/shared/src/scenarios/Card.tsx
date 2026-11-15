import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  swrKey: string;
  isLoading?: boolean;
  isValidating?: boolean;
  error?: unknown;
  children?: ReactNode;
  actions?: ReactNode;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function Card({
  title,
  swrKey,
  isLoading,
  isValidating,
  error,
  children,
  actions
}: CardProps) {
  const status = error ? 'error' : isLoading ? 'loading' : isValidating ? 'validating' : 'success';
  return (
    <section className="card">
      <header className="card__header">
        <h3>{title}</h3>
        <span className={`badge badge--${status}`}>{status}</span>
      </header>
      <code className="card__key">{swrKey}</code>
      <div className="card__body">
        {error ? <p className="card__error">{describeError(error)}</p> : children}
      </div>
      {actions ? <footer className="card__actions">{actions}</footer> : null}
    </section>
  );
}
