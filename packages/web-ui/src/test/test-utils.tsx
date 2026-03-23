import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/providers/theme-provider';
import { DataProvider } from '@/providers/data-provider';
import { routes } from '@/routes';

export function renderWithRouter(
  initialEntries: string[] = ['/'],
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  const router = createMemoryRouter(routes, { initialEntries });

  return render(
    <ThemeProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </ThemeProvider>,
    options,
  );
}

export { render } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
