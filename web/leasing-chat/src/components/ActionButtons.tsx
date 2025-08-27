import React from 'react';
import { Calendar, MessageCircle, User } from 'lucide-react';

interface ActionButtonsProps {
  action: 'propose_tour' | 'ask_clarification' | 'handoff_human';
  proposedTime?: string;
  availableTimes?: string[];
  onConfirmTour?: (time?: string) => void;
  onHandoffHuman?: () => void;
  onSuggestDifferentTime?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  action,
  proposedTime,
  availableTimes,
  onConfirmTour,
  onHandoffHuman,
  onSuggestDifferentTime
}) => {
  if (action === 'propose_tour' && availableTimes && Array.isArray(availableTimes) && availableTimes.length > 0) {
    return (
      <div className="action-buttons">
        {availableTimes.map((time, index) => {
          const tourDate = new Date(time);
          const formattedTime = tourDate.toLocaleDateString() + ' at ' + 
            tourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <button 
              key={index}
              className="action-button primary"
              onClick={() => onConfirmTour?.(time)}
            >
              <Calendar size={16} />
              Confirm Tour - {formattedTime}
            </button>
          );
        })}
        <button 
          className="action-button secondary"
          onClick={onSuggestDifferentTime}
        >
          <MessageCircle size={16} />
          Suggest Different Time
        </button>
      </div>
    );
  }

  if (action === 'propose_tour' && proposedTime) {
    // Fallback for backward compatibility
    const tourDate = new Date(proposedTime);
    const formattedTime = tourDate.toLocaleDateString() + ' at ' + 
      tourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="action-buttons">
        <button 
          className="action-button primary"
          onClick={() => onConfirmTour?.(proposedTime)}
        >
          <Calendar size={16} />
          Confirm Tour - {formattedTime}
        </button>
        <button 
          className="action-button secondary"
          onClick={onSuggestDifferentTime}
        >
          <MessageCircle size={16} />
          Suggest Different Time
        </button>
      </div>
    );
  }

  if (action === 'handoff_human') {
    return (
      <div className="action-buttons">
        <button 
          className="action-button primary"
          onClick={onHandoffHuman}
        >
          <User size={16} />
          Connect with Leasing Agent
        </button>
      </div>
    );
  }

  // For ask_clarification, no special buttons needed
  return null;
};
