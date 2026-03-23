import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/providers/theme-provider';
import { DataProvider } from '@/providers/data-provider';
import { routes } from '@/routes';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </ThemeProvider>
  );
}
