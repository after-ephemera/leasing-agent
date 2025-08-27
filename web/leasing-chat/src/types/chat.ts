export interface Lead {
  name: string;
  email: string;
}

export interface Preferences {
  bedrooms?: number;
  move_in?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

export interface ConversationState {
  messages: ChatMessage[];
  lead: Lead;
  preferences: Preferences;
  community_id: string;
}
