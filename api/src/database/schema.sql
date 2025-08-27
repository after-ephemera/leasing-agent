-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255)
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(255) PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  sqft INTEGER,
  description TEXT,
  available BOOLEAN DEFAULT true,
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

-- Pet policies table
CREATE TABLE IF NOT EXISTS pet_policies (
  id SERIAL PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  pet_type VARCHAR(50) NOT NULL,
  allowed BOOLEAN NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  restrictions TEXT,
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

-- Pricing table
CREATE TABLE IF NOT EXISTS pricing (
  id SERIAL PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  unit_id VARCHAR(255) NOT NULL,
  rent DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) NOT NULL,
  application_fee DECIMAL(10,2) DEFAULT 0,
  admin_fee DECIMAL(10,2) DEFAULT 0,
  special_offer TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Conversation history
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255) NOT NULL,
  community_id VARCHAR(255) NOT NULL,
  preferences TEXT, -- JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  action VARCHAR(50) CHECK (action IN ('propose_tour', 'ask_clarification', 'handoff_human')),
  proposed_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tool_name VARCHAR(100),
  tool_args TEXT, -- JSON string
  tool_response TEXT, -- JSON string
  llm_latency DECIMAL(10,3),
  llm_tokens_prompt INTEGER,
  llm_tokens_completion INTEGER,
  llm_tokens_total INTEGER,
  error_message TEXT
);

-- Tour slots table
CREATE TABLE IF NOT EXISTS tour_slots (
  id SERIAL PRIMARY KEY,
  community_id VARCHAR(255) NOT NULL,
  slot_time TIMESTAMP NOT NULL,
  available BOOLEAN DEFAULT true,
  max_capacity INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0,
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(255) UNIQUE NOT NULL,
  community_id VARCHAR(255) NOT NULL,
  tour_slot_id INTEGER NOT NULL,
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255) NOT NULL,
  lead_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (tour_slot_id) REFERENCES tour_slots(id)
);
