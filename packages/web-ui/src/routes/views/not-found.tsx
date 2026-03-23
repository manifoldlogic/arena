import { Link } from 'react-router-dom';

export function NotFoundView() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-4xl font-bold tracking-tight">404</h2>
      <p className="text-muted-foreground">Page not found.</p>
      <Link
        to="/"
        className="text-primary underline-offset-4 hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
