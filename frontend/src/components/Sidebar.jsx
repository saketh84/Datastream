import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  BookOpen,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({ activeChat, onChatSelect }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to check if a path is active
  const isActive = (path) => location.pathname === path;

  const recentChats = [
    { id: 1, name: 'List of Columns Available' }
  ];

  return (
    <div style={{
      width: '280px',
      height: '100vh',
      backgroundColor: '#F5F5F5',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* Header with Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #E5E7EB',
        height: '69px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #1F2937',
            borderRadius: '3px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '3px',
              right: '3px',
              height: '2px',
              backgroundColor: '#1F2937'
            }} />
            <div style={{
              position: 'absolute',
              top: '9px',
              left: '3px',
              right: '3px',
              height: '2px',
              backgroundColor: '#1F2937'
            }} />
          </div>
        </div>
      </div>

      {/* Spaces Section */}
      <div style={{ padding: '16px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#6B7280',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Spaces
        </div>
      </div>

      {/* Recent Chats */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #E5E7EB',
        flex: 1,
        overflowY: 'auto'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#6B7280',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Recent chats
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {recentChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => onChatSelect && onChatSelect(chat)}
              style={{
                padding: '10px 12px',
                backgroundColor: activeChat === chat.id ? '#E5E7EB' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '400',
                color: '#1F2937',
                textAlign: 'left',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeChat !== chat.id) {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }
              }}
              onMouseLeave={(e) => {
                if (activeChat !== chat.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {chat.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}