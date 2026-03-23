import type { RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { RouteError } from '@/components/route-error';
import { OverviewView } from './views/overview';
import { StandingsView } from '@/views/StandingsView';
import { RoundsView } from './views/rounds';
import { RoundDetailView } from './views/round-detail';
import { AnalyticsView } from './views/analytics';
import { ConfigView } from './views/config';
import { NotFoundView } from './views/not-found';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <OverviewView /> },
      { path: 'standings', element: <StandingsView /> },
      { path: 'rounds', element: <RoundsView /> },
      { path: 'rounds/:roundId', element: <RoundDetailView /> },
      { path: 'analytics', element: <AnalyticsView /> },
      { path: 'config', element: <ConfigView /> },
      { path: '*', element: <NotFoundView /> },
    ],
  },
];
