import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { useLogger } from '../../hooks/useLogger';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeed = ({ 
  activities = [], 
  limit = 10, 
  showViewAll = false,
  showFilters = false,
  realTime = false
}) => {
  const logger = useLogger('ActivityFeed');
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(['all']);
  const [selectedActions, setSelectedActions] = useState(['all']);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Activity type configurations
  const activityConfig = {
    task: {
      icon: '📋',
      color: '#2196F3',
      actions: {
        created: { icon: '➕', label: 'Created' },
        assigned: { icon: '👥', label: 'Assigned' },
        completed: { icon: '✅', label: 'Completed' },
        cancelled: { icon: '❌', label: 'Cancelled' }
      }
    },
    application: {
      icon: '📤',
      color: '#9C27B0',
      actions: {
        submitted: { icon: '📨', label: 'Submitted' },
        received: { icon: '📥', label: 'Received' },
        accepted: { icon: '✅', label: 'Accepted' },
        rejected: { icon: '❌', label: 'Rejected' }
      }
    },
    booking: {
      icon: '📅',
      color: '#4CAF50',
      actions: {
        status_change: { icon: '🔄', label: 'Status Updated' },
        confirmed: { icon: '✅', label: 'Confirmed' },
        completed: { icon: '🎉', label: 'Completed' },
        cancelled: { icon: '❌', label: 'Cancelled' }
      }
    },
    message: {
      icon: '💬',
      color: '#FF9800',
      actions: {
        sent: { icon: '📤', label: 'Sent' },
        received: { icon: '📥', label: 'Received' }
      }
    },
    payment: {
      icon: '💰',
      color: '#4CAF50',
      actions: {
        earned: { icon: '💎', label: 'Earned' },
        spent: { icon: '💸', label: 'Spent' },
        refunded: { icon: '🔄', label: 'Refunded' }
      }
    },
    profile: {
      icon: '👤',
      color: '#607D8B',
      actions: {
        updated: { icon: '✏️', label: 'Updated' },
        verified: { icon: '✅', label: 'Verified' }
      }
    }
  };

  // Initialize component
  useEffect(() => {
    logger.debug('ActivityFeed initialized', {
      activitiesCount: activities.length,
      limit,
      showFilters,
      realTime
    });
  }, [activities.length, limit, showFilters, realTime, logger]);

  // Filter activities based on selected criteria
  const filterActivities = useCallback(() => {
    try {
      let filtered = [...activities];

      // Filter by type
      if (!selectedTypes.includes('all')) {
        filtered = filtered.filter(activity => 
          selectedTypes.includes(activity.type)
        );
      }

      // Filter by action
      if (!selectedActions.includes('all')) {
        filtered = filtered.filter(activity => 
          selectedActions.includes(activity.action)
        );
      }

      // Filter by search term
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(activity =>
          activity.title.toLowerCase().includes(search) ||
          activity.description.toLowerCase().includes(search)
        );
      }

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply limit if not expanded
      if (!expanded && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      setFilteredActivities(filtered);

      logger.debug('Activities filtered', {
        original: activities.length,
        filtered: filtered.length,
        selectedTypes,
        selectedActions,
        searchTerm: searchTerm.substring(0, 20)
      });

    } catch (error) {
      logger.error('Activity filtering failed', {
        error: error.message,
        activitiesCount: activities.length
      });
      setFilteredActivities([]);
    }
  }, [activities, selectedTypes, selectedActions, searchTerm, expanded, limit, logger]);

  // Apply filters when dependencies change
  useEffect(() => {
    filterActivities();
  }, [filterActivities]);

  // Auto-scroll to top when new activities arrive
  useEffect(() => {
    if (realTime && autoScroll && listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [activities.length, realTime, autoScroll]);

  // Get unique activity types and actions for filters
  const availableTypes = useMemo(() => {
    const types = [...new Set(activities.map(a => a.type))];
    return types.filter(type => activityConfig[type]);
  }, [activities]);

  const availableActions = useMemo(() => {
    const actions = [...new Set(activities.map(a => a.action))];
    return actions;
  }, [activities]);

  // Handle filter changes
  const handleTypeFilter = useCallback((type) => {
    setSelectedTypes(prev => {
      if (type === 'all') {
        return ['all'];
      }
      
      const newSelection = prev.includes('all') 
        ? [type]
        : prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev.filter(t => t !== 'all'), type];
      
      if (newSelection.length === 0) {
        return ['all'];
      }
      
      logger.logInteraction('activity_filter_type', type, { 
        newSelection 
      });
      
      return newSelection;
    });
  }, [logger]);

  const handleActionFilter = useCallback((action) => {
    setSelectedActions(prev => {
      if (action === 'all') {
        return ['all'];
      }
      
      const newSelection = prev.includes('all') 
        ? [action]
        : prev.includes(action)
          ? prev.filter(a => a !== action)
          : [...prev.filter(a => a !== 'all'), action];
      
      if (newSelection.length === 0) {
        return ['all'];
      }
      
      logger.logInteraction('activity_filter_action', action, { 
        newSelection 
      });
      
      return newSelection;
    });
  }, [logger]);

  // Handle search
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    logger.logInteraction('activity_search', 'search_term', { 
      searchLength: term.length 
    });
  }, [logger]);

  // Toggle expanded view
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
    logger.logInteraction('activity_expand', 'toggle', { 
      expanded: !expanded 
    });
  }, [expanded, logger]);

  // Activity item component
  const ActivityItem = React.memo(({ index, style }) => {
    const activity = filteredActivities[index];
    if (!activity) return null;

    const config = activityConfig[activity.type];
    const actionConfig = config?.actions[activity.action];

    return (
      <motion.div
        style={style}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="activity-item"
      >
        <div className="activity-icon" style={{ backgroundColor: config?.color }}>
          <span className="type-icon">{config?.icon}</span>
          <span className="action-icon">{actionConfig?.icon}</span>
        </div>
        
        <div className="activity-content">
          <div className="activity-header">
            <h4 className="activity-title">{activity.title}</h4>
            <span className="activity-time">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <p className="activity-description">{activity.description}</p>
          
          {activity.metadata && (
            <div className="activity-metadata">
              {activity.metadata.credits && (
                <span className="metadata-item credits">
                  💰 {activity.metadata.credits} credits
                </span>
              )}
              {activity.metadata.status && (
                <span className={`metadata-item status ${activity.metadata.status}`}>
                  🔹 {activity.metadata.status}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  });

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="activity-feed empty">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No Recent Activity</h3>
          <p>Your activity will appear here as you use TimeSlice</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`activity-feed ${expanded ? 'expanded' : ''}`}
    >
      {/* Header */}
      <div className="activity-header">
        <h3>
          🔔 Recent Activity
          {filteredActivities.length > 0 && (
            <span className="activity-count">({filteredActivities.length})</span>
          )}
        </h3>
        
        <div className="activity-controls">
          {realTime && (
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`auto-scroll-btn ${autoScroll ? 'active' : ''}`}
              title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            >
              {autoScroll ? '📌' : '📍'}
            </button>
          )}
          
          {showViewAll && !expanded && filteredActivities.length >= limit && (
            <button onClick={toggleExpanded} className="view-all-btn">
              View All ({activities.length})
            </button>
          )}
          
          {expanded && (
            <button onClick={toggleExpanded} className="collapse-btn">
              Collapse
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="activity-filters"
        >
          {/* Search */}
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Type filters */}
          <div className="filter-group">
            <label>Types:</label>
            <div className="filter-options">
              <button
                onClick={() => handleTypeFilter('all')}
                className={`filter-btn ${selectedTypes.includes('all') ? 'active' : ''}`}
              >
                All
              </button>
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeFilter(type)}
                  className={`filter-btn ${selectedTypes.includes(type) ? 'active' : ''}`}
                  style={{ borderColor: activityConfig[type]?.color }}
                >
                  {activityConfig[type]?.icon} {type}
                </button>
              ))}
            </div>
          </div>

          {/* Action filters */}
          <div className="filter-group">
            <label>Actions:</label>
            <div className="filter-options">
              <button
                onClick={() => handleActionFilter('all')}
                className={`filter-btn ${selectedActions.includes('all') ? 'active' : ''}`}
              >
                All
              </button>
              {availableActions.slice(0, 5).map(action => (
                <button
                  key={action}
                  onClick={() => handleActionFilter(action)}
                  className={`filter-btn ${selectedActions.includes(action) ? 'active' : ''}`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Activity List */}
      <div className="activity-list-container">
        {filteredActivities.length > 0 ? (
          <List
            ref={listRef}
            height={expanded ? 600 : Math.min(filteredActivities.length * 100, 400)}
            itemCount={filteredActivities.length}
            itemSize={100}
            className="activity-list"
          >
            {ActivityItem}
          </List>
        ) : (
          <div className="no-results">
            <span className="no-results-icon">🔍</span>
            <p>No activities match your filters</p>
            <button
              onClick={() => {
                setSelectedTypes(['all']);
                setSelectedActions(['all']);
                setSearchTerm('');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="activity-footer">
        <div className="activity-stats">
          <span className="stat-item">
            Total: {activities.length}
          </span>
          {searchTerm && (
            <span className="stat-item">
              Found: {filteredActivities.length}
            </span>
          )}
          <span className="stat-item">
            Types: {availableTypes.length}
          </span>
        </div>
        
        {realTime && (
          <div className="real-time-indicator">
            <span className="pulse-dot"></span>
            Live
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Activity Feed</summary>
          <pre className="debug-content">
            {JSON.stringify({
              totalActivities: activities.length,
              filteredActivities: filteredActivities.length,
              selectedTypes,
              selectedActions,
              searchTerm: searchTerm.substring(0, 20),
              expanded,
              realTime,
              autoScroll
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(ActivityFeed);