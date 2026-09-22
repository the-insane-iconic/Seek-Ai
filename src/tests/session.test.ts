import { describe, it, expect } from 'vitest';
import { 
  formatDuration, 
  formatFileSize, 
  formatSessionDate, 
  formatSessionTime, 
  generateUUID, 
  generateDefaultSessionTitle 
} from '../models/session';

describe('Session Model & Utilities', () => {
  it('formats duration correctly for seconds, minutes, and hours', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(5000)).toBe('00:05');
    expect(formatDuration(65000)).toBe('01:05');
    expect(formatDuration(3665000)).toBe('01:01:05');
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('generates unique valid session IDs', () => {
    const id1 = generateUUID();
    const id2 = generateUUID();
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('formats timestamps into human readable dates and times', () => {
    const ts = new Date('2026-09-22T20:30:00Z').getTime();
    const dateStr = formatSessionDate(ts);
    const timeStr = formatSessionTime(ts);
    expect(dateStr.length).toBeGreaterThan(0);
    expect(timeStr.length).toBeGreaterThan(0);
  });

  it('generates default title with time and date', () => {
    const ts = Date.now();
    const title = generateDefaultSessionTitle(ts);
    expect(title).toContain('Memory •');
  });
});
