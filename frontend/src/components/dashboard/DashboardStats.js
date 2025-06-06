import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useLogger } from '../../hooks/useLogger';

const DashboardStats = ({ data, timeRange = '7d', userRole = 'helper' }) => {
  const logger = useLogger('DashboardStats');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const renderCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Prevent infinite re-renders
  useEffect(() => {
    renderCountRef.current += 1;
    if (renderCountRef.current > 20) {
      console.warn('DashboardStats: Too many renders detected, disabling animations');
      setAnimationEnabled(false);
    }
  });

  // Stable logging with limited frequency
  useEffect(() => {
    if (renderCountRef.current <= 5) {
      logger.debug('DashboardStats rendered', { 
        hasData: !!data, 
        timeRange, 
        userRole,
        renderCount: renderCountRef.current
      });
    }
  }, [data, timeRange, userRole, logger]);

  // Memoized stats calculation with stable dependencies
  const stats = useMemo(() => {
    if (!data) {
      return [];
    }

    try {
      const baseStats = [
        {
          id: 'credits',
          title: 'Available Credits',
          value: data.creditsEarned || data.credits || 0,
          change: data.creditsChange || 0,
          icon: '💰',
          color: '#4CAF50',
          description: 'Credits available for spending',
          format: 'number'
        },
        {
          id: 'rating',
          title: 'Your Rating',
          value: data.avgRating || data.rating || 0,
          change: data.ratingChange || 0,
          icon: '⭐',
          color: '#FF9800',
          description: `Based on reviews`,
          format: 'decimal',
          max: 5
        },
        {
          id: 'completedTasks',
          title: 'Tasks Completed',
          value: data.completedTasks || data.totalTasks || 0,
          change: data.completedTasksChange || 0,
          icon: userRole === 'helper' ? '🤝' : '📋',
          color: '#2196F3',
          description: userRole === 'helper' ? 'Tasks you helped with' : 'Tasks you created',
          format: 'number'
        }
      ];

      // Role-specific stats with stable logic
      if (userRole === 'helper') {
        baseStats.push({
          id: 'applicationSuccessRate',
          title: 'Success Rate',
          value: data.applicationSuccessRate || 0,
          change: data.successRateChange || 0,
          icon: '🎯',
          color: '#4CAF50',
          description: 'Applications accepted vs sent',
          format: 'percentage'
        });
      } else {
        baseStats.push({
          id: 'tasksCreated',
          title: 'Tasks Posted',
          value: data.tasksCreated || 0,
          change: data.tasksCreatedChange || 0,
          icon: '📝',
          color: '#FF5722',
          description: 'Total tasks you\'ve posted',
          format: 'number'
        });
      }

      return baseStats;

    } catch (error) {
      logger.error('Error calculating stats', { error: error.message });
      return [];
    }
  }, [data, userRole, logger]);

  // Stable format value function
  const formatValue = useCallback((value, format) => {
    switch (format) {
      case 'percentage':
        return `${Math.round(value)}%`;
      case 'decimal':
        return Number(value).toFixed(1);
      case 'currency':
        return `$${Number(value).toFixed(2)}`;
      case 'number':
      default:
        return Math.round(value);
    }
  }, []);

  // Stable change indicator function
  const getChangeIndicator = useCallback((change) => {
    const numChange = Number(change) || 0;
    if (numChange === 0) return { icon: '➖', color: '#9E9E9E', text: 'No change' };
    if (numChange > 0) return { icon: '📈', color: '#4CAF50', text: `+${numChange}` };
    return { icon: '📉', color: '#F44336', text: `${numChange}` };
  }, []);

  // Stable stat click handler
  const handleStatClick = useCallback((stat) => {
    if (!mountedRef.current) return;
    
    setSelectedMetric(prev => prev?.id === stat.id ? null : stat);
    logger.logInteraction('stat_clicked', stat.id, { 
      statTitle: stat.title,
      statValue: stat.value 
    });
  }, [logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Early return for no stats
  if (!stats.length) {
    return (
      <div className="dashboard-stats-error">
        <h3>📊 Statistics</h3>
        <p>Unable to load statistics. Please refresh the page.</p>
      </div>
    );
  }

  // Stable animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="dashboard-stats">
      <div className="stats-header">
        <h3>📊 Key Statistics</h3>
        <div className="stats-controls">
          <span className="time-range-indicator">
            {timeRange === '1d' ? 'Last 24 Hours' :
             timeRange === '7d' ? 'Last 7 Days' :
             timeRange === '30d' ? 'Last 30 Days' :
             timeRange === '90d' ? 'Last 90 Days' : 'Current Period'}
          </span>
          <button
            onClick={() => setAnimationEnabled(!animationEnabled)}
            className="animation-toggle"
            title={animationEnabled ? 'Disable animations' : 'Enable animations'}
          >
            {animationEnabled ? '🎬' : '⏸️'}
          </button>
        </div>
      </div>

      <motion.div
        className="stats-grid"
        variants={animationEnabled ? containerVariants : {}}
        initial={animationEnabled ? "hidden" : false}
        animate={animationEnabled ? "visible" : false}
      >
        {stats.map((stat, index) => {
          const changeInfo = getChangeIndicator(stat.change);
          const isSelected = selectedMetric?.id === stat.id;

          return (
            <motion.div
              key={stat.id}
              variants={animationEnabled ? statVariants : {}}
              className={`stat-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleStatClick(stat)}
              whileHover={animationEnabled ? { 
                scale: 1.02, 
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
              } : {}}
              whileTap={animationEnabled ? { scale: 0.98 } : {}}
              style={{
                borderLeft: `4px solid ${stat.color}`,
                cursor: 'pointer'
              }}
            >
              <div className="stat-header">
                <div className="stat-icon" style={{ color: stat.color }}>
                  {stat.icon}
                </div>
                <div className="stat-title">
                  {stat.title}
                </div>
                <div className="stat-change" style={{ color: changeInfo.color }}>
                  <span className="change-icon">{changeInfo.icon}</span>
                  <span className="change-text">{changeInfo.text}</span>
                </div>
              </div>

              <div className="stat-value">
                {animationEnabled && renderCountRef.current <= 5 ? (
                  <CountUp
                    end={stat.value}
                    decimals={stat.format === 'decimal' ? 1 : 0}
                    duration={1.5}
                    delay={index * 0.1}
                    suffix={stat.format === 'percentage' ? '%' : ''}
                  />
                ) : (
                  formatValue(stat.value, stat.format)
                )}
              </div>

              <div className="stat-description">
                {stat.description}
              </div>

              {stat.max && (
                <div className="stat-progress">
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      style={{ backgroundColor: stat.color }}
                      initial={animationEnabled ? { width: 0 } : { width: `${(stat.value / stat.max) * 100}%` }}
                      animate={{ width: `${(stat.value / stat.max) * 100}%` }}
                      transition={animationEnabled ? { duration: 1, delay: index * 0.1 } : {}}
                    />
                  </div>
                  <span className="progress-text">
                    {stat.value} / {stat.max}
                  </span>
                </div>
              )}

              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="stat-details"
                >
                  <h4>📈 Detailed View</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Current Value:</span>
                      <span className="detail-value">
                        {formatValue(stat.value, stat.format)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Change:</span>
                      <span className="detail-value" style={{ color: changeInfo.color }}>
                        {changeInfo.text}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time Range:</span>
                      <span className="detail-value">{timeRange}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {selectedMetric && (
        <div className="stats-footer">
          <p className="selection-info">
            💡 Click on another stat to compare, or click again to close details.
          </p>
        </div>
      )}

      {/* Render count warning for development */}
      {process.env.NODE_ENV === 'development' && renderCountRef.current > 10 && (
        <div className="render-warning">
          ⚠️ High render count: {renderCountRef.current}
        </div>
      )}
    </div>
  );
};

export default React.memo(DashboardStats);