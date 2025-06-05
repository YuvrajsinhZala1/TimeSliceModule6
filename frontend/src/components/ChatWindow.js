import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import MessageList from './MessageList';

const ChatWindow = ({ chat, onClose }) => {
  const { messages, sendMessage, fetchMessages, markChatAsRead } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chat && !messages[chat._id]) {
      setLoading(true);
      fetchMessages(chat._id).finally(() => setLoading(false));
    }
  }, [chat, fetchMessages, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages[chat?._id]]);

  // Mark chat as read when component mounts or chat changes
  useEffect(() => {
    if (chat) {
      markChatAsRead(chat._id);
    }
  }, [chat, markChatAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat) return;

    try {
      await sendMessage(chat._id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getOtherParticipant = () => {
    return chat?.participants?.find(p => p._id !== chat.currentUserId);
  };

  if (!chat) {
    return (
      <div className="card text-center" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <h3>💬 Select a Chat</h3>
          <p>Choose a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div>
          <h4 style={{ margin: 0 }}>
            {chat.taskId?.title}
          </h4>
          <small style={{ color: '#666' }}>
            with {otherUser?.username}
            {otherUser?.isOnline && <span style={{ color: '#28a745' }}> • Online</span>}
          </small>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ padding: '0.25rem 0.5rem' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '1rem',
        maxHeight: '300px'
      }}>
        {loading ? (
          <div className="text-center">Loading messages...</div>
        ) : (
          <>
            <MessageList messages={messages[chat._id] || []} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} style={{ 
        padding: '1rem', 
        borderTop: '1px solid #ddd',
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: '#f8f9fa'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1 }}
          disabled={loading}
          autoFocus
        />
        <button 
          type="submit" 
          className="btn btn-success"
          disabled={!newMessage.trim() || loading}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;