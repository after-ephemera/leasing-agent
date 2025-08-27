import { DomainTools } from '../tools/domain-tools';
import { Database } from '../database';

// Mock the database
const mockQuery = jest.fn();
const mockDb = {
  query: mockQuery,
  getPool: jest.fn(),
  close: jest.fn(),
} as unknown as Database;

describe('DomainTools', () => {
  let domainTools: DomainTools;

  beforeEach(() => {
    domainTools = new DomainTools(mockDb);
    jest.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return available units for a community', async () => {
      const mockUnits = [
        {
          unit_id: '12B',
          unit_number: '12B',
          bedrooms: 2,
          bathrooms: 2.5,
          sqft: 1200,
          description: '2 bed 2.5 bath corner unit',
          available: true,
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockUnits });

      const result = await domainTools.checkAvailability('sunset-ridge', 2);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        unit_id: '12B',
        description: '2 bed 2.5 bath corner unit',
        bedrooms: 2,
        bathrooms: 2.5,
        sqft: 1200,
        available: true,
      });
    });

    it('should return empty array when no units available', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await domainTools.checkAvailability('sunset-ridge', 3);
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(domainTools.checkAvailability('sunset-ridge', 2))
        .rejects.toThrow('Database error');
    });
  });

  describe('checkPetPolicy', () => {
    it('should return pet policy when found', async () => {
      const mockPolicy = {
        allowed: true,
        fee: 100,
        notes: 'One-time fee',
        restrictions: '["Max 2 pets"]',
      };

      mockQuery.mockResolvedValue({ rows: [mockPolicy] });

      const result = await domainTools.checkPetPolicy('sunset-ridge', 'dog');

      expect(result).toEqual({
        allowed: true,
        fee: 100,
        notes: 'One-time fee',
        restrictions: ['Max 2 pets'],
      });
    });

    it('should return null when no policy found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await domainTools.checkPetPolicy('sunset-ridge', 'snake');
      expect(result).toBeNull();
    });
  });

  describe('getPricing', () => {
    it('should return pricing information when found', async () => {
      const mockPricing = {
        rent: 2495,
        deposit: 2495,
        application_fee: 50,
        admin_fee: 150,
        special_offer: '1st month free',
      };

      mockQuery.mockResolvedValue({ rows: [mockPricing] });

      const result = await domainTools.getPricing('sunset-ridge', '12B');

      expect(result).toEqual({
        rent: 2495,
        deposit: 2495,
        special: '1st month free',
        fees: {
          application: 50,
          admin: 150,
        },
      });
    });

    it('should return null when no pricing found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await domainTools.getPricing('sunset-ridge', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAvailableTourSlots', () => {
    it('should return available tour slots', async () => {
      const mockSlots = [
        { slot_time: new Date('2025-08-28T10:00:00Z') },
        { slot_time: new Date('2025-08-28T14:00:00Z') },
      ];

      mockQuery.mockResolvedValue({ rows: mockSlots });

      const result = await domainTools.getAvailableTourSlots('sunset-ridge', 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('2025-08-28T10:00:00.000Z');
      expect(result[1]).toBe('2025-08-28T14:00:00.000Z');
    });
  });

  describe('bookTourSlot', () => {
    it('should return true when booking is successful', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await domainTools.bookTourSlot('sunset-ridge', '2025-08-28T10:00:00Z');
      expect(result).toBe(true);
    });

    it('should return false when booking fails', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await domainTools.bookTourSlot('sunset-ridge', '2025-08-28T10:00:00Z');
      expect(result).toBe(false);
    });
  });
});
