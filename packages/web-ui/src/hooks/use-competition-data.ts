import { useContext } from 'react';
import { DataContext } from '@/providers/data-provider';
import type { DataContextValue } from '@/providers/data-provider';

export function useCompetitionData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useCompetitionData must be used within a DataProvider');
  }
  return context;
}
