import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLogger } from '../../hooks/useLogger';

const QuickActions = ({ userRole, unreadCount = 0, recentActivity = [] }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const logger = useLogger('QuickActions');
  const [expandedSection, setExpandedSection] = useState(null);
  const [customizing, setCustomizing] = useState(false);
  const [enabledActions, setEnabledActions] = useState(new Set([
    'browse_tasks', 'create_task', 'view_messages', 'check_earnings', 
    'update_profile', 'view_applications'
  ]));

  // Define all available actions based on user role
  const allActions = useMemo(() => {
    const baseActions = [
      {
        id: 'view_messages',
        title: 'Messages',
        description: 'Check your conversations',
        icon: '💬',
        color: '#2196F3',
        badge: unreadCount > 0 ? unreadCount : null,
        urgency: unreadCount > 5 ? 'high' : unreadCount > 0 ? 'medium' : 'low',
        action: () => navigate('/messages'),
        category: 'communication'
      },
      {
        id: 'update_profile',
        title: 'Update Profile',
        description: 'Edit your profile and settings',
        icon: '👤',
        color: '#607D8B',
        urgency: 'low',
        action: () => navigate('/profile'),
        category: 'account'
      },
      {
        id: 'view_help',
        title: 'Help & Support',
        description: 'Get help and view guides',
        icon: '❓',
        color: '#9C27B0',
        urgency: 'low',
        action: () => navigate('/help'),
        category: 'support'
      }
    ];

    const helperActions = [
      {
        id: 'browse_tasks',
        title: 'Browse Tasks',
        description: 'Find new tasks to work on',
        icon: '🔍',
        color: '#4CAF50',
        urgency: 'medium',
        action: () => navigate('/tasks'),
        category: 'tasks'
      },
      {
        id: 'view_applications',
        title: 'My Applications',
        description: 'Check application status',
        icon: '📋',
        color: '#FF9800',
        urgency: 'medium',
        action: () => navigate('/applications'),
        category: 'tasks'
      },
      {
        id: 'check_earnings',
        title: 'Earnings',
        description: 'View your earnings and payments',
        icon: '💰',
        color: '#4CAF50',
        urgency: 'low',
        action: () => navigate('/earnings'),
        category: 'financial'
      },
      {
        id: 'skill_assessment',
        title: 'Skill Tests',
        description: 'Take tests to verify your skills',
        icon: '🎯',
        color: '#E91E63',
        urgency: 'low',
        action: () => navigate('/skills'),
        category: 'profile'
      }
    ];

    const providerActions = [
      {
        id: 'create_task',
        title: 'Post New Task',
        description: 'Create a new task for helpers',
        icon: '➕',
        color: '#2196F3',
        urgency: 'high',
        action: () => navigate('/tasks/create'),
        category: 'tasks'
      },
      {
        id: 'manage_tasks',
        title: 'Manage Tasks',
        description: 'View and manage your posted tasks',
        icon: '📊',
        color: '#FF9800',
        urgency: 'medium',
        action: () => navigate('/tasks/manage'),
        category: 'tasks'
      },
      {
        id: 'review_applications',
        title: 'Review Applications',
        description: 'Check applications for your tasks',
        icon: '📥',
        color: '#9C27B0',
        urgency: 'high',
        action: () => navigate('/applications/received'),
        category: 'tasks'
      },
      {
        id: 'view_spending',
        title: 'Spending',
        description: 'Track your credit usage',
        icon: '💳',
        color: '#F44336',
        urgency: 'low',
        action: () => navigate('/spending'),
        category: 'financial'
      }
    ];

    const roleBasedActions = userRole === 'helper' ? helperActions : providerActions;
    return [...baseActions, ...roleBasedActions];
  }, [userRole, unreadCount, navigate]);

  // Filter enabled actions
  const enabledActionsList = useMemo(() => {
    return allActions.filter(action => enabledActions.has(action.id));
  }, [allActions, enabledActions]);

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    const grouped = {};
    enabledActionsList.forEach(action => {
      if (!grouped[action.category]) {
        grouped[action.category] = [];
      }
      grouped[action.category].push(action);
    });
    return grouped;
  }, [enabledActionsList]);

  // Handle action click
  const handleActionClick = useCallback((action) => {
    try {
      logger.logInteraction('quick_action_clicked', action.id, {
        actionTitle: action.title,
        userRole,
        urgency: action.urgency
      });

      action.action();
    } catch (error) {
      logger.error('Quick action failed', {
        error: error.message,
        actionId: action.id,
        actionTitle: action.title
      });
    }
  }, [logger, userRole]);

  // Toggle action enabled state
  const toggleAction = useCallback((actionId) => {
    setEnabledActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      
      logger.logInteraction('quick_action_toggled', actionId, {
        enabled: newSet.has(actionId),
        totalEnabled: newSet.size
      });
      
      return newSet;
    });
  }, [logger]);

  // Get personalized recommendations
  const getRecommendations = useCallback(() => {
    const recommendations = [];

    // Based on recent activity
    const hasRecentApplications = recentActivity.some(
      activity => activity.type === 'application' && 
      Date.now() - new Date(activity.createdAt).getTime() < 24 * 60 * 60 * 1000
    );

    if (!hasRecentApplications && userRole === 'helper') {
      recommendations.push({
        id: 'browse_tasks',
        reason: 'No recent applications - browse new tasks!'
      });
    }

    // Based on user profile completeness
    if (currentUser && (!currentUser.bio || !currentUser.skills?.length)) {
      recommendations.push({
        id: 'update_profile',
        reason: 'Complete your profile to get better matches'
      });
    }

    // Based on messages
    if (unreadCount > 0) {
      recommendations.push({
        id: 'view_messages',
        reason: `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
      });
    }

    return recommendations;
  }, [recentActivity, userRole, currentUser, unreadCount]);

  const recommendations = getRecommendations();

  // Render action button
  const renderActionButton = (action, index) => (
    <motion.button
      key={action.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleActionClick(action)}
      className={`quick-action-btn ${action.urgency}`}
      style={{ borderLeft: `4px solid ${action.color}` }}
    >
      <div className="action-icon-container">
        <span className="action-icon" style={{ color: action.color }}>
          {action.icon}
        </span>
        {action.badge && (
          <span className="action-badge">{action.badge}</span>
        )}
      </div>
      
      <div className="action-content">
        <h4 className="action-title">{action.title}</h4>
        <p className="action-description">{action.description}</p>
      </div>
      
      <div className="action-arrow">→</div>
    </motion.button>
  );

  // Render category section
  const renderCategorySection = (category, actions) => (
    <motion.div
      key={category}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="action-category"
    >
      <button
        onClick={() => setExpandedSection(
          expandedSection === category ? null : category
        )}
        className="category-header"
      >
        <span className="category-title">
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </span>
        <span className="category-count">({actions.length})</span>
        <span className={`category-toggle ${expandedSection === category ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      
      {(!expandedSection || expandedSection === category) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="category-actions"
        >
          {actions.map((action, index) => renderActionButton(action, index))}
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="quick-actions"
    >
      <div className="quick-actions-header">
        <h3>⚡ Quick Actions</h3>
        <div className="header-controls">
          <button
            onClick={() => setCustomizing(!customizing)}
            className={`customize-btn ${customizing ? 'active' : ''}`}
            title="Customize actions"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="recommendations"
        >
          <h4>💡 Recommended for you:</h4>
          {recommendations.map((rec, index) => {
            const action = allActions.find(a => a.id === rec.id);
            if (!action) return null;
            
            return (
              <div key={rec.id} className="recommendation-item">
                <button
                  onClick={() => handleActionClick(action)}
                  className="recommendation-btn"
                >
                  <span className="rec-icon">{action.icon}</span>
                  <div className="rec-content">
                    <span className="rec-title">{action.title}</span>
                    <span className="rec-reason">{rec.reason}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Customization Panel */}
      {customizing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="customization-panel"
        >
          <h4>🎛️ Customize Quick Actions</h4>
          <p>Select which actions to show:</p>
          <div className="action-toggles">
            {allActions.map(action => (
              <label key={action.id} className="action-toggle">
                <input
                  type="checkbox"
                  checked={enabledActions.has(action.id)}
                  onChange={() => toggleAction(action.id)}
                />
                <span className="toggle-icon">{action.icon}</span>
                <span className="toggle-title">{action.title}</span>
              </label>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions Grid */}
      <div className="actions-container">
        {Object.keys(actionsByCategory).length > 1 ? (
          // Categorized view
          <div className="categorized-actions">
            {Object.entries(actionsByCategory).map(([category, actions]) =>
              renderCategorySection(category, actions)
            )}
          </div>
        ) : (
          // Simple grid view
          <div className="actions-grid">
            {enabledActionsList.map((action, index) => 
              renderActionButton(action, index)
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-label">Active Actions:</span>
          <span className="stat-value">{enabledActions.size}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Role:</span>
          <span className="stat-value">
            {userRole === 'helper' ? '🤝 Helper' : '📋 Provider'}
          </span>
        </div>
        {unreadCount > 0 && (
          <div className="stat-item urgent">
            <span className="stat-label">Unread:</span>
            <span className="stat-value">{unreadCount} messages</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="quick-actions-footer">
        <p className="footer-text">
          💡 Tip: Actions are personalized based on your role and activity
        </p>
        {userRole === 'helper' && (
          <Link to="/tasks" className="browse-all-link">
            Browse All Tasks →
          </Link>
        )}
        {userRole === 'provider' && (
          <Link to="/tasks/create" className="create-task-link">
            Post New Task →
          </Link>
        )}
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Quick Actions</summary>
          <pre className="debug-content">
            {JSON.stringify({
              userRole,
              unreadCount,
              enabledActions: Array.from(enabledActions),
              totalActions: allActions.length,
              recommendations: recommendations.length,
              customizing,
              expandedSection
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(QuickActions);