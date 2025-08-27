export interface Lead {
  name: string;
  email: string;
}

export interface Preferences {
  bedrooms?: number;
  move_in?: string;
}

export interface ChatRequest {
  lead: Lead;
  message: string;
  preferences: Preferences;
  community_id: string;
}

export interface ChatResponse {
  reply: string;
  action: 'propose_tour' | 'ask_clarification' | 'handoff_human';
  proposed_time?: string;
  available_times?: string[];
}

export interface AvailabilityResult {
  unit_id: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  available: boolean;
}

export interface PetPolicyResult {
  allowed: boolean;
  fee?: number;
  notes?: string;
  restrictions?: string[];
}

export interface PricingResult {
  rent: number;
  special?: string;
  deposit: number;
  fees: {
    application: number;
    admin: number;
    pet?: number;
  };
}

export interface LogEntry {
  request_id: string;
  timestamp: Date;
  tool_name?: string;
  tool_args?: any;
  tool_response?: any;
  llm_latency?: number;
  llm_tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}
