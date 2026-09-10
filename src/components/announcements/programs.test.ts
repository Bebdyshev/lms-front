import { describe, expect, it } from 'vitest';
import { detectPrograms } from './programs';

describe('detectPrograms', () => {
  it('reads the real group titles', () => {
    expect(detectPrograms('July 2 IELTS with curator')).toEqual(['ielts']);
    expect(detectPrograms('June 2 Nuet with curator')).toEqual(['nuet']);
    expect(detectPrograms('NUET June 1 with curator 🤍')).toEqual(['nuet']);
    expect(detectPrograms('SAT September 7 2026')).toEqual(['sat']);
    expect(detectPrograms('July 1 with curator')).toEqual([]);
    expect(detectPrograms('Отдел продукта')).toEqual([]);
  });

  it('matches whole words only, in both alphabets', () => {
    expect(detectPrograms('Saturday meetup')).toEqual([]);
    expect(detectPrograms('Georgia trip')).toEqual([]);
    expect(detectPrograms('SAT2026')).toEqual(['sat']);
    expect(detectPrograms('Группа САТ')).toEqual(['sat']);
  });

  it('matches a multi-word alias however it is spaced', () => {
    expect(detectPrograms('General English A2')).toEqual(['general_english']);
    expect(detectPrograms('General  English A2')).toEqual(['general_english']);
  });

  it('lists every program a combined group names', () => {
    expect(detectPrograms('SAT + IELTS intensive')).toEqual(['sat', 'ielts']);
  });
});
