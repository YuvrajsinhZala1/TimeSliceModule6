// File: src/utils/chartUtils.js
import { format, parseISO, isValid } from 'date-fns';

/**
 * Chart utility functions for TimeSlice platform
 * Provides configuration, formatting, and styling for charts
 */

// Color schemes matching TimeSlice brand
export const COLORS = {
  primary: '#00D4FF',
  primaryLight: '#33DDFF',
  primaryDark: '#00B8E6',
  secondary: '#FF6B35',
  secondaryLight: '#FF8555',
  secondaryDark: '#E6501F',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
  background: '#0A0A0A',
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8B8',
  textMuted: '#888888',
  border: 'rgba(0, 212, 255, 0.2)',
  gradientPrimary: 'linear-gradient(135deg, #00D4FF 0%, #FF6B35 100%)'
};

// Professional color palettes for different chart types
export const COLOR_PALETTES = {
  earnings: [COLORS.primary, COLORS.primaryLight, COLORS.secondary, COLORS.secondaryLight],
  performance: [COLORS.success, COLORS.info, COLORS.warning, COLORS.primary],
  categories: [
    COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, 
    COLORS.info, COLORS.error, COLORS.primaryLight, COLORS.secondaryLight
  ],
  gradient: [
    'linear-gradient(135deg, #00D4FF 0%, #33DDFF 100%)',
    'linear-gradient(135deg, #FF6B35 0%, #FF8555 100%)',
    'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  ]
};

// Default chart configurations
export const DEFAULT_CHART_CONFIG = {
  margin: { top: 20, right: 30, left: 20, bottom: 5 },
  responsive: true,
  maintainAspectRatio: false,
  grid: {
    stroke: 'rgba(0, 212, 255, 0.1)',
    strokeWidth: 1
  },
  axes: {
    tick: {
      fill: COLORS.textSecondary,
      fontSize: 12,
      fontFamily: 'Inter, sans-serif'
    },
    line: {
      stroke: COLORS.border,
      strokeWidth: 1
    }
  },
  tooltip: {
    backgroundColor: COLORS.backgroundSecondary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    padding: 12
  }
};

// Line chart configurations
export const getLineChartConfig = (customConfig = {}) => ({
  ...DEFAULT_CHART_CONFIG,
  strokeWidth: 3,
  dot: {
    r: 6,
    fill: COLORS.primary,
    stroke: COLORS.background,
    strokeWidth: 2
  },
  activeDot: {
    r: 8,
    fill: COLORS.secondary,
    stroke: COLORS.background,
    strokeWidth: 3,
    filter: 'drop-shadow(0 4px 8px rgba(255, 107, 53, 0.3))'
  },
  area: {
    fill: 'url(#colorGradient)',
    fillOpacity: 0.1
  },
  ...customConfig
});

// Bar chart configurations
export const getBarChartConfig = (customConfig = {}) => ({
  ...DEFAULT_CHART_CONFIG,
  bar: {
    fill: COLORS.primary,
    radius: [4, 4, 0, 0],
    maxBarSize: 60
  },
  ...customConfig
});

// Area chart configurations
export const getAreaChartConfig = (customConfig = {}) => ({
  ...DEFAULT_CHART_CONFIG,
  area: {
    fill: 'url(#colorGradient)',
    fillOpacity: 0.2,
    stroke: COLORS.primary,
    strokeWidth: 2
  },
  ...customConfig
});

// Pie chart configurations
export const getPieChartConfig = (customConfig = {}) => ({
  cx: '50%',
  cy: '50%',
  innerRadius: 60,
  outerRadius: 120,
  paddingAngle: 2,
  dataKey: 'value',
  label: true,
  labelLine: false,
  ...customConfig
});

// Donut chart configurations
export const getDonutChartConfig = (customConfig = {}) => ({
  ...getPieChartConfig(),
  innerRadius: 80,
  outerRadius: 140,
  ...customConfig
});

// Data formatting utilities
export const formatChartData = (data, type = 'line') => {
  if (!Array.isArray(data)) return [];

  switch (type) {
    case 'line':
    case 'area':
      return formatTimeSeriesData(data);
    case 'bar':
      return formatBarData(data);
    case 'pie':
    case 'donut':
      return formatPieData(data);
    default:
      return data;
  }
};

export const formatTimeSeriesData = (data) => {
  return data.map(item => ({
    ...item,
    date: item.date ? formatDateForChart(item.date) : item.timestamp,
    value: Number(item.value || item.earnings || item.amount || 0),
    formattedValue: formatCurrency(item.value || item.earnings || item.amount || 0)
  }));
};

export const formatBarData = (data) => {
  return data.map(item => ({
    ...item,
    name: item.name || item.label || item.category,
    value: Number(item.value || item.count || item.amount || 0),
    formattedValue: item.isCurrency ? 
      formatCurrency(item.value || item.count || item.amount || 0) :
      (item.value || item.count || item.amount || 0).toLocaleString()
  }));
};

export const formatPieData = (data) => {
  const total = data.reduce((sum, item) => sum + (item.value || item.count || 0), 0);
  
  return data.map(item => {
    const value = Number(item.value || item.count || 0);
    const percentage = total > 0 ? (value / total) * 100 : 0;
    
    return {
      ...item,
      name: item.name || item.label || item.category,
      value,
      percentage: Math.round(percentage * 10) / 10,
      formattedValue: item.isCurrency ? formatCurrency(value) : value.toLocaleString(),
      formattedPercentage: `${Math.round(percentage * 10) / 10}%`
    };
  });
};

// Date formatting for charts
export const formatDateForChart = (date, format_type = 'short') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return date;
  
  switch (format_type) {
    case 'short':
      return format(dateObj, 'MMM dd');
    case 'medium':
      return format(dateObj, 'MMM dd, yyyy');
    case 'long':
      return format(dateObj, 'MMMM dd, yyyy');
    case 'month':
      return format(dateObj, 'MMM yyyy');
    case 'day':
      return format(dateObj, 'EEE');
    case 'time':
      return format(dateObj, 'HH:mm');
    default:
      return format(dateObj, 'MMM dd');
  }
};

