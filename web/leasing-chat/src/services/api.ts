import type { ChatRequest, ChatResponse } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface APIError extends Error {
  status: number;
  requestId?: string;
}

export const createAPIError = (message: string, status: number, requestId?: string): APIError => {
  const error = new Error(message) as APIError;
  error.name = 'APIError';
  error.status = status;
  error.requestId = requestId;
  return error;
};

export const apiService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const requestId = response.headers.get('X-Request-ID');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createAPIError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          requestId || undefined
        );
      }

      const data: ChatResponse = await response.json();
      return data;
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Network or other errors
      throw createAPIError(
        'Unable to connect to the leasing assistant. Please check your connection and try again.',
        0
      );
    }
  },

  async bookTour(bookingData: {
    community_id: string;
    slot_time: string;
    lead_name: string;
    lead_email: string;
    lead_phone?: string;
  }): Promise<{ success: boolean; booking_id: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/book-tour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const requestId = response.headers.get('X-Request-ID');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createAPIError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          requestId || undefined
        );
      }

      return response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      throw createAPIError(
        'Unable to book tour. Please check your connection and try again.',
        0
      );
    }
  },

  async getBookings(community_id?: string, limit?: number, offset?: number): Promise<{ bookings: any[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (community_id) params.append('community_id', community_id);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await fetch(`${API_BASE_URL}/api/bookings?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createAPIError(
          errorData.error || `HTTP ${response.status}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      throw createAPIError(
        'Unable to fetch bookings. Please check your connection and try again.',
        0
      );
    }
  },

  async getBooking(booking_id: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${booking_id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createAPIError(
          errorData.error || `HTTP ${response.status}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      throw createAPIError(
        'Unable to fetch booking. Please check your connection and try again.',
        0
      );
    }
  },

  async cancelBooking(booking_id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${booking_id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const requestId = response.headers.get('X-Request-ID');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createAPIError(
          errorData.error || `HTTP ${response.status}`,
          response.status,
          requestId || undefined
        );
      }

      return response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      throw createAPIError(
        'Unable to cancel booking. Please check your connection and try again.',
        0
      );
    }
  },

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error('API health check failed');
    }
  }
};
