import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/providers/theme-provider';
import { routes } from '@/routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