// Currency formatting
export const formatCurrency = (amount, currency = 'credits') => {
  if (typeof amount !== 'number') return '0';
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return currency === 'credits' ? `${formatted} credits` : `$${formatted}`;
};

// Number formatting with units
export const formatNumber = (num, options = {}) => {
  const { 
    compact = false, 
    unit = '', 
    precision = 1,
    showSign = false 
  } = options;
  
  if (typeof num !== 'number') return '0';
  
  let formatted;
  
  if (compact && Math.abs(num) >= 1000) {
    if (Math.abs(num) >= 1000000) {
      formatted = (num / 1000000).toFixed(precision) + 'M';
    } else if (Math.abs(num) >= 1000) {
      formatted = (num / 1000).toFixed(precision) + 'K';
    } else {
      formatted = num.toFixed(precision);
    }
  } else {
    formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision
    });
  }
  
  if (showSign && num > 0) {
    formatted = '+' + formatted;
  }
  
  return unit ? `${formatted} ${unit}` : formatted;
};

// Percentage formatting
export const formatPercentage = (value, precision = 1) => {
  if (typeof value !== 'number') return '0%';
  return `${value.toFixed(precision)}%`;
};

// Custom tooltip formatters
export const createTooltipFormatter = (type = 'default') => {
  return (value, name, props) => {
    switch (type) {
      case 'currency':
        return [formatCurrency(value), name];
      case 'percentage':
        return [formatPercentage(value), name];
      case 'number':
        return [formatNumber(value, { compact: true }), name];
      case 'rating':
        return [`${value}/5 ⭐`, name];
      case 'time':
        return [`${value} hours`, name];
      default:
        return [value, name];
    }
  };
};

// Custom label formatters for pie charts
export const createPieLabelFormatter = (type = 'percentage') => {
  return (entry) => {
    switch (type) {
      case 'percentage':
        return `${entry.formattedPercentage}`;
      case 'value':
        return entry.formattedValue;
      case 'name':
        return entry.name;
      case 'nameValue':
        return `${entry.name}: ${entry.formattedValue}`;
      case 'namePercentage':
        return `${entry.name}: ${entry.formattedPercentage}`;
      default:
        return entry.formattedPercentage;
    }
  };
};

// Gradient definitions for charts
export const createGradientDefs = () => (
  <defs>
    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.8} />
      <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="colorGradientSecondary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={0.8} />
      <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="colorGradientSuccess" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={COLORS.success} stopOpacity={0.8} />
      <stop offset="100%" stopColor={COLORS.success} stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="colorGradientWarning" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={COLORS.warning} stopOpacity={0.8} />
      <stop offset="100%" stopColor={COLORS.warning} stopOpacity={0.1} />
    </linearGradient>
  </defs>
);

// Animation configurations
export const ANIMATION_CONFIG = {
  duration: 1000,
  easing: 'ease-out',
  delay: 0,
  animationBegin: 0,
  animationDuration: 1000
};

export const getAnimationConfig = (customConfig = {}) => ({
  ...ANIMATION_CONFIG,
  ...customConfig
});

// Responsive breakpoints for charts
export const CHART_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1200
};

export const getResponsiveChartHeight = (width) => {
  if (width < CHART_BREAKPOINTS.mobile) return 200;
  if (width < CHART_BREAKPOINTS.tablet) return 250;
  if (width < CHART_BREAKPOINTS.desktop) return 300;
  return 350;
};

