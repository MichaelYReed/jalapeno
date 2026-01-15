import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStatusIndex,
  getStatuses,
  isStatusComplete,
  isStatusCurrent,
  getStatusTimestamps,
} from './orderStatusService';

describe('orderStatusService', () => {
  describe('getStatuses', () => {
    it('returns all status values in order', () => {
      const statuses = getStatuses();

      expect(statuses).toEqual(['pending', 'confirmed', 'shipped', 'delivered']);
    });
  });

  describe('getStatusIndex', () => {
    it('returns correct index for each status', () => {
      expect(getStatusIndex('pending')).toBe(0);
      expect(getStatusIndex('confirmed')).toBe(1);
      expect(getStatusIndex('shipped')).toBe(2);
      expect(getStatusIndex('delivered')).toBe(3);
    });

    it('returns -1 for unknown status', () => {
      expect(getStatusIndex('unknown')).toBe(-1);
    });
  });

  describe('isStatusComplete', () => {
    it('returns true for completed statuses', () => {
      // When current status is "shipped", both "pending" and "confirmed" are complete
      expect(isStatusComplete('shipped', 'pending')).toBe(true);
      expect(isStatusComplete('shipped', 'confirmed')).toBe(true);
      expect(isStatusComplete('shipped', 'shipped')).toBe(true);
    });

    it('returns false for future statuses', () => {
      // When current status is "confirmed", "shipped" and "delivered" are not complete
      expect(isStatusComplete('confirmed', 'shipped')).toBe(false);
      expect(isStatusComplete('confirmed', 'delivered')).toBe(false);
    });

    it('returns true when current equals check status', () => {
      expect(isStatusComplete('pending', 'pending')).toBe(true);
      expect(isStatusComplete('delivered', 'delivered')).toBe(true);
    });
  });

  describe('isStatusCurrent', () => {
    it('returns true when statuses match', () => {
      expect(isStatusCurrent('pending', 'pending')).toBe(true);
      expect(isStatusCurrent('shipped', 'shipped')).toBe(true);
    });

    it('returns false when statuses do not match', () => {
      expect(isStatusCurrent('pending', 'confirmed')).toBe(false);
      expect(isStatusCurrent('shipped', 'delivered')).toBe(false);
    });
  });

  describe('getStatusTimestamps', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('returns empty object when no timestamps exist', () => {
      const timestamps = getStatusTimestamps(999);

      expect(timestamps).toEqual({});
    });

    it('returns stored timestamps for an order', () => {
      const mockTimestamps = {
        pending: '2024-01-15T10:00:00.000Z',
        confirmed: '2024-01-15T10:00:05.000Z',
      };
      localStorage.setItem('order_timestamps_123', JSON.stringify(mockTimestamps));

      const timestamps = getStatusTimestamps(123);

      expect(timestamps).toEqual(mockTimestamps);
    });
  });
});
