import { Database } from '../database';
import { AvailabilityResult, PetPolicyResult, PricingResult } from '../types';

export class LeasingTools {
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
  }

  async checkPetPolicy(community_id: string, pet_type: string): Promise<PetPolicyResult | null> {
    const query = `
      SELECT allowed, fee, notes, restrictions
      FROM pet_policies 
      WHERE community_id = $1 AND pet_type = $2
    `;

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
  }

  async getPricing(community_id: string, unit_id: string, move_in_date?: string): Promise<PricingResult | null> {
    const query = `
      SELECT rent, deposit, application_fee, admin_fee, special_offer
      FROM pricing 
      WHERE community_id = $1 AND unit_id = $2
      ORDER BY effective_date DESC
      LIMIT 1
    `;

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

    const { rows } = await this.db.query(query, [community_id, limit]);
    
    const slots = rows.map((row: any) => row.slot_time.toISOString());
    return slots;
  }

  // Tour booking methods for use by the router
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


}