export const getResponsiveChartMargin = (width) => {
  if (width < CHART_BREAKPOINTS.mobile) {
    return { top: 10, right: 15, left: 15, bottom: 10 };
  }
  if (width < CHART_BREAKPOINTS.tablet) {
    return { top: 15, right: 20, left: 20, bottom: 15 };
  }
  return DEFAULT_CHART_CONFIG.margin;
};

// Chart data processing utilities
export const aggregateDataByPeriod = (data, period = 'day') => {
  if (!Array.isArray(data)) return [];
  
  const groupedData = data.reduce((acc, item) => {
    const date = new Date(item.date || item.timestamp);
    let key;
    
    switch (period) {
      case 'hour':
        key = format(date, 'yyyy-MM-dd HH:00');
        break;
      case 'day':
        key = format(date, 'yyyy-MM-dd');
        break;
      case 'week':
        key = format(date, 'yyyy-\'W\'ww');
        break;
      case 'month':
        key = format(date, 'yyyy-MM');
        break;
      case 'year':
        key = format(date, 'yyyy');
        break;
      default:
        key = format(date, 'yyyy-MM-dd');
    }
    
    if (!acc[key]) {
      acc[key] = {
        date: key,
        value: 0,
        count: 0,
        items: []
      };
    }
    
    acc[key].value += Number(item.value || item.amount || item.earnings || 0);
    acc[key].count += 1;
    acc[key].items.push(item);
    
    return acc;
  }, {});
  
  return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
};

export const calculateTrendLine = (data, key = 'value') => {
  if (!Array.isArray(data) || data.length < 2) return [];
  
  const values = data.map(item => Number(item[key] || 0));
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((item, index) => ({
    ...item,
    trend: slope * index + intercept
  }));
};

export const detectOutliers = (data, key = 'value', threshold = 2) => {
  if (!Array.isArray(data)) return [];
  
  const values = data.map(item => Number(item[key] || 0));
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );
  
  return data.filter((item, index) => {
    const value = Number(item[key] || 0);
    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > threshold;
  });
};

// Chart theme utilities
export const createDarkTheme = () => ({
  backgroundColor: COLORS.background,
  textColor: COLORS.textPrimary,
  gridColor: COLORS.border,
  axisColor: COLORS.textSecondary,
  tooltipBackground: COLORS.backgroundSecondary,
  tooltipBorder: COLORS.border
});

export const createLightTheme = () => ({
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  gridColor: 'rgba(31, 41, 55, 0.1)',
  axisColor: '#6B7280',
  tooltipBackground: '#FFFFFF',
  tooltipBorder: 'rgba(31, 41, 55, 0.2)'
});

// Performance optimization utilities
export const shouldUpdateChart = (prevData, nextData) => {
  if (!prevData || !nextData) return true;
  if (prevData.length !== nextData.length) return true;
  
  // Deep comparison for small datasets
  if (prevData.length < 100) {
    return JSON.stringify(prevData) !== JSON.stringify(nextData);
  }
  
  // Shallow comparison for large datasets
  return prevData.some((item, index) => {
    const nextItem = nextData[index];
    return !nextItem || item.value !== nextItem.value || item.date !== nextItem.date;
  });
};

export const throttleChartUpdate = (fn, delay = 100) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      fn.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        lastExecTime = Date.now();
      }, delay);
    }
  };
};

// Chart accessibility utilities
export const generateChartDescription = (data, type, title) => {
  if (!Array.isArray(data) || data.length === 0) {
    return `${title}: No data available`;
  }
  
  const dataPoints = data.length;
  const minValue = Math.min(...data.map(item => item.value || 0));
  const maxValue = Math.max(...data.map(item => item.value || 0));
  const avgValue = data.reduce((sum, item) => sum + (item.value || 0), 0) / dataPoints;
  
  return `${title}: ${type} chart with ${dataPoints} data points. ` +
         `Range from ${formatNumber(minValue)} to ${formatNumber(maxValue)}, ` +
         `with an average of ${formatNumber(avgValue, { precision: 1 })}.`;
};

export default {
  COLORS,
  COLOR_PALETTES,
  DEFAULT_CHART_CONFIG,
  getLineChartConfig,
  getBarChartConfig,
  getAreaChartConfig,
  getPieChartConfig,
  getDonutChartConfig,
  formatChartData,
  formatDateForChart,
  formatCurrency,
  formatNumber,
  formatPercentage,
  createTooltipFormatter,
  createPieLabelFormatter,
  createGradientDefs,
  getAnimationConfig,
  getResponsiveChartHeight,
  getResponsiveChartMargin,
  aggregateDataByPeriod,
  calculateTrendLine,
  detectOutliers,
  createDarkTheme,
  createLightTheme,
  shouldUpdateChart,
  throttleChartUpdate,
  generateChartDescription
};