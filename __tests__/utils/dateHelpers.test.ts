/**
 * Date Helpers Tests
 */

import {
  formatMessageTimestamp,
  formatTime,
  formatDate,
  getDateSeparator,
  isToday,
  isSameDay,
  formatDistanceToNow,
} from '../../utils/dateHelpers';

describe('dateHelpers', () => {
  // Mock current date for consistent testing
  const mockNow = new Date('2024-01-15T12:00:00Z');
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatMessageTimestamp', () => {
    it('should return "Just now" for messages less than 1 minute old', () => {
      const date = new Date('2024-01-15T11:59:30Z');
      expect(formatMessageTimestamp(date)).toBe('Just now');
    });

    it('should return minutes ago for messages less than 1 hour old', () => {
      const date = new Date('2024-01-15T11:30:00Z');
      expect(formatMessageTimestamp(date)).toBe('30m ago');
    });

    it('should return hours ago for messages less than 24 hours old', () => {
      const date = new Date('2024-01-15T09:00:00Z');
      expect(formatMessageTimestamp(date)).toBe('3h ago');
    });

    it('should return "Yesterday" with time for messages from yesterday', () => {
      const date = new Date('2024-01-14T15:30:00Z');
      const result = formatMessageTimestamp(date);
      expect(result).toContain('Yesterday');
      expect(result).toContain('PM');
    });

    it('should return day name with time for messages within the week', () => {
      const date = new Date('2024-01-10T10:00:00Z');
      const result = formatMessageTimestamp(date);
      expect(result).toContain('Wed');
    });

    it('should return formatted date for older messages', () => {
      const date = new Date('2024-01-01T10:00:00Z');
      expect(formatMessageTimestamp(date)).toBe('Jan 1, 2024');
    });

    it('should handle string dates', () => {
      const dateString = '2024-01-15T11:30:00Z';
      expect(formatMessageTimestamp(dateString)).toBe('30m ago');
    });

    it('should return empty string for undefined date', () => {
      expect(formatMessageTimestamp(undefined)).toBe('');
    });
  });

  describe('formatTime', () => {
    it('should format morning time correctly', () => {
      const date = new Date('2024-01-15T09:30:00Z');
      expect(formatTime(date)).toMatch(/9:30 AM/);
    });

    it('should format afternoon time correctly', () => {
      const date = new Date('2024-01-15T15:45:00Z');
      expect(formatTime(date)).toMatch(/3:45 PM/);
    });

    it('should format noon correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatTime(date)).toMatch(/12:00 PM/);
    });

    it('should format midnight correctly', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      expect(formatTime(date)).toMatch(/12:00 AM/);
    });

    it('should pad single-digit minutes with zero', () => {
      const date = new Date('2024-01-15T09:05:00Z');
      expect(formatTime(date)).toMatch(/9:05 AM/);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('should format different months correctly', () => {
      const dates = [
        { date: new Date('2024-02-01T12:00:00Z'), expected: 'Feb 1, 2024' },
        { date: new Date('2024-12-25T12:00:00Z'), expected: 'Dec 25, 2024' },
      ];

      dates.forEach(({ date, expected }) => {
        expect(formatDate(date)).toBe(expected);
      });
    });
  });

  describe('getDateSeparator', () => {
    it('should return "Today" for today\'s date', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      expect(getDateSeparator(date)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday', () => {
      const date = new Date('2024-01-14T10:00:00Z');
      expect(getDateSeparator(date)).toBe('Yesterday');
    });

    it('should return day name for dates within the week', () => {
      const date = new Date('2024-01-10T10:00:00Z');
      expect(getDateSeparator(date)).toBe('Wednesday');
    });

    it('should return formatted date for older dates', () => {
      const date = new Date('2024-01-01T10:00:00Z');
      expect(getDateSeparator(date)).toBe('Jan 1, 2024');
    });

    it('should handle string dates', () => {
      const dateString = '2024-01-15T10:00:00Z';
      expect(getDateSeparator(dateString)).toBe('Today');
    });

    it('should return empty string for undefined date', () => {
      expect(getDateSeparator(undefined)).toBe('');
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(isToday(date)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const date = new Date('2024-01-14T12:00:00Z');
      expect(isToday(date)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const date = new Date('2024-01-16T12:00:00Z');
      expect(isToday(date)).toBe(false);
    });

    it('should handle different times on the same day', () => {
      const morning = new Date('2024-01-15T06:00:00Z');
      const evening = new Date('2024-01-15T22:00:00Z');
      expect(isToday(morning)).toBe(true);
      expect(isToday(evening)).toBe(true);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2024-01-15T09:00:00Z');
      const date2 = new Date('2024-01-15T18:00:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-16T12:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should handle string dates', () => {
      const date1 = '2024-01-15T09:00:00Z';
      const date2 = '2024-01-15T18:00:00Z';
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for undefined dates', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(isSameDay(date, undefined)).toBe(false);
      expect(isSameDay(undefined, date)).toBe(false);
      expect(isSameDay(undefined, undefined)).toBe(false);
    });
  });

  describe('formatDistanceToNow', () => {
    it('should return "Just now" for very recent dates', () => {
      const date = new Date('2024-01-15T11:59:30Z');
      expect(formatDistanceToNow(date)).toBe('Just now');
    });

    it('should return minutes for dates less than an hour ago', () => {
      const date = new Date('2024-01-15T11:30:00Z');
      expect(formatDistanceToNow(date)).toBe('30 mins ago');
    });

    it('should return hours for dates less than a day ago', () => {
      const date = new Date('2024-01-15T09:00:00Z');
      expect(formatDistanceToNow(date)).toBe('3 hours ago');
    });

    it('should return days for dates less than a month ago', () => {
      const date = new Date('2024-01-10T12:00:00Z');
      expect(formatDistanceToNow(date)).toBe('5 days ago');
    });

    it('should return months for dates less than a year ago', () => {
      const date = new Date('2023-11-15T12:00:00Z');
      expect(formatDistanceToNow(date)).toBe('2 months ago');
    });

    it('should return years for very old dates', () => {
      const date = new Date('2022-01-15T12:00:00Z');
      expect(formatDistanceToNow(date)).toBe('2 years ago');
    });

    it('should handle singular units correctly', () => {
      const oneMinAgo = new Date('2024-01-15T11:59:00Z');
      const oneHourAgo = new Date('2024-01-15T11:00:00Z');
      const oneDayAgo = new Date('2024-01-14T12:00:00Z');
      
      expect(formatDistanceToNow(oneMinAgo)).toBe('1 min ago');
      expect(formatDistanceToNow(oneHourAgo)).toBe('1 hour ago');
      expect(formatDistanceToNow(oneDayAgo)).toBe('1 day ago');
    });

    it('should handle string dates', () => {
      const dateString = '2024-01-15T11:30:00Z';
      expect(formatDistanceToNow(dateString)).toBe('30 mins ago');
    });

    it('should return empty string for undefined date', () => {
      expect(formatDistanceToNow(undefined)).toBe('');
    });
  });
});

