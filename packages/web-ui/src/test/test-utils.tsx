import { render, type RenderOptions } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/providers/theme-provider';
import { routes } from '@/routes';

export function renderWithRouter(
  initialEntries: string[] = ['/'],
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const router = createMemoryRouter(routes, { initialEntries });

  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
    options,
  );
}

export { render } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
