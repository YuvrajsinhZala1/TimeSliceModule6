import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { useLogger } from '../../hooks/useLogger';

const SuccessMetrics = ({ data, timeRange }) => {
  const logger = useLogger('SuccessMetrics');
  const [selectedMetric, setSelectedMetric] = useState('successRate');
  const [benchmarkView, setBenchmarkView] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    logger.debug('SuccessMetrics rendered', {
      hasData: !!data,
      timeRange,
      selectedMetric,
      benchmarkView
    });
  }, [data, timeRange, selectedMetric, benchmarkView, logger]);

  // Calculate success metrics
  const metrics = useMemo(() => {
    if (!data) {
      logger.warn('No data provided to SuccessMetrics');
      return {
        current: {},
        trends: [],
        benchmarks: {},
        goals: {},
        insights: []
      };
    }

    try {
      // Current metrics
      const current = {
        successRate: data.applicationSuccessRate || 0,
        completionRate: data.taskCompletionRate || 100,
        rating: data.rating || 0,
        responseTime: data.responseTime || 0,
        clientRetention: data.clientRetention || 0,
        earnings: data.creditsEarned || 0,
        efficiency: data.efficiency || 0,
        reliability: data.reliability || 0
      };

      // Trend data (simulated based on timeRange)
      const trends = [];
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Simulate trend data with some variation
        const baseVariation = (Math.random() - 0.5) * 10;
        trends.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date.toISOString().split('T')[0],
          successRate: Math.max(0, Math.min(100, current.successRate + baseVariation)),
          completionRate: Math.max(0, Math.min(100, current.completionRate + baseVariation * 0.5)),
          rating: Math.max(0, Math.min(5, current.rating + (baseVariation * 0.1))),
          responseTime: Math.max(0, current.responseTime + (baseVariation * 0.5)),
          efficiency: Math.max(0, Math.min(100, current.efficiency + baseVariation * 0.8))
        });
      }

      // Platform benchmarks (would come from API in real implementation)
      const benchmarks = {
        successRate: 65,
        completionRate: 85,
        rating: 4.2,
        responseTime: 3.5,
        efficiency: 75
      };

      // Goals (would be user-defined)
      const goals = {
        successRate: { target: 80, current: current.successRate },
        completionRate: { target: 95, current: current.completionRate },
        rating: { target: 4.5, current: current.rating },
        responseTime: { target: 2, current: current.responseTime },
        efficiency: { target: 85, current: current.efficiency }
      };

      // Generate insights
      const insights = [];
      
      if (current.successRate > benchmarks.successRate) {
        insights.push({
          type: 'positive',
          metric: 'Success Rate',
          message: `Your success rate (${current.successRate}%) is ${Math.round(current.successRate - benchmarks.successRate)}% above platform average!`,
          impact: 'high'
        });
      } else if (current.successRate < benchmarks.successRate - 10) {
        insights.push({
          type: 'improvement',
          metric: 'Success Rate',
          message: `Consider improving your application quality. You're ${Math.round(benchmarks.successRate - current.successRate)}% below average.`,
          impact: 'high',
          suggestions: [
            'Customize each application message',
            'Apply to tasks matching your skills closely',
            'Respond quickly to task postings'
          ]
        });
      }

      if (current.rating > benchmarks.rating) {
        insights.push({
          type: 'positive',
          metric: 'Rating',
          message: `Excellent rating of ${current.rating.toFixed(1)}! Keep up the great work.`,
          impact: 'medium'
        });
      }

      if (current.responseTime < benchmarks.responseTime) {
        insights.push({
          type: 'positive',
          metric: 'Response Time',
          message: `Your response time of ${current.responseTime.toFixed(1)} hours is faster than average!`,
          impact: 'medium'
        });
      }

      // Calculate trends
      if (trends.length >= 2) {
        const recent = trends.slice(-7); // Last 7 days
        const earlier = trends.slice(0, 7); // First 7 days
        
        const recentAvg = recent.reduce((sum, item) => sum + item.successRate, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, item) => sum + item.successRate, 0) / earlier.length;
        
        if (recentAvg > earlierAvg + 5) {
          insights.push({
            type: 'positive',
            metric: 'Trend',
            message: 'Your success rate is trending upward! Keep doing what you\'re doing.',
            impact: 'medium'
          });
        } else if (recentAvg < earlierAvg - 5) {
          insights.push({
            type: 'warning',
            metric: 'Trend',
            message: 'Your success rate has been declining recently. Consider reviewing your approach.',
            impact: 'high'
          });
        }
      }

      logger.debug('Success metrics calculated', {
        current,
        trendsCount: trends.length,
        insightsCount: insights.length
      });

      return { current, trends, benchmarks, goals, insights };

    } catch (error) {
      logger.error('Success metrics calculation failed', {
        error: error.message,
        data: data ? Object.keys(data) : null
      });
      return {
        current: {},
        trends: [],
        benchmarks: {},
        goals: {},
        insights: []
      };
    }
  }, [data, timeRange, logger]);

  // Handle metric selection
  const handleMetricSelect = useCallback((metric) => {
    setSelectedMetric(metric);
    logger.logInteraction('success_metric_selected', metric, {
      previousMetric: selectedMetric,
      benchmarkView
    });
  }, [selectedMetric, benchmarkView, logger]);

  // Get metric configuration
  const getMetricConfig = (metricKey) => {
    const configs = {
      successRate: {
        name: 'Success Rate',
        icon: '🎯',
        color: '#4CAF50',
        unit: '%',
        description: 'Applications accepted vs sent',
        goodThreshold: 70,
        excellentThreshold: 85
      },
      completionRate: {
        name: 'Completion Rate',
        icon: '✅',
        color: '#2196F3',
        unit: '%',
        description: 'Tasks completed vs assigned',
        goodThreshold: 85,
        excellentThreshold: 95
      },
      rating: {
        name: 'Average Rating',
        icon: '⭐',
        color: '#FF9800',
        unit: '',
        description: 'Client satisfaction rating',
        goodThreshold: 4.0,
        excellentThreshold: 4.5,
        max: 5
      },
      responseTime: {
        name: 'Response Time',
        icon: '⚡',
        color: '#9C27B0',
        unit: 'hrs',
        description: 'Average response time',
        goodThreshold: 4,
        excellentThreshold: 2,
        inverse: true // Lower is better
      },
      efficiency: {
        name: 'Efficiency Score',
        icon: '📈',
        color: '#00BCD4',
        unit: '%',
        description: 'Overall efficiency rating',
        goodThreshold: 75,
        excellentThreshold: 90
      }
    };
    return configs[metricKey] || configs.successRate;
  };

  // Get performance level
  const getPerformanceLevel = (value, config) => {
    if (config.inverse) {
      if (value <= config.excellentThreshold) return 'excellent';
      if (value <= config.goodThreshold) return 'good';
      return 'needs-improvement';
    } else {
      if (value >= config.excellentThreshold) return 'excellent';
      if (value >= config.goodThreshold) return 'good';
      return 'needs-improvement';
    }
  };

  // Render metric card
  const renderMetricCard = (metricKey, index) => {
    const config = getMetricConfig(metricKey);
    const value = metrics.current[metricKey] || 0;
    const benchmark = metrics.benchmarks[metricKey] || 0;
    const goal = metrics.goals[metricKey] || {};
    const level = getPerformanceLevel(value, config);

    const performanceColors = {
      excellent: '#4CAF50',
      good: '#FF9800',
      'needs-improvement': '#F44336'
    };

    return (
      <motion.div
        key={metricKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className={`metric-card ${selectedMetric === metricKey ? 'selected' : ''} ${level}`}
        onClick={() => handleMetricSelect(metricKey)}
        whileHover={animationsEnabled ? { scale: 1.02 } : {}}
      >
        <div className="metric-header">
          <span className="metric-icon" style={{ color: config.color }}>
            {config.icon}
          </span>
          <div className="metric-info">
            <h4>{config.name}</h4>
            <p>{config.description}</p>
          </div>
          <div className="performance-indicator" style={{ color: performanceColors[level] }}>
            {level === 'excellent' && '🟢'}
            {level === 'good' && '🟡'}
            {level === 'needs-improvement' && '🔴'}
          </div>
        </div>

        <div className="metric-value">
          {animationsEnabled ? (
            <CountUp
              end={value}
              decimals={metricKey === 'rating' ? 1 : 0}
              duration={1.5}
              delay={index * 0.1}
              suffix={config.unit}
            />
          ) : (
            `${metricKey === 'rating' ? value.toFixed(1) : Math.round(value)}${config.unit}`
          )}
        </div>

        {benchmarkView && (
          <div className="benchmark-comparison">
            <div className="comparison-item">
              <span className="comparison-label">Platform Average:</span>
              <span className="comparison-value">
                {metricKey === 'rating' ? benchmark.toFixed(1) : Math.round(benchmark)}{config.unit}
              </span>
            </div>
            <div className="comparison-item">
              <span className="comparison-label">Your Goal:</span>
              <span className="comparison-value">
                {metricKey === 'rating' ? goal.target?.toFixed(1) : Math.round(goal.target || 0)}{config.unit}
              </span>
            </div>
          </div>
        )}

        {goal.target && (
          <div className="goal-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{
                  width: `${Math.min((value / goal.target) * 100, 100)}%`,
                  backgroundColor: config.color
                }}
              />
            </div>
            <span className="progress-text">
              {Math.round((value / goal.target) * 100)}% of goal
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  // Render trend chart
  const renderTrendChart = () => {
    const config = getMetricConfig(selectedMetric);
    
    return (
      <div className="trend-chart">
        <div className="chart-header">
          <h4>📈 {config.name} Trend</h4>
          <div className="chart-controls">
            <button
              onClick={() => setBenchmarkView(!benchmarkView)}
              className={`benchmark-toggle ${benchmarkView ? 'active' : ''}`}
            >
              📊 Show Benchmarks
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={metrics.trends}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis domain={config.max ? [0, config.max] : ['auto', 'auto']} />
            <Tooltip 
              formatter={(value) => [
                `${metricKey === 'rating' ? value.toFixed(1) : Math.round(value)}${config.unit}`,
                config.name
              ]}
            />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke={config.color}
              fill={config.color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            {benchmarkView && (
              <Line
                type="monotone"
                dataKey={() => metrics.benchmarks[selectedMetric]}
                stroke="#64748B"
                strokeDasharray="5 5"
                strokeWidth={2}
                name="Platform Average"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render insights
  const renderInsights = () => (
    <div className="success-insights">
      <h4>💡 Performance Insights</h4>
      {metrics.insights.length === 0 ? (
        <p className="no-insights">Keep working to generate insights about your performance!</p>
      ) : (
        <div className="insights-list">
          {metrics.insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`insight-item ${insight.type} ${insight.impact}`}
            >
              <div className="insight-icon">
                {insight.type === 'positive' && '🎉'}
                {insight.type === 'improvement' && '💡'}
                {insight.type === 'warning' && '⚠️'}
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <span className="insight-metric">{insight.metric}</span>
                  <span className={`insight-impact ${insight.impact}`}>
                    {insight.impact === 'high' && '🔴 High Impact'}
                    {insight.impact === 'medium' && '🟡 Medium Impact'}
                    {insight.impact === 'low' && '🟢 Low Impact'}
                  </span>
                </div>
                <p className="insight-message">{insight.message}</p>
                {insight.suggestions && (
                  <ul className="insight-suggestions">
                    {insight.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  if (!data) {
    return (
      <div className="success-metrics empty">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h3>No Performance Data</h3>
          <p>Complete more tasks to see your success metrics</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="success-metrics"
    >
      <div className="metrics-header">
        <h3>🏆 Success Metrics</h3>
        <div className="header-controls">
          <button
            onClick={() => setAnimationsEnabled(!animationsEnabled)}
            className={`animation-toggle ${animationsEnabled ? 'active' : ''}`}
            title={animationsEnabled ? 'Disable animations' : 'Enable animations'}
          >
            {animationsEnabled ? '🎬' : '⏸️'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        {Object.keys(metrics.current).map((metricKey, index) => 
          renderMetricCard(metricKey, index)
        )}
      </div>

      {/* Trend Chart */}
      {metrics.trends.length > 0 && renderTrendChart()}

      {/* Insights */}
      {renderInsights()}

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Success Metrics</summary>
          <pre className="debug-content">
            {JSON.stringify({
              selectedMetric,
              benchmarkView,
              metricsCount: Object.keys(metrics.current).length,
              trendsCount: metrics.trends.length,
              insightsCount: metrics.insights.length,
              animationsEnabled
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(SuccessMetrics);