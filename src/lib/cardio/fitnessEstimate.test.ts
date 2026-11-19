import { describe, expect, it } from 'vitest';
import {
  acsmWalkingVo2,
  estimateVo2maxFromWalk,
  scoreVo2maxFriend,
  WALK_PROTOCOL,
} from './fitnessEstimate';

describe('acsmWalkingVo2', () => {
  it('gives the oxygen cost of the studio walk (5 km/h, 10% incline)', () => {
    // 83.33 m/min: 0.1*83.33 + 1.8*83.33*0.10 + 3.5 = 26.8
    expect(acsmWalkingVo2(WALK_PROTOCOL.speedKmh, WALK_PROTOCOL.gradePct)).toBeCloseTo(26.8, 1);
  });
});

describe('estimateVo2maxFromWalk', () => {
  it('extrapolates from the share of heart-rate reserve used (Swain)', () => {
    // age 38: HRmax 181.4; effort (150-62)/(181.4-62) = 0.737; 3.5 + 23.33/0.737 = 35.2
    const r = estimateVo2maxFromWalk({ age: 38, restingHr: 62, workHr: 150 });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.vo2max).toBeCloseTo(35.2, 1);
      expect(r.effort).toBeCloseTo(0.737, 2);
    }
  });

  it('refuses to guess when the walk was too easy', () => {
    expect(estimateVo2maxFromWalk({ age: 30, restingHr: 50, workHr: 95 }).status).toBe('too-easy');
  });

  it('caps at the walk itself when the client reached their predicted max', () => {
    const r = estimateVo2maxFromWalk({ age: 60, restingHr: 70, workHr: 175 });
    expect(r.status === 'ok' && r.vo2max).toBeCloseTo(26.8, 1);
  });

  it('needs age, resting and walk heart rate, with walk above resting', () => {
    expect(estimateVo2maxFromWalk({ age: 0, restingHr: 60, workHr: 140 }).status).toBe('missing');
    expect(estimateVo2maxFromWalk({ age: 40, restingHr: 0, workHr: 140 }).status).toBe('missing');
    expect(estimateVo2maxFromWalk({ age: 40, restingHr: 80, workHr: 75 }).status).toBe('missing');
  });
});

describe('scoreVo2maxFriend (FRIEND 2015, Table 3)', () => {
  it('maps the printed percentiles to the same score', () => {
    expect(scoreVo2maxFriend(42.4, 35, 'male')).toBe(50);
    expect(scoreVo2maxFriend(49.2, 35, 'male')).toBe(75);
    expect(scoreVo2maxFriend(30.2, 35, 'female')).toBe(50);
    expect(scoreVo2maxFriend(20.0, 65, 'female')).toBe(50);
  });

  it('caps at the 5th and 95th percentiles', () => {
    expect(scoreVo2maxFriend(80, 25, 'male')).toBe(100);
    expect(scoreVo2maxFriend(10, 25, 'male')).toBe(5);
  });

  it('uses the nearest decade outside 20-79 and needs sex', () => {
    expect(scoreVo2maxFriend(48.0, 18, 'male')).toBe(50);
    expect(scoreVo2maxFriend(24.4, 85, 'male')).toBe(50);
    expect(scoreVo2maxFriend(40, 30, 'any')).toBeNull();
  });
});
