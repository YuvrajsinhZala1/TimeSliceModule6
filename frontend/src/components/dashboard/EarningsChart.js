import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { useLogger } from '../../hooks/useLogger';

const EarningsChart = ({ data, timeRange, detailed = false }) => {
  const logger = useLogger('EarningsChart');
  const [chartType, setChartType] = useState('area');
  const [viewMode, setViewMode] = useState('timeline'); // timeline, category, comparison
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    logger.debug('EarningsChart rendered', {
      hasData: !!data,
      timeRange,
      detailed,
      chartType,
      viewMode
    });
  }, [data, timeRange, detailed, chartType, viewMode, logger]);

  // Process earnings data for different chart types
  const chartData = useMemo(() => {
    if (!data) {
      logger.warn('No earnings data provided');
      return { timeline: [], category: [], summary: {} };
    }

    try {
      // Timeline data processing
      const timeline = data.transactions ? data.transactions.map(transaction => ({
        date: new Date(transaction.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        fullDate: transaction.date,
        amount: transaction.amount,
        task: transaction.taskTitle,
        skills: transaction.skills || [],
        cumulative: 0 // Will be calculated below
      })).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate)) : [];

      // Calculate cumulative earnings
      let cumulative = 0;
      timeline.forEach(item => {
        cumulative += item.amount;
        item.cumulative = cumulative;
      });

      // Category data processing
      const categoryData = data.byCategory ? Object.entries(data.byCategory).map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: data.total > 0 ? Math.round((amount / data.total) * 100) : 0
      })).sort((a, b) => b.value - a.value) : [];

      // Summary statistics
      const summary = {
        total: data.total || 0,
        average: data.average || 0,
        transactionCount: data.transactions?.length || 0,
        topCategory: categoryData[0]?.name || 'None',
        topCategoryAmount: categoryData[0]?.value || 0,
        growth: calculateGrowthRate(timeline),
        dailyAverage: timeline.length > 0 ? Math.round(data.total / Math.max(timeline.length, 1)) : 0
      };

      logger.debug('Earnings data processed', {
        timelinePoints: timeline.length,
        categories: categoryData.length,
        total: summary.total
      });

      return { timeline, category: categoryData, summary };

    } catch (error) {
      logger.error('Earnings data processing failed', {
        error: error.message,
        data: data ? Object.keys(data) : null
      });
      setError('Failed to process earnings data');
      return { timeline: [], category: [], summary: {} };
    }
  }, [data, logger]);

  // Calculate growth rate
  const calculateGrowthRate = useCallback((timeline) => {
    if (timeline.length < 2) return 0;

    const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
    const secondHalf = timeline.slice(Math.floor(timeline.length / 2));

    const firstHalfTotal = firstHalf.reduce((sum, item) => sum + item.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, item) => sum + item.amount, 0);

    if (firstHalfTotal === 0) return secondHalfTotal > 0 ? 100 : 0;
    return Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);
  }, []);

  // Custom tooltip components
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="earnings-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value} credits`}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="earnings-tooltip">
        <p className="tooltip-label">{data.name}</p>
        <p style={{ color: payload[0].color }}>
          {`Amount: ${data.value} credits (${data.percentage}%)`}
        </p>
      </div>
    );
  };

  // Handle chart type change
  const handleChartTypeChange = useCallback((newType) => {
    setChartType(newType);
    logger.logInteraction('earnings_chart_type_changed', newType, {
      previousType: chartType,
      viewMode
    });
  }, [chartType, viewMode, logger]);

  // Handle view mode change
  const handleViewModeChange = useCallback((newMode) => {
    setViewMode(newMode);
    logger.logInteraction('earnings_view_mode_changed', newMode, {
      previousMode: viewMode,
      chartType
    });
  }, [viewMode, chartType, logger]);

  // Export chart data
  const exportEarningsData = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('Exporting earnings data', { viewMode, chartType });

      const exportData = {
        summary: chartData.summary,
        timeline: chartData.timeline,
        categories: chartData.category,
        metadata: {
          timeRange,
          exportedAt: new Date().toISOString(),
          viewMode,
          chartType
        }
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `earnings-${timeRange}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      logger.logInteraction('earnings_data_exported', 'json', {
        dataSize: JSON.stringify(exportData).length,
        timeRange
      });

    } catch (error) {
      logger.error('Earnings export failed', { error: error.message });
      setError('Failed to export earnings data');
    } finally {
      setIsLoading(false);
    }
  }, [chartData, timeRange, viewMode, chartType, logger]);

  // Render timeline chart
  const renderTimelineChart = () => {
    if (chartData.timeline.length === 0) {
      return (
        <div className="chart-empty">
          <p>💰 No earnings data available for this time period</p>
        </div>
      );
    }

    const commonProps = {
      data: chartData.timeline,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#4CAF50"
              strokeWidth={3}
              dot={{ r: 5, fill: '#4CAF50' }}
              name="Daily Earnings"
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#2196F3"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              name="Cumulative Earnings"
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="amount"
              fill="#4CAF50"
              name="Daily Earnings"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#4CAF50"
              fill="#4CAF50"
              fillOpacity={0.3}
              name="Daily Earnings"
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#2196F3"
              fill="#2196F3"
              fillOpacity={0.1}
              name="Cumulative Earnings"
            />
          </AreaChart>
        );
    }
  };

  // Render category chart
  const renderCategoryChart = () => {
    if (chartData.category.length === 0) {
      return (
        <div className="chart-empty">
          <p>📊 No category data available</p>
        </div>
      );
    }

    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
      '#00BCD4', '#CDDC39', '#FF5722', '#607D8B', '#795548'
    ];

    return (
      <div className="category-chart-container">
        <div className="pie-chart">
          <PieChart width={300} height={300}>
            <Pie
              data={chartData.category}
              cx={150}
              cy={150}
              outerRadius={100}
              innerRadius={40}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.category.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </div>

        <div className="category-legend">
          {chartData.category.map((category, index) => (
            <div key={category.name} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="legend-text">
                <span className="legend-name">{category.name}</span>
                <span className="legend-value">
                  {category.value} credits ({category.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="earnings-chart-error">
        <h3>💰 Earnings Chart</h3>
        <p className="error-message">{error}</p>
        <button onClick={() => setError(null)} className="btn btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`earnings-chart ${detailed ? 'detailed' : ''}`}
    >
      {/* Header */}
      <div className="chart-header">
        <h3>💰 Earnings Analysis</h3>
        <div className="chart-controls">
          {/* View Mode Selector */}
          <div className="view-mode-selector">
            <button
              onClick={() => handleViewModeChange('timeline')}
              className={`mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            >
              📈 Timeline
            </button>
            <button
              onClick={() => handleViewModeChange('category')}
              className={`mode-btn ${viewMode === 'category' ? 'active' : ''}`}
            >
              📊 Categories
            </button>
          </div>

          {/* Chart Type Selector (for timeline view) */}
          {viewMode === 'timeline' && (
            <div className="chart-type-selector">
              <select
                value={chartType}
                onChange={(e) => handleChartTypeChange(e.target.value)}
                className="chart-select"
              >
                <option value="area">Area Chart</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={exportEarningsData}
            disabled={isLoading}
            className="export-btn"
            title="Export Earnings Data"
          >
            {isLoading ? '⏳' : '📥'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="earnings-summary">
        <div className="summary-grid">
          <div className="summary-item total">
            <span className="summary-label">Total Earnings</span>
            <span className="summary-value">
              <CountUp
                end={chartData.summary.total || 0}
                duration={1.5}
                separator=","
              /> credits
            </span>
          </div>
          
          <div className="summary-item average">
            <span className="summary-label">Average per Task</span>
            <span className="summary-value">
              <CountUp
                end={chartData.summary.average || 0}
                duration={1.5}
                decimals={1}
              /> credits
            </span>
          </div>
          
          <div className="summary-item growth">
            <span className="summary-label">Growth Rate</span>
            <span className={`summary-value ${chartData.summary.growth >= 0 ? 'positive' : 'negative'}`}>
              {chartData.summary.growth >= 0 ? '📈' : '📉'}
              {Math.abs(chartData.summary.growth)}%
            </span>
          </div>
          
          <div className="summary-item transactions">
            <span className="summary-label">Transactions</span>
            <span className="summary-value">
              {chartData.summary.transactionCount}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="chart-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${chartType}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ResponsiveContainer width="100%" height={detailed ? 400 : 300}>
              {viewMode === 'timeline' ? renderTimelineChart() : renderCategoryChart()}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Additional insights for detailed view */}
      {detailed && chartData.summary.total > 0 && (
        <div className="earnings-insights">
          <h4>💡 Insights</h4>
          <div className="insights-grid">
            <div className="insight-item">
              <span className="insight-icon">🏆</span>
              <div className="insight-content">
                <h5>Top Category</h5>
                <p>{chartData.summary.topCategory} ({chartData.summary.topCategoryAmount} credits)</p>
              </div>
            </div>
            
            <div className="insight-item">
              <span className="insight-icon">📅</span>
              <div className="insight-content">
                <h5>Daily Average</h5>
                <p>{chartData.summary.dailyAverage} credits per active day</p>
              </div>
            </div>
            
            <div className="insight-item">
              <span className="insight-icon">🎯</span>
              <div className="insight-content">
                <h5>Performance</h5>
                <p>
                  {chartData.summary.growth >= 0 
                    ? 'Earnings are trending upward!' 
                    : 'Consider focusing on higher-value tasks'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Earnings Chart</summary>
          <pre className="debug-content">
            {JSON.stringify({
              chartType,
              viewMode,
              dataPoints: chartData.timeline.length,
              categories: chartData.category.length,
              summary: chartData.summary,
              timeRange
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(EarningsChart);