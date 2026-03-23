import type { RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { RouteError } from '@/components/route-error';
import { OverviewView } from './views/overview';
import { StandingsView } from '@/views/StandingsView';
import { RoundsPage } from '@/views/RoundsPage';
import { RoundDetailPage } from '@/views/RoundDetailPage';
import { HeadToHeadPage } from '@/views/HeadToHeadPage';
import { AnalyticsPage } from '@/views/AnalyticsPage';
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
      { path: 'rounds', element: <RoundsPage /> },
      { path: 'rounds/:roundId', element: <RoundDetailPage /> },
      { path: 'rounds/compare', element: <HeadToHeadPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'config', element: <ConfigView /> },
      { path: '*', element: <NotFoundView /> },
    ],
  },
];
