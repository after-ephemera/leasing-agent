import express from 'express';
import { LangChainAgent } from '../services/langchain-agent';
import { LeasingTools } from '../tools/langchain-tools';
import { ChatRequest, ChatResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function createChatRouter(agent: LangChainAgent, leasingTools: LeasingTools): express.Router {
  const router = express.Router();

  router.post('/reply', async (req, res) => {
    const requestId = uuidv4();
    
    try {
      // Validate request body
      const chatRequest: ChatRequest = req.body;
      
      if (!chatRequest.lead?.name || !chatRequest.lead?.email) {
        return res.status(400).json({
          error: 'Missing required lead information (name, email)'
        });
      }

      if (!chatRequest.message?.trim()) {
        return res.status(400).json({
          error: 'Message cannot be empty'
        });
      }

      if (!chatRequest.community_id) {
        return res.status(400).json({
          error: 'Community ID is required'
        });
      }

      // Process the message through the LangChain agent
      const response: ChatResponse = await agent.processMessage(chatRequest, requestId);

      // Set request ID header for tracking
      res.setHeader('X-Request-ID', requestId);
      
      // Return the response
      res.json(response);

    } catch (error) {
      console.error('Chat endpoint error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        request_id: requestId
      });
    }
  });

  // Book a tour slot
  router.post('/book-tour', async (req, res) => {
    const requestId = uuidv4();
    
    try {
      const { community_id, slot_time, lead_name, lead_email, lead_phone } = req.body;
      
      // Validate required fields
      if (!community_id || !slot_time || !lead_name || !lead_email) {
        return res.status(400).json({
          error: 'Missing required fields: community_id, slot_time, lead_name, lead_email',
          request_id: requestId
        });
      }

      // Book the tour slot
      const result = await leasingTools.bookTourSlot(
        community_id, 
        slot_time, 
        lead_name, 
        lead_email, 
        lead_phone
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error || 'Failed to book tour slot',
          request_id: requestId
        });
      }

      res.json({
        success: true,
        booking_id: result.booking_id,
        message: 'Tour booked successfully',
        request_id: requestId
      });

    } catch (error) {
      console.error('Book tour endpoint error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        request_id: requestId
      });
    }
  });

  // Get all bookings
  router.get('/bookings', async (req, res) => {
    const requestId = uuidv4();
    
    try {
      const { community_id, limit = 50, offset = 0 } = req.query;
      
      const bookings = await leasingTools.getBookings(
        community_id as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        bookings,
        total: bookings.length,
        request_id: requestId
      });

    } catch (error) {
      console.error('Get bookings endpoint error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        request_id: requestId
      });
    }
  });

  // Get a specific booking
  router.get('/bookings/:booking_id', async (req, res) => {
    const requestId = uuidv4();
    
    try {
      const { booking_id } = req.params;
      
      const booking = await leasingTools.getBooking(booking_id);
      
      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found',
          request_id: requestId
        });
      }

      res.json({
        booking,
        request_id: requestId
      });

    } catch (error) {
      console.error('Get booking endpoint error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        request_id: requestId
      });
    }
  });

  // Cancel a booking
  router.post('/bookings/:booking_id/cancel', async (req, res) => {
    const requestId = uuidv4();
    
    try {
      const { booking_id } = req.params;
      
      const success = await leasingTools.cancelBooking(booking_id);
      
      if (!success) {
        return res.status(400).json({
          error: 'Failed to cancel booking',
          request_id: requestId
        });
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        request_id: requestId
      });

    } catch (error) {
      console.error('Cancel booking endpoint error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        request_id: requestId
      });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'leasing-assistant-api'
    });
  });

  return router;
}
