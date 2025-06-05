import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogger } from '../../hooks/useLogger';

const TaskAnalytics = ({ data, timeRange, userRole }) => {
  const logger = useLogger('TaskAnalytics');
  const [activeView, setActiveView] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(null);

  useEffect(() => {
    logger.debug('TaskAnalytics rendered', {
      hasData: !!data,
      timeRange,
      userRole,
      activeView
    });
  }, [data, timeRange, userRole, activeView, logger]);

  // Process task data for analytics
  const analyticsData = useMemo(() => {
    if (!data || !data.tasks) {
      logger.warn('No task data provided to TaskAnalytics');
      return {
        overview: {},
        categories: [],
        skills: [],
        timeline: [],
        performance: {},
        comparison: {}
      };
    }

    try {
      const tasks = data.tasks || [];
      
      // Overview metrics
      const overview = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        activeTasks: tasks.filter(t => ['assigned', 'in-progress'].includes(t.status)).length,
        cancelledTasks: tasks.filter(t => t.status === 'cancelled').length,
        averageCredits: tasks.length > 0 
          ? Math.round(tasks.reduce((sum, t) => sum + (t.credits || 0), 0) / tasks.length)
          : 0,
        totalCredits: tasks.reduce((sum, t) => sum + (t.credits || 0), 0),
        completionRate: tasks.length > 0 
          ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
          : 0
      };

      // Category analysis
      const categoryMap = {};
      tasks.forEach(task => {
        const category = task.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = {
            name: category,
            total: 0,
            completed: 0,
            active: 0,
            cancelled: 0,
            totalCredits: 0,
            averageCredits: 0
          };
        }
        
        categoryMap[category].total++;
        categoryMap[category].totalCredits += task.credits || 0;
        
        if (task.status === 'completed') categoryMap[category].completed++;
        else if (['assigned', 'in-progress'].includes(task.status)) categoryMap[category].active++;
        else if (task.status === 'cancelled') categoryMap[category].cancelled++;
      });

      const categories = Object.values(categoryMap).map(cat => ({
        ...cat,
        averageCredits: cat.total > 0 ? Math.round(cat.totalCredits / cat.total) : 0,
        completionRate: cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0
      })).sort((a, b) => b.total - a.total);

      // Skills analysis
      const skillsMap = {};
      tasks.forEach(task => {
        const skills = task.skillsRequired || ['General'];
        skills.forEach(skill => {
          if (!skillsMap[skill]) {
            skillsMap[skill] = {
              name: skill,
              demand: 0,
              completed: 0,
              totalCredits: 0,
              averageCredits: 0
            };
          }
          
          skillsMap[skill].demand++;
          skillsMap[skill].totalCredits += task.credits || 0;
          
          if (task.status === 'completed') {
            skillsMap[skill].completed++;
          }
        });
      });

      const skills = Object.values(skillsMap).map(skill => ({
        ...skill,
        averageCredits: skill.demand > 0 ? Math.round(skill.totalCredits / skill.demand) : 0,
        completionRate: skill.demand > 0 ? Math.round((skill.completed / skill.demand) * 100) : 0
      })).sort((a, b) => b.demand - a.demand).slice(0, 10); // Top 10 skills

      // Timeline analysis (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const timeline = [];

      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt).toISOString().split('T')[0];
          return taskDate === dateStr;
        });

        timeline.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: dateStr,
          created: dayTasks.length,
          completed: dayTasks.filter(t => t.status === 'completed').length,
          credits: dayTasks.reduce((sum, t) => sum + (t.credits || 0), 0)
        });
      }

      // Performance metrics for radar chart
      const performance = {
        efficiency: overview.completionRate,
        quality: data.averageRating ? (data.averageRating / 5) * 100 : 0,
        volume: Math.min((overview.totalTasks / 50) * 100, 100), // Normalize to 50 tasks max
        value: Math.min((overview.averageCredits / 100) * 100, 100), // Normalize to 100 credits max
        speed: data.averageResponseTime ? Math.max(100 - (data.averageResponseTime / 24) * 100, 0) : 50,
        consistency: data.totalRatings ? Math.min((data.totalRatings / 20) * 100, 100) : 0
      };

      logger.debug('Task analytics processed', {
        overview,
        categoriesCount: categories.length,
        skillsCount: skills.length,
        timelinePoints: timeline.length
      });

      return {
        overview,
        categories,
        skills,
        timeline,
        performance,
        comparison: data.comparison || {}
      };

    } catch (error) {
      logger.error('Task analytics processing failed', {
        error: error.message,
        data: data ? Object.keys(data) : null
      });
      return {
        overview: {},
        categories: [],
        skills: [],
        timeline: [],
        performance: {},
        comparison: {}
      };
    }
  }, [data, logger]);

  // Handle view change
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
    logger.logInteraction('task_analytics_view_changed', view, {
      previousView: activeView,
      userRole
    });
  }, [activeView, userRole, logger]);

  // Handle category filter
  const handleCategoryFilter = useCallback((category) => {
    setSelectedCategory(category);
    logger.logInteraction('task_analytics_category_filtered', category, {
      previousCategory: selectedCategory
    });
  }, [selectedCategory, logger]);

  // Custom colors for charts
  const chartColors = [
    '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
    '#00BCD4', '#CDDC39', '#FF5722', '#607D8B', '#795548'
  ];

  // Render overview cards
  const renderOverviewCards = () => (
    <div className="overview-cards">
      <div className="analytics-card">
        <div className="card-icon" style={{ color: '#2196F3' }}>📊</div>
        <div className="card-content">
          <h4>Total Tasks</h4>
          <p className="card-value">{analyticsData.overview.totalTasks || 0}</p>
          <p className="card-description">
            {userRole === 'helper' ? 'Tasks you\'ve worked on' : 'Tasks you\'ve posted'}
          </p>
        </div>
      </div>

      <div className="analytics-card">
        <div className="card-icon" style={{ color: '#4CAF50' }}>✅</div>
        <div className="card-content">
          <h4>Completed</h4>
          <p className="card-value">{analyticsData.overview.completedTasks || 0}</p>
          <p className="card-description">
            {analyticsData.overview.completionRate || 0}% completion rate
          </p>
        </div>
      </div>

      <div className="analytics-card">
        <div className="card-icon" style={{ color: '#FF9800' }}>⚡</div>
        <div className="card-content">
          <h4>Active</h4>
          <p className="card-value">{analyticsData.overview.activeTasks || 0}</p>
          <p className="card-description">Currently in progress</p>
        </div>
      </div>

      <div className="analytics-card">
        <div className="card-icon" style={{ color: '#9C27B0' }}>💰</div>
        <div className="card-content">
          <h4>Average Credits</h4>
          <p className="card-value">{analyticsData.overview.averageCredits || 0}</p>
          <p className="card-description">Per task value</p>
        </div>
      </div>
    </div>
  );

  // Render category analysis
  const renderCategoryAnalysis = () => (
    <div className="category-analysis">
      <div className="analysis-header">
        <h4>📋 Category Breakdown</h4>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          className="category-filter"
        >
          <option value="all">All Categories</option>
          {analyticsData.categories.map(cat => (
            <option key={cat.name} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="category-charts">
        <div className="chart-section">
          <h5>Tasks by Category</h5>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.categories}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                paddingAngle={2}
                dataKey="total"
                nameKey="name"
              >
                {analyticsData.categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h5>Completion Rates</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.categories}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completionRate" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="category-table">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total</th>
              <th>Completed</th>
              <th>Completion Rate</th>
              <th>Avg Credits</th>
            </tr>
          </thead>
          <tbody>
            {analyticsData.categories.map(category => (
              <tr key={category.name}>
                <td>{category.name}</td>
                <td>{category.total}</td>
                <td>{category.completed}</td>
                <td>{category.completionRate}%</td>
                <td>{category.averageCredits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render skills analysis
  const renderSkillsAnalysis = () => (
    <div className="skills-analysis">
      <h4>🎯 Skills in Demand</h4>
      
      <div className="skills-charts">
        <div className="chart-section">
          <h5>Top Skills by Demand</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.skills} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="demand" fill="#2196F3" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h5>Average Credits by Skill</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.skills}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageCredits" fill="#FF9800" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="skills-list">
        {analyticsData.skills.map((skill, index) => (
          <div key={skill.name} className="skill-item">
            <div className="skill-info">
              <span className="skill-name">{skill.name}</span>
              <span className="skill-demand">{skill.demand} tasks</span>
            </div>
            <div className="skill-metrics">
              <span className="skill-credits">{skill.averageCredits} avg credits</span>
              <span className="skill-completion">{skill.completionRate}% completion</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render timeline analysis
  const renderTimelineAnalysis = () => (
    <div className="timeline-analysis">
      <h4>📈 Task Activity Timeline</h4>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={analyticsData.timeline}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="created" fill="#2196F3" name="Tasks Created" />
          <Bar yAxisId="left" dataKey="completed" fill="#4CAF50" name="Tasks Completed" />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="credits" 
            stroke="#FF9800" 
            strokeWidth={2}
            name="Credits"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  // Render performance radar
  const renderPerformanceRadar = () => {
    const radarData = [
      {
        metric: 'Efficiency',
        value: analyticsData.performance.efficiency || 0,
        fullMark: 100
      },
      {
        metric: 'Quality',
        value: analyticsData.performance.quality || 0,
        fullMark: 100
      },
      {
        metric: 'Volume',
        value: analyticsData.performance.volume || 0,
        fullMark: 100
      },
      {
        metric: 'Value',
        value: analyticsData.performance.value || 0,
        fullMark: 100
      },
      {
        metric: 'Speed',
        value: analyticsData.performance.speed || 0,
        fullMark: 100
      },
      {
        metric: 'Consistency',
        value: analyticsData.performance.consistency || 0,
        fullMark: 100
      }
    ];

    return (
      <div className="performance-radar">
        <h4>⚡ Performance Profile</h4>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="#2196F3"
              fill="#2196F3"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
        
        <div className="performance-insights">
          <h5>💡 Performance Insights</h5>
          <ul>
            {radarData.map(item => (
              <li key={item.metric}>
                <strong>{item.metric}:</strong> {Math.round(item.value)}%
                {item.value >= 80 && ' 🟢 Excellent'}
                {item.value >= 60 && item.value < 80 && ' 🟡 Good'}
                {item.value < 60 && ' 🔴 Needs Improvement'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Navigation tabs
  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'categories', label: '📋 Categories', icon: '📋' },
    { id: 'skills', label: '🎯 Skills', icon: '🎯' },
    { id: 'timeline', label: '📈 Timeline', icon: '📈' },
    { id: 'performance', label: '⚡ Performance', icon: '⚡' }
  ];

  if (!analyticsData.overview.totalTasks) {
    return (
      <div className="task-analytics empty">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h3>No Task Data Available</h3>
          <p>Start {userRole === 'helper' ? 'applying to tasks' : 'posting tasks'} to see analytics</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="task-analytics"
    >
      <div className="analytics-header">
        <h3>📊 Task Analytics</h3>
        <div className="analytics-controls">
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`comparison-btn ${comparisonMode ? 'active' : ''}`}
          >
            📈 Compare
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleViewChange(tab.id)}
            className={`analytics-tab ${activeView === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="analytics-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeView === 'overview' && renderOverviewCards()}
            {activeView === 'categories' && renderCategoryAnalysis()}
            {activeView === 'skills' && renderSkillsAnalysis()}
            {activeView === 'timeline' && renderTimelineAnalysis()}
            {activeView === 'performance' && renderPerformanceRadar()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Task Analytics</summary>
          <pre className="debug-content">
            {JSON.stringify({
              activeView,
              selectedCategory,
              dataOverview: analyticsData.overview,
              categoriesCount: analyticsData.categories.length,
              skillsCount: analyticsData.skills.length,
              timelinePoints: analyticsData.timeline.length
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(TaskAnalytics);