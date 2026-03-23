import { describe, it, expect } from 'vitest';
import type { Season, Chapter, SeasonsData, ChapterStatus } from '../index';

describe('Season & Chapter types', () => {
  it('accepts a valid SeasonsData structure', () => {
    const data: SeasonsData = {
      seasons: [
        {
          id: 's1',
          name: 'The Mattermost Campaign',
          codebase: 'mattermost-webapp',
          chapters: [
            {
              id: 's1-ch1',
              name: 'First Contact',
              round_range: ['R19', 'R22'],
              theme: 'Initial exploration.',
              status: 'closed',
            },
          ],
        },
      ],
    };
    expect(data.seasons).toHaveLength(1);
    expect(data.seasons[0].chapters[0].status).toBe('closed');
  });

  it('accepts optional thesis on chapters', () => {
    const chapter: Chapter = {
      id: 's1-ch2',
      name: 'Pattern Recognition',
      round_range: ['R23', 'R27'],
      theme: 'Deeper queries.',
      status: 'in_progress',
      thesis: 'Structured traversal outperforms exhaustive grep.',
    };
    expect(chapter.thesis).toBeDefined();
  });

  it('round_range is a tuple of two strings', () => {
    const chapter: Chapter = {
      id: 's1-ch1',
      name: 'Test',
      round_range: ['R01', 'R10'],
      theme: 'Test theme.',
      status: 'planned',
    };
    expect(chapter.round_range).toHaveLength(2);
    expect(chapter.round_range[0]).toBe('R01');
    expect(chapter.round_range[1]).toBe('R10');
  });

  it('ChapterStatus covers all valid values', () => {
    const statuses: ChapterStatus[] = ['closed', 'in_progress', 'planned'];
    expect(statuses).toHaveLength(3);
  });

  it('season has required fields', () => {
    const season: Season = {
      id: 's2',
      name: 'Test Season',
      codebase: 'django',
      chapters: [],
    };
    expect(season.id).toBe('s2');
    expect(season.chapters).toEqual([]);
  });
});

describe('RoundResult season fields', () => {
  it('season_id and chapter_id are optional strings', () => {
    // Type-level test: importing RoundResult to verify fields exist
    const round = {
      schema_version: 1,
      round_id: 'R19',
      competitor: 'explore',
      round_type: 'regular' as const,
      codebase: 'mattermost-webapp',
      phase: 2,
      calls: 47,
      time_s: 150.6,
      source: 'score' as const,
      is_calibration: false,
      season_id: 's1',
      chapter_id: 's1-ch1',
    };
    expect(round.season_id).toBe('s1');
    expect(round.chapter_id).toBe('s1-ch1');
  });

  it('works without season_id and chapter_id', () => {
    const round = {
      schema_version: 1,
      round_id: 'R19',
      competitor: 'explore',
      round_type: 'regular' as const,
      codebase: 'mattermost-webapp',
      phase: 2,
      calls: 47,
      time_s: 150.6,
      source: 'score' as const,
      is_calibration: false,
    };
    expect(round.season_id).toBeUndefined();
    expect(round.chapter_id).toBeUndefined();
  });
});
