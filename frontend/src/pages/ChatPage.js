import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import ChatWindow from '../components/ChatWindow';

const ChatPage = () => {
  const { currentUser } = useAuth();
  const { chats, activeChat, joinChat, leaveChat, fetchChats, markChatAsRead } = useChat();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchChats().finally(() => setLoading(false));
  }, [currentUser, navigate, fetchChats]);

  const handleChatSelect = async (chat) => {
    // Mark the chat as read when selecting it
    await markChatAsRead(chat._id);
    joinChat(chat);
  };

  const handleCloseChat = () => {
    if (activeChat) {
      // Mark as read when closing
      markChatAsRead(activeChat._id);
    }
    leaveChat();
  };

  const formatLastActivity = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = (chat) => {
    return chat.participants.find(p => p._id !== currentUser.id);
  };

  // Function to check if chat has unread messages
  const hasUnreadMessages = (chat) => {
    // This is a simple check - in a real app you might want to track this more precisely
    return chat.lastMessage && 
           chat.lastMessage.senderId !== currentUser.id && 
           chat.lastActivity && 
           new Date(chat.lastActivity) > new Date(Date.now() - 5 * 60 * 1000); // within last 5 minutes
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return <div className="text-center">Loading your chats...</div>;
  }

  return (
    <div>
      <h1 className="mb-2">💬 Messages</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', height: '600px' }}>
        {/* Chat List */}
        <div className="card" style={{ padding: '1rem', overflow: 'auto' }}>
          <h3>Your Conversations</h3>
          
          {chats.length === 0 ? (
            <div className="text-center" style={{ padding: '2rem', color: '#666' }}>
              <h4>📭 No conversations yet</h4>
              <p>When you accept a task or have your task accepted, you'll be able to chat here!</p>
              <div style={{ marginTop: '1rem' }}>
                <button 
                  onClick={() => navigate('/browse-tasks')}
                  className="btn btn-success"
                  style={{ marginRight: '0.5rem' }}
                >
                  Browse Tasks
                </button>
                <button 
                  onClick={() => navigate('/create-task')}
                  className="btn btn-secondary"
                >
                  Create Task
                </button>
              </div>
            </div>
          ) : (
            <div>
              {chats.map(chat => {
                const otherUser = getOtherParticipant(chat);
                const isSelected = activeChat?._id === chat._id;
                const hasUnread = hasUnreadMessages(chat);
                
                return (
                  <div
                    key={chat._id}
                    onClick={() => handleChatSelect(chat)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '0.5rem',
                      backgroundColor: isSelected ? '#e3f2fd' : (hasUnread ? '#fff3cd' : '#f8f9fa'),
                      border: isSelected ? '2px solid #2196f3' : (hasUnread ? '2px solid #ffc107' : '1px solid #ddd'),
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = hasUnread ? '#fff8e1' : '#f0f0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = hasUnread ? '#fff3cd' : '#f8f9fa';
                      }
                    }}
                  >
                    {/* Unread indicator */}
                    {hasUnread && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#dc3545',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }} />
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <strong>{otherUser?.username}</strong>
                          {otherUser?.isOnline && (
                            <span style={{ color: '#28a745', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                              • Online
                            </span>
                          )}
                          {hasUnread && (
                            <span style={{ 
                              backgroundColor: '#dc3545', 
                              color: 'white', 
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '10px',
                              marginLeft: '0.5rem'
                            }}>
                              New
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>
                          📋 {chat.taskId?.title}
                        </div>
                        {chat.lastMessage && (
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: hasUnread ? '#856404' : '#999', 
                            marginTop: '0.25rem',
                            fontWeight: hasUnread ? 'bold' : 'normal'
                          }}>
                            {chat.lastMessage.content?.length > 50 
                              ? chat.lastMessage.content.substring(0, 50) + '...'
                              : chat.lastMessage.content}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginLeft: '1rem' }}>
                        {formatLastActivity(chat.lastActivity)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Window */}
        <ChatWindow 
          chat={activeChat} 
          onClose={handleCloseChat}
        />
      </div>

      {/* Chat Tips */}
      <div className="card mt-2" style={{ padding: '1rem', backgroundColor: '#f8f9fa' }}>
        <h4>💡 Chat Tips:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>Communication:</strong>
            <ul style={{ marginLeft: '1rem', color: '#666', margin: '0.5rem 0 0 1rem' }}>
              <li>Chats are automatically created when tasks are accepted</li>
              <li>Use chat to coordinate task details and timing</li>
              <li>Be respectful and professional in all communications</li>
            </ul>
          </div>
          <div>
            <strong>Notifications:</strong>
            <ul style={{ marginLeft: '1rem', color: '#666', margin: '0.5rem 0 0 1rem' }}>
              <li>You'll see a red dot for new messages</li>
              <li>Notifications disappear when you view the chat</li>
              <li>You can see when the other person is online</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatPage;