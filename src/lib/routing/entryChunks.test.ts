import { describe, expect, it } from 'vitest';
import { entryChunkIdsForLocation } from './entryChunks';

describe('entryChunkIdsForLocation', () => {
  it('preloads the sign-in page and the client route for an intake deep link', () => {
    expect(entryChunkIdsForLocation('/dashboard/clients/test-client', '?resume=1')).toEqual([
      'login',
      'dashboardLayout',
      'clientDetail',
      'clientOverview',
      'assessment',
    ]);
  });

  it('does not preload the assessment page unless resume is set', () => {
    expect(entryChunkIdsForLocation('/dashboard/clients/test-client', '')).not.toContain('assessment');
  });

  it('preloads only login for the sign-in page', () => {
    expect(entryChunkIdsForLocation('/login', '')).toEqual(['login']);
  });

  it('leaves public routes alone', () => {
    expect(entryChunkIdsForLocation('/r/token', '')).toEqual([]);
    expect(entryChunkIdsForLocation('/', '')).toEqual([]);
  });
});
