import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogger } from '../../hooks/useLogger';

const PerformanceChart = ({ data, timeRange, detailed = false }) => {
  const logger = useLogger('PerformanceChart');
  const [chartType, setChartType] = useState('line');
  const [selectedMetrics, setSelectedMetrics] = useState(['rating', 'completedTasks']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    logger.debug('PerformanceChart rendered', { 
      hasData: !!data, 
      timeRange, 
      detailed,
      chartType 
    });
  }, [data, timeRange, detailed, chartType, logger]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data || !data.timeline) {
      logger.warn('No timeline data provided to PerformanceChart');
      return [];
    }

    try {
      const processedData = data.timeline.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        fullDate: item.date,
        rating: parseFloat((item.rating || 0).toFixed(2)),
        completedTasks: item.completedTasks || 0,
        credits: item.credits || 0,
        applications: item.applications || 0,
        successRate: parseFloat((item.successRate || 0).toFixed(1)),
        earnings: item.earnings || 0,
        tasks: item.tasks || 0
      }));

      logger.debug('Chart data processed', { 
        originalLength: data.timeline.length,
        processedLength: processedData.length 
      });

      return processedData;

    } catch (error) {
      logger.error('Error processing chart data', { 
        error: error.message,
        data: data?.timeline?.length || 0 
      });
      setError('Failed to process chart data');
      return [];
    }
  }, [data, logger]);

  // Chart configuration
  const chartConfig = useMemo(() => {
    const colors = [
      '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', 
      '#F44336', '#00BCD4', '#CDDC39', '#FF5722'
    ];

    const metrics = [
      { 
        key: 'rating', 
        name: 'Rating', 
        color: colors[0], 
        type: 'line',
        yAxisId: 'left',
        domain: [0, 5]
      },
      { 
        key: 'completedTasks', 
        name: 'Completed Tasks', 
        color: colors[1], 
        type: 'bar',
        yAxisId: 'right'
      },
      { 
        key: 'credits', 
        name: 'Credits', 
        color: colors[2], 
        type: 'area',
        yAxisId: 'right'
      },
      { 
        key: 'applications', 
        name: 'Applications', 
        color: colors[3], 
        type: 'line',
        yAxisId: 'right'
      },
      { 
        key: 'successRate', 
        name: 'Success Rate (%)', 
        color: colors[4], 
        type: 'line',
        yAxisId: 'left',
        domain: [0, 100]
      },
      { 
        key: 'earnings', 
        name: 'Earnings', 
        color: colors[5], 
        type: 'area',
        yAxisId: 'right'
      },
      { 
        key: 'tasks', 
        name: 'Tasks Posted', 
        color: colors[6], 
        type: 'bar',
        yAxisId: 'right'
      }
    ];

    return metrics.filter(metric => selectedMetrics.includes(metric.key));
  }, [selectedMetrics]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{`Date: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  };

  // Handle metric selection
  const toggleMetric = (metricKey) => {
    setSelectedMetrics(prev => {
      const newSelection = prev.includes(metricKey)
        ? prev.filter(key => key !== metricKey)
        : [...prev, metricKey];
      
      logger.logInteraction('metric_toggled', metricKey, { 
        selected: !prev.includes(metricKey),
        currentSelection: newSelection 
      });

      return newSelection;
    });
  };

  // Export chart
  const exportChart = async (format = 'png') => {
    try {
      setIsLoading(true);
      logger.info('Exporting chart', { format, chartType, selectedMetrics });

      // This would typically use a library like html2canvas
      // For now, we'll just log the action
      logger.logInteraction('chart_exported', 'performance_chart', { 
        format, 
        chartType, 
        metrics: selectedMetrics.length 
      });

      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.error('Chart export failed', { error: error.message, format });
      setError('Failed to export chart');
    } finally {
      setIsLoading(false);
    }
  };

  // Render chart based on type
  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="chart-empty">
          <p>📊 No data available for the selected time range</p>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartConfig.map((metric, index) => (
              <Area
                key={metric.key}
                yAxisId={metric.yAxisId}
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                fill={metric.color}
                fillOpacity={0.3}
                name={metric.name}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartConfig.map((metric, index) => (
              <Bar
                key={metric.key}
                yAxisId={metric.yAxisId}
                dataKey={metric.key}
                fill={metric.color}
                name={metric.name}
              />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartConfig.map((metric, index) => (
              <Line
                key={metric.key}
                yAxisId={metric.yAxisId}
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                name={metric.name}
              />
            ))}
          </LineChart>
        );
    }
  };

  if (error) {
    return (
      <div className="performance-chart-error">
        <h3>📊 Performance Chart</h3>
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
      className={`performance-chart ${detailed ? 'detailed' : ''}`}
    >
      <div className="chart-header">
        <h3>📊 Performance Trends</h3>
        <div className="chart-controls">
          {/* Chart Type Selector */}
          <div className="chart-type-selector">
            <label>Chart Type:</label>
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value)}
              className="chart-select"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={() => exportChart('png')}
            disabled={isLoading}
            className="export-btn"
            title="Export Chart"
          >
            {isLoading ? '⏳' : '📥'}
          </button>
        </div>
      </div>

      {/* Metric Selection */}
      {detailed && (
        <div className="metric-selector">
          <h4>Select Metrics to Display:</h4>
          <div className="metric-options">
            {[
              { key: 'rating', label: '⭐ Rating' },
              { key: 'completedTasks', label: '✅ Completed Tasks' },
              { key: 'credits', label: '💰 Credits' },
              { key: 'applications', label: '📤 Applications' },
              { key: 'successRate', label: '🎯 Success Rate' },
              { key: 'earnings', label: '💎 Earnings' },
              { key: 'tasks', label: '📝 Tasks Posted' }
            ].map(metric => (
              <label key={metric.key} className="metric-option">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.key)}
                  onChange={() => toggleMetric(metric.key)}
                />
                <span className="metric-label">{metric.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="chart-container" ref={chartRef}>
        <ResponsiveContainer width="100%" height={detailed ? 400 : 300}>
          <AnimatePresence mode="wait">
            <motion.div
              key={chartType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderChart()}
            </motion.div>
          </AnimatePresence>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      {detailed && chartData.length > 0 && (
        <div className="chart-summary">
          <h4>📈 Summary</h4>
          <div className="summary-stats">
            {chartConfig.map(metric => {
              const values = chartData.map(d => d[metric.key]).filter(v => v !== undefined);
              if (values.length === 0) return null;

              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              const max = Math.max(...values);
              const min = Math.min(...values);

              return (
                <div key={metric.key} className="summary-item">
                  <span className="summary-label" style={{ color: metric.color }}>
                    {metric.name}:
                  </span>
                  <div className="summary-values">
                    <span>Avg: {avg.toFixed(1)}</span>
                    <span>Max: {max}</span>
                    <span>Min: {min}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Chart Data</summary>
          <pre className="debug-content">
            {JSON.stringify({
              chartType,
              selectedMetrics,
              dataPoints: chartData.length,
              configuredMetrics: chartConfig.length,
              timeRange
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(PerformanceChart);