import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ActionButtons } from './ActionButtons';
import type { ConversationState, ChatMessage as ChatMessageType, ChatResponse, ChatRequest } from '../types/chat';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

export const Chat: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationState>({
    messages: [
      {
        id: '1',
        type: 'assistant',
        content: "Hi! I'm your leasing assistant for Sunset Ridge. I'm here to help you find the perfect home. How can I assist you today?",
        timestamp: new Date()
      }
    ],
    lead: {
      name: "Jane Doe",
      email: "jane@example.com"
    },
    preferences: {
      bedrooms: 2,
      move_in: "2025-07-01"
    },
    community_id: "sunset-ridge"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const handleSendMessage = async (message: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    setIsLoading(true);
    setError(null);

    try {
      // Prepare API request
      const request: ChatRequest = {
        lead: conversation.lead,
        message: message,
        preferences: conversation.preferences,
        community_id: conversation.community_id
      };

      // Call real API
      const response = await apiService.sendMessage(request);
      setLastResponse(response);

      // Add assistant response
      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.reply,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage]
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
      
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number; message: string; requestId?: string };
        if (apiError.status === 400) {
          errorMessage = "There was an issue with your request. Please check your message and try again.";
        } else if (apiError.status === 500) {
          errorMessage = "I'm experiencing technical difficulties. Our team has been notified.";
        } else if (apiError.status === 0) {
          errorMessage = apiError.message; // Network error message
        }
        setError(`Request ID: ${apiError.requestId || 'unknown'}`);
      }

      // Add error message
      const assistantErrorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, assistantErrorMessage]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTour = async (time?: string) => {
    if (!time) {
      console.error('No tour time provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the booking API
      const result = await apiService.bookTour({
        community_id: conversation.community_id,
        slot_time: time,
        lead_name: conversation.lead.name,
        lead_email: conversation.lead.email,
        lead_phone: (conversation.lead as any).phone
      });
      
      const selectedTime = new Date(time);
      const formattedTime = selectedTime.toLocaleDateString() + ' at ' + 
        selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const confirmMessage: ChatMessageType = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Perfect! I've scheduled your tour for ${formattedTime}. Your booking ID is ${result.booking_id}. You'll receive a confirmation email shortly with all the details. Is there anything else I can help you with?`,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, confirmMessage]
      }));
      setLastResponse(null);

    } catch (error) {
      console.error('Error booking tour:', error);
      
      const errorMessage: ChatMessageType = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I'm sorry, I wasn't able to book that tour time. Please try selecting a different time or contact our leasing office directly.`,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage]
      }));
      setLastResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandoffHuman = () => {
    const handoffMessage: ChatMessageType = {
      id: Date.now().toString(),
      type: 'assistant',
      content: "I'm connecting you with one of our leasing specialists who will be able to provide more detailed assistance. They'll be with you shortly!",
      timestamp: new Date()
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, handoffMessage]
    }));
    setLastResponse(null);
  };

  const handleSuggestDifferentTime = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Make a request to get a different tour time
      const request: ChatRequest = {
        lead: conversation.lead,
        message: "I'd like to see a different tour time",
        preferences: conversation.preferences,
        community_id: conversation.community_id
      };

      const response = await apiService.sendMessage(request);
      setLastResponse(response);

      // Add assistant response with new tour time
      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.reply,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage]
      }));
    } catch (error) {
      console.error('Error getting different tour time:', error);
      
      let errorMessage = "I'm sorry, I'm having trouble finding another tour time right now. Please try again in a moment.";
      
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number; message: string; requestId?: string };
        if (apiError.status === 400) {
          errorMessage = "There was an issue with your request. Please try again.";
        } else if (apiError.status === 500) {
          errorMessage = "I'm experiencing technical difficulties. Our team has been notified.";
        } else if (apiError.status === 0) {
          errorMessage = apiError.message;
        }
        setError(`Request ID: ${apiError.requestId || 'unknown'}`);
      }

      // Add error message
      const assistantErrorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, assistantErrorMessage]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="community-info">
          <Building2 size={24} />
          <div>
            <h2>Sunset Ridge</h2>
            <p>Leasing Assistant</p>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {conversation.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="loading-indicator">
            <Loader2 size={20} className="spinning" />
            <span>Assistant is typing...</span>
          </div>
        )}

        {error && (
          <div className="error-indicator">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        {lastResponse && (
          <ActionButtons
            action={lastResponse.action}
            proposedTime={lastResponse.proposed_time}
            availableTimes={lastResponse.available_times}
            onConfirmTour={handleConfirmTour}
            onHandoffHuman={handleHandoffHuman}
            onSuggestDifferentTime={handleSuggestDifferentTime}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
      />
    </div>
  );
};
