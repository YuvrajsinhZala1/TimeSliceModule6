import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useLogger } from '../../hooks/useLogger';

const DashboardStats = ({ data, timeRange, userRole }) => {
  const logger = useLogger('DashboardStats');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState(null);

  useEffect(() => {
    logger.debug('DashboardStats rendered', { 
      hasData: !!data, 
      timeRange, 
      userRole 
    });
  }, [data, timeRange, userRole, logger]);

  // Calculate statistics based on user role and data
  const stats = useMemo(() => {
    if (!data) {
      logger.warn('No data provided to DashboardStats');
      return [];
    }

    try {
      const baseStats = [
        {
          id: 'credits',
          title: 'Available Credits',
          value: data.credits || 0,
          change: data.creditsChange || 0,
          icon: '💰',
          color: '#4CAF50',
          description: 'Credits available for spending',
          format: 'number'
        },
        {
          id: 'rating',
          title: 'Your Rating',
          value: data.rating || 0,
          change: data.ratingChange || 0,
          icon: '⭐',
          color: '#FF9800',
          description: `Based on ${data.totalRatings || 0} reviews`,
          format: 'decimal',
          max: 5
        },
        {
          id: 'completedTasks',
          title: 'Tasks Completed',
          value: data.completedTasks || 0,
          change: data.completedTasksChange || 0,
          icon: userRole === 'helper' ? '🤝' : '📋',
          color: '#2196F3',
          description: userRole === 'helper' ? 'Tasks you helped with' : 'Tasks you created',
          format: 'number'
        }
      ];

      // Role-specific stats
      if (userRole === 'helper') {
        baseStats.push(
          {
            id: 'applicationsSubmitted',
            title: 'Applications Sent',
            value: data.applicationsSubmitted || 0,
            change: data.applicationsSubmittedChange || 0,
            icon: '📤',
            color: '#9C27B0',
            description: 'Applications submitted to tasks',
            format: 'number'
          },
          {
            id: 'applicationSuccessRate',
            title: 'Success Rate',
            value: data.applicationSuccessRate || 0,
            change: data.successRateChange || 0,
            icon: '🎯',
            color: '#4CAF50',
            description: 'Applications accepted vs sent',
            format: 'percentage'
          },
          {
            id: 'avgEarnings',
            title: 'Avg. Earnings',
            value: data.avgEarnings || 0,
            change: data.avgEarningsChange || 0,
            icon: '💎',
            color: '#673AB7',
            description: 'Average credits per completed task',
            format: 'number'
          }
        );
      } else {
        baseStats.push(
          {
            id: 'tasksCreated',
            title: 'Tasks Posted',
            value: data.tasksCreated || 0,
            change: data.tasksCreatedChange || 0,
            icon: '📝',
            color: '#FF5722',
            description: 'Total tasks you\'ve posted',
            format: 'number'
          },
          {
            id: 'applicationsReceived',
            title: 'Applications Received',
            value: data.applicationsReceived || 0,
            change: data.applicationsReceivedChange || 0,
            icon: '📥',
            color: '#607D8B',
            description: 'Applications from helpers',
            format: 'number'
          },
          {
            id: 'avgTaskValue',
            title: 'Avg. Task Value',
            value: data.avgTaskValue || 0,
            change: data.avgTaskValueChange || 0,
            icon: '💰',
            color: '#795548',
            description: 'Average credits per task',
            format: 'number'
          }
        );
      }

      logger.debug('Stats calculated', { 
        statsCount: baseStats.length,
        userRole,
        timeRange 
      });

      return baseStats;

    } catch (error) {
      logger.error('Error calculating stats', { 
        error: error.message,
        data,
        userRole 
      });
      return [];
    }
  }, [data, userRole, timeRange, logger]);

  // Format value based on type
  const formatValue = (value, format, max = null) => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'decimal':
        return value.toFixed(1);
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'number':
      default:
        return value;
    }
  };

  // Get change indicator
  const getChangeIndicator = (change) => {
    if (change === 0) return { icon: '➖', color: '#9E9E9E', text: 'No change' };
    if (change > 0) return { icon: '📈', color: '#4CAF50', text: `+${change}` };
    return { icon: '📉', color: '#F44336', text: `${change}` };
  };

  // Handle stat click for detailed view
  const handleStatClick = (stat) => {
    setSelectedMetric(selectedMetric?.id === stat.id ? null : stat);
    logger.logInteraction('stat_clicked', stat.id, { 
      statTitle: stat.title,
      statValue: stat.value 
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (!stats.length) {
    return (
      <div className="dashboard-stats-error">
        <h3>📊 Statistics</h3>
        <p>Unable to load statistics. Please refresh the page.</p>
      </div>
    );
  }

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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat, index) => {
          const changeInfo = getChangeIndicator(stat.change);
          const isSelected = selectedMetric?.id === stat.id;

          return (
            <motion.div
              key={stat.id}
              variants={statVariants}
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
                {animationEnabled ? (
                  <CountUp
                    end={stat.value}
                    decimals={stat.format === 'decimal' ? 1 : 0}
                    duration={1.5}
                    delay={index * 0.1}
                    suffix={stat.format === 'percentage' ? '%' : ''}
                  />
                ) : (
                  formatValue(stat.value, stat.format, stat.max)
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
                      initial={{ width: 0 }}
                      animate={{ width: `${(stat.value / stat.max) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
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
                        {formatValue(stat.value, stat.format, stat.max)}
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
                    {stat.trend && (
                      <div className="detail-item">
                        <span className="detail-label">Trend:</span>
                        <span className="detail-value">{stat.trend}</span>
                      </div>
                    )}
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

      {/* Debug Panel for Development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Stats Data</summary>
          <pre className="debug-content">
            {JSON.stringify({ 
              stats: stats.map(s => ({ id: s.id, value: s.value, change: s.change })),
              timeRange,
              userRole,
              selectedMetric: selectedMetric?.id 
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default React.memo(DashboardStats);