import { Database } from '../database';
import { AvailabilityResult, PetPolicyResult, PricingResult } from '../types';

export class DomainTools {
  constructor(private db: Database) {}

  async checkAvailability(community_id: string, bedrooms?: number): Promise<AvailabilityResult[]> {
    let query = `
      SELECT id as unit_id, unit_number, bedrooms, bathrooms, sqft, description, available
      FROM units 
      WHERE community_id = $1 AND available = true
    `;
    
    const params: any[] = [community_id];
    
    if (bedrooms) {
      query += ' AND bedrooms = $2';
      params.push(bedrooms);
    }
    
    query += ' ORDER BY unit_number';

    try {
      const { rows } = await this.db.query(query, params);
      
      const results: AvailabilityResult[] = rows.map((row: any) => ({
        unit_id: row.unit_id,
        description: row.description,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        sqft: row.sqft,
        available: Boolean(row.available)
      }));

      return results;
    } catch (err) {
      throw err;
    }
  }

  async checkPetPolicy(community_id: string, pet_type: string): Promise<PetPolicyResult | null> {
    const query = `
      SELECT allowed, fee, notes, restrictions
      FROM pet_policies 
      WHERE community_id = $1 AND pet_type = $2
    `;

    try {
      const { rows } = await this.db.query(query, [community_id, pet_type.toLowerCase()]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      const result: PetPolicyResult = {
        allowed: Boolean(row.allowed),
        fee: row.fee || undefined,
        notes: row.notes || undefined,
        restrictions: row.restrictions ? JSON.parse(row.restrictions) : undefined
      };

      return result;
    } catch (err) {
      throw err;
    }
  }

  async getPricing(community_id: string, unit_id: string, move_in_date?: string): Promise<PricingResult | null> {
    const query = `
      SELECT rent, deposit, application_fee, admin_fee, special_offer
      FROM pricing 
      WHERE community_id = $1 AND unit_id = $2
      ORDER BY effective_date DESC
      LIMIT 1
    `;

    try {
      const { rows } = await this.db.query(query, [community_id, unit_id]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      const result: PricingResult = {
        rent: row.rent,
        special: row.special_offer || undefined,
        deposit: row.deposit,
        fees: {
          application: row.application_fee || 0,
          admin: row.admin_fee || 0
        }
      };

      return result;
    } catch (err) {
      throw err;
    }
  }

  async getAvailableTourSlots(community_id: string, limit: number = 5): Promise<string[]> {
    const query = `
      SELECT slot_time
      FROM tour_slots 
      WHERE community_id = $1 
        AND available = true 
        AND current_bookings < max_capacity
        AND slot_time > NOW()
      ORDER BY slot_time
      LIMIT $2
    `;

    try {
      const { rows } = await this.db.query(query, [community_id, limit]);
      
      const slots = rows.map((row: any) => row.slot_time.toISOString());
      return slots;
    } catch (err) {
      throw err;
    }
  }

  async bookTourSlot(community_id: string, slot_time: string, lead_name: string, lead_email: string, lead_phone?: string): Promise<{ success: boolean; booking_id?: string; error?: string }> {
    const client = await this.db.getPool().connect();
    
    try {
      await client.query('BEGIN');

      // First, check if the slot is available and get the slot ID
      const slotQuery = `
        SELECT id, current_bookings, max_capacity
        FROM tour_slots 
        WHERE community_id = $1 
          AND slot_time = $2
          AND available = true
          AND current_bookings < max_capacity
        FOR UPDATE
      `;
      
      const slotResult = await client.query(slotQuery, [community_id, slot_time]);
      
      if (slotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Tour slot not available' };
      }

      const slot = slotResult.rows[0];
      
      // Update the tour slot booking count
      const updateSlotQuery = `
        UPDATE tour_slots 
        SET current_bookings = current_bookings + 1
        WHERE id = $1
      `;
      
      await client.query(updateSlotQuery, [slot.id]);

      // Create the booking record
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const bookingQuery = `
        INSERT INTO bookings (booking_id, community_id, tour_slot_id, lead_name, lead_email, lead_phone)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING booking_id
      `;
      
      const bookingResult = await client.query(bookingQuery, [
        bookingId,
        community_id,
        slot.id,
        lead_name,
        lead_email,
        lead_phone || null
      ]);

      await client.query('COMMIT');
      
      return { 
        success: true, 
        booking_id: bookingResult.rows[0].booking_id 
      };
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBookings(community_id?: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    let query = `
      SELECT 
        b.booking_id,
        b.lead_name,
        b.lead_email,
        b.lead_phone,
        b.status,
        b.notes,
        b.created_at,
        b.updated_at,
        c.name as community_name,
        ts.slot_time,
        ts.max_capacity,
        ts.current_bookings
      FROM bookings b
      JOIN communities c ON b.community_id = c.id
      JOIN tour_slots ts ON b.tour_slot_id = ts.id
    `;
    
    const params: any[] = [];
    
    if (community_id) {
      query += ' WHERE b.community_id = $1';
      params.push(community_id);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    try {
      const { rows } = await this.db.query(query, params);
      return rows;
    } catch (err) {
      throw err;
    }
  }

  async getBooking(booking_id: string): Promise<any | null> {
    const query = `
      SELECT 
        b.booking_id,
        b.lead_name,
        b.lead_email,
        b.lead_phone,
        b.status,
        b.notes,
        b.created_at,
        b.updated_at,
        c.name as community_name,
        c.id as community_id,
        ts.slot_time,
        ts.max_capacity,
        ts.current_bookings
      FROM bookings b
      JOIN communities c ON b.community_id = c.id
      JOIN tour_slots ts ON b.tour_slot_id = ts.id
      WHERE b.booking_id = $1
    `;

    try {
      const { rows } = await this.db.query(query, [booking_id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      throw err;
    }
  }

  async cancelBooking(booking_id: string): Promise<boolean> {
    const client = await this.db.getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Get the booking and tour slot info
      const bookingQuery = `
        SELECT b.tour_slot_id, b.status
        FROM bookings b
        WHERE b.booking_id = $1
        FOR UPDATE
      `;
      
      const bookingResult = await client.query(bookingQuery, [booking_id]);
      
      if (bookingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const booking = bookingResult.rows[0];
      
      if (booking.status === 'cancelled') {
        await client.query('ROLLBACK');
        return false; // Already cancelled
      }

      // Update booking status
      const updateBookingQuery = `
        UPDATE bookings 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $1
      `;
      
      await client.query(updateBookingQuery, [booking_id]);

      // Decrease the tour slot booking count
      const updateSlotQuery = `
        UPDATE tour_slots 
        SET current_bookings = current_bookings - 1
        WHERE id = $1 AND current_bookings > 0
      `;
      
      await client.query(updateSlotQuery, [booking.tour_slot_id]);

      await client.query('COMMIT');
      return true;
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
