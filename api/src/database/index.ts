import { Pool, PoolClient } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

export class Database {
  private pool: Pool;

  constructor(databaseUrl?: string) {
    this.pool = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database');
      
      await this.initializeSchema(client);
      await this.seedData(client);
      
      client.release();
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }

  private async initializeSchema(client: PoolClient): Promise<void> {
    try {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      await client.query(schema);
      console.log('Database schema initialized');
    } catch (err) {
      console.error('Error initializing schema:', err);
      throw err;
    }
  }

  private async seedData(client: PoolClient): Promise<void> {
    try {
      // Check if data already exists
      const { rows } = await client.query('SELECT COUNT(*) FROM communities');
      if (parseInt(rows[0].count) > 0) {
        console.log('Database already seeded, skipping...');
        return;
      }

      // Insert sample data
      await client.query(`
        INSERT INTO communities (id, name, address, phone, email) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, ['sunset-ridge', 'Sunset Ridge', '123 Sunset Blvd, Los Angeles, CA 90210', '(555) 123-4567', 'leasing@sunsetridge.com']);

      await client.query(`
        INSERT INTO units (id, community_id, unit_number, bedrooms, bathrooms, sqft, description, available) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8),
          ($9, $10, $11, $12, $13, $14, $15, $16),
          ($17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO NOTHING
      `, [
        '12B', 'sunset-ridge', '12B', 2, 2.5, 1200, '2 bed 2.5 bath corner unit with city views', true,
        '8A', 'sunset-ridge', '8A', 2, 2, 1100, '2 bed 2 bath unit with balcony', true,
        '15C', 'sunset-ridge', '15C', 3, 2, 1400, '3 bed 2 bath penthouse unit', false
      ]);

      await client.query(`
        INSERT INTO pet_policies (community_id, pet_type, allowed, fee, notes, restrictions) 
        VALUES 
          ($1, $2, $3, $4, $5, $6),
          ($7, $8, $9, $10, $11, $12),
          ($13, $14, $15, $16, $17, $18)
        ON CONFLICT DO NOTHING
      `, [
        'sunset-ridge', 'cat', true, 50, 'One-time fee per pet', '["Max 2 pets per unit"]',
        'sunset-ridge', 'dog', true, 100, 'One-time fee per pet', '["Max 2 pets per unit", "Weight limit 50lbs", "Breed restrictions apply"]',
        'sunset-ridge', 'bird', true, 25, 'One-time fee per pet', '["Max 3 birds per unit"]'
      ]);

      await client.query(`
        INSERT INTO pricing (community_id, unit_id, rent, deposit, application_fee, admin_fee, special_offer) 
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7),
          ($8, $9, $10, $11, $12, $13, $14),
          ($15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT DO NOTHING
      `, [
        'sunset-ridge', '12B', 2495, 2495, 50, 150, '1st month free',
        'sunset-ridge', '8A', 2395, 2395, 50, 150, '1st month free',
        'sunset-ridge', '15C', 3200, 3200, 50, 150, null
      ]);

      // Insert tour slots for the next few days
      const now = new Date();
      const tourSlots = [
        new Date(now.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // tomorrow 10am
        new Date(now.getTime() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // tomorrow 2pm
        new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // day after tomorrow 10am
        new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // day after tomorrow 2pm
        new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), // 3 days from now 11am
      ];

      for (const slotTime of tourSlots) {
        await client.query(`
          INSERT INTO tour_slots (community_id, slot_time, available, max_capacity, current_bookings) 
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, ['sunset-ridge', slotTime, true, 3, 0]);
      }

      console.log('Database seeded with sample data');
    } catch (err) {
      console.error('Error seeding data:', err);
      throw err;
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection closed');
  }
}
