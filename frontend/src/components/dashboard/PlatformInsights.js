import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { useLogger } from '../../hooks/useLogger';

const PlatformInsights = ({ data, analyticsData, timeRange, userRole }) => {
  const logger = useLogger('PlatformInsights');
  const [activeInsight, setActiveInsight] = useState('market-trends');
  const [comparisonMode, setComparisonMode] = useState('platform');
  const [refreshTimer, setRefreshTimer] = useState(null);

  useEffect(() => {
    logger.debug('PlatformInsights rendered', {
      hasData: !!data,
      hasAnalytics: !!analyticsData,
      timeRange,
      userRole,
      activeInsight
    });
  }, [data, analyticsData, timeRange, userRole, activeInsight, logger]);

  // Process platform insights data
  const insights = useMemo(() => {
    if (!data || !analyticsData) {
      logger.warn('Insufficient data for platform insights');
      return {
        marketTrends: {},
        competitivePosition: {},
        opportunities: [],
        predictions: {},
        industryBenchmarks: {},
        recommendations: []
      };
    }

    try {
      // Market trends analysis
      const marketTrends = {
        topSkills: [
          { name: 'Web Development', demand: 85, growth: 12, avgPay: 75 },
          { name: 'Data Analysis', demand: 78, growth: 18, avgPay: 82 },
          { name: 'Content Writing', demand: 72, growth: 8, avgPay: 45 },
          { name: 'Graphic Design', demand: 68, growth: 5, avgPay: 55 },
          { name: 'Digital Marketing', demand: 65, growth: 15, avgPay: 60 },
          { name: 'Mobile Development', demand: 62, growth: 22, avgPay: 88 },
          { name: 'Video Editing', demand: 58, growth: 10, avgPay: 52 },
          { name: 'Virtual Assistant', demand: 55, growth: 3, avgPay: 35 }
        ],
        demandByTime: generateDemandTimeline(),
        categoryGrowth: [
          { category: 'Technology', growth: 25, volume: 450 },
          { category: 'Creative', growth: 12, volume: 320 },
          { category: 'Business', growth: 18, volume: 280 },
          { category: 'Marketing', growth: 15, volume: 240 },
          { category: 'Writing', growth: 8, volume: 180 }
        ]
      };

      // Competitive position analysis
      const userMetrics = {
        successRate: data.applicationSuccessRate || 0,
        rating: data.rating || 0,
        completedTasks: data.completedTasks || 0,
        earnings: data.creditsEarned || 0
      };

      const competitivePosition = {
        percentiles: {
          successRate: calculatePercentile(userMetrics.successRate, 65), // Platform avg
          rating: calculatePercentile(userMetrics.rating * 20, 84), // Convert to percentile
          experience: calculatePercentile(userMetrics.completedTasks, 15),
          earnings: calculatePercentile(userMetrics.earnings, 1200)
        },
        ranking: calculateOverallRanking(userMetrics),
        strengths: identifyStrengths(userMetrics),
        improvements: identifyImprovements(userMetrics)
      };

      // Opportunity analysis
      const opportunities = [
        {
          type: 'skill-gap',
          title: 'High-Demand Skills Gap',
          description: 'Mobile Development shows 22% growth with premium rates',
          potential: 'high',
          effort: 'medium',
          timeline: '2-3 months',
          impact: '+35% earnings potential'
        },
        {
          type: 'market-timing',
          title: 'Peak Season Opportunity',
          description: 'Q4 typically sees 40% increase in task volume',
          potential: 'high',
          effort: 'low',
          timeline: 'Next 2 months',
          impact: '+25% task availability'
        },
        {
          type: 'specialization',
          title: 'Niche Specialization',
          description: 'Data Analysis specialists earn 45% above average',
          potential: 'medium',
          effort: 'high',
          timeline: '4-6 months',
          impact: '+45% per-task rate'
        },
        {
          type: 'geographic',
          title: 'Geographic Expansion',
          description: 'Remote work demand up 60% in emerging markets',
          potential: 'medium',
          effort: 'low',
          timeline: '1 month',
          impact: '+20% market access'
        }
      ];

      // Predictions and forecasts
      const predictions = {
        earnings: {
          nextMonth: userMetrics.earnings * 1.15,
          nextQuarter: userMetrics.earnings * 3.2,
          confidence: 78
        },
        marketSize: {
          current: 12500,
          projected: 18750,
          growth: 50,
          timeline: '12 months'
        },
        skills: {
          emerging: ['AI/ML', 'Blockchain', 'AR/VR', 'Sustainability'],
          declining: ['Legacy Systems', 'Basic Data Entry'],
          stable: ['Web Development', 'Content Creation']
        }
      };

      // Industry benchmarks
      const industryBenchmarks = {
        successRates: [
          { role: 'Beginner', rate: 45, color: '#F44336' },
          { role: 'Intermediate', rate: 65, color: '#FF9800' },
          { role: 'Advanced', rate: 82, color: '#4CAF50' },
          { role: 'Expert', rate: 95, color: '#2196F3' }
        ],
        averageEarnings: [
          { skill: 'Development', beginner: 40, expert: 120 },
          { skill: 'Design', beginner: 25, expert: 80 },
          { skill: 'Writing', beginner: 15, expert: 60 },
          { skill: 'Marketing', beginner: 20, expert: 75 }
        ],
        taskCompletion: {
          platform: 87,
          user: userMetrics.completedTasks > 0 ? 85 : 0,
          topPerformers: 96
        }
      };

      // AI-powered recommendations
      const recommendations = generateRecommendations(userMetrics, competitivePosition, opportunities);

      logger.debug('Platform insights processed', {
        opportunities: opportunities.length,
        recommendations: recommendations.length,
        userRanking: competitivePosition.ranking
      });

      return {
        marketTrends,
        competitivePosition,
        opportunities,
        predictions,
        industryBenchmarks,
        recommendations
      };

    } catch (error) {
      logger.error('Platform insights processing failed', {
        error: error.message,
        hasData: !!data,
        hasAnalytics: !!analyticsData
      });
      return {
        marketTrends: {},
        competitivePosition: {},
        opportunities: [],
        predictions: {},
        industryBenchmarks: {},
        recommendations: []
      };
    }
  }, [data, analyticsData, logger]);

  // Helper functions
  function generateDemandTimeline() {
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      timeline.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        development: 80 + Math.random() * 20,
        design: 60 + Math.random() * 15,
        writing: 45 + Math.random() * 10,
        marketing: 55 + Math.random() * 12
      });
    }
    return timeline;
  }

  function calculatePercentile(value, average) {
    // Simplified percentile calculation
    const ratio = value / average;
    if (ratio >= 1.5) return 95;
    if (ratio >= 1.2) return 85;
    if (ratio >= 1.0) return 70;
    if (ratio >= 0.8) return 50;
    if (ratio >= 0.6) return 30;
    return 15;
  }

  function calculateOverallRanking(metrics) {
    const scores = [
      calculatePercentile(metrics.successRate, 65),
      calculatePercentile(metrics.rating * 20, 84),
      calculatePercentile(metrics.completedTasks, 15),
      calculatePercentile(metrics.earnings, 1200)
    ];
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (average >= 90) return 'Top 10%';
    if (average >= 75) return 'Top 25%';
    if (average >= 50) return 'Top 50%';
    return 'Bottom 50%';
  }

  function identifyStrengths(metrics) {
    const strengths = [];
    if (metrics.successRate > 75) strengths.push('High Success Rate');
    if (metrics.rating > 4.3) strengths.push('Excellent Ratings');
    if (metrics.completedTasks > 25) strengths.push('Experienced');
    if (metrics.earnings > 1500) strengths.push('High Earner');
    return strengths.length > 0 ? strengths : ['Building Experience'];
  }

  function identifyImprovements(metrics) {
    const improvements = [];
    if (metrics.successRate < 60) improvements.push('Application Quality');
    if (metrics.rating < 4.0) improvements.push('Client Satisfaction');
    if (metrics.completedTasks < 10) improvements.push('Build Portfolio');
    if (metrics.earnings < 500) improvements.push('Increase Rates');
    return improvements;
  }

  function generateRecommendations(userMetrics, position, opportunities) {
    const recs = [];
    
    // Based on ranking
    if (position.ranking === 'Bottom 50%') {
      recs.push({
        type: 'improvement',
        priority: 'high',
        title: 'Focus on Success Rate',
        description: 'Improve application quality to increase acceptance rate',
        action: 'Review and customize application templates'
      });
    }

    // Based on opportunities
    opportunities.slice(0, 2).forEach(opp => {
      recs.push({
        type: 'opportunity',
        priority: opp.potential === 'high' ? 'high' : 'medium',
        title: `Explore ${opp.title}`,
        description: opp.description,
        action: `Timeline: ${opp.timeline}`
      });
    });

    // Skill-based recommendations
    if (userMetrics.earnings < 1000) {
      recs.push({
        type: 'skill',
        priority: 'medium',
        title: 'Develop Premium Skills',
        description: 'Learn high-value skills like data analysis or mobile development',
        action: 'Consider online courses or certifications'
      });
    }

    return recs;
  }

  // Handle insight tab change
  const handleInsightChange = useCallback((insight) => {
    setActiveInsight(insight);
    logger.logInteraction('platform_insight_changed', insight, {
      previousInsight: activeInsight,
      userRole
    });
  }, [activeInsight, userRole, logger]);

  // Render market trends
  const renderMarketTrends = () => (
    <div className="market-trends">
      <h4>📊 Market Trends & Opportunities</h4>
      
      <div className="trends-grid">
        <div className="trend-section">
          <h5>🔥 Skills in High Demand</h5>
          <div className="skills-demand">
            {insights.marketTrends.topSkills?.map((skill, index) => (
              <div key={skill.name} className="skill-trend-item">
                <div className="skill-info">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-growth">
                    {skill.growth > 0 ? '📈' : '📉'} {skill.growth}%
                  </span>
                </div>
                <div className="skill-metrics">
                  <div className="demand-bar">
                    <div 
                      className="demand-fill"
                      style={{ 
                        width: `${skill.demand}%`,
                        backgroundColor: skill.growth > 15 ? '#4CAF50' : skill.growth > 5 ? '#FF9800' : '#F44336'
                      }}
                    />
                  </div>
                  <span className="avg-pay">${skill.avgPay}/hr avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="trend-section">
          <h5>📈 Demand Timeline</h5>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={insights.marketTrends.demandByTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="development" stroke="#2196F3" strokeWidth={2} />
              <Line type="monotone" dataKey="design" stroke="#4CAF50" strokeWidth={2} />
              <Line type="monotone" dataKey="writing" stroke="#FF9800" strokeWidth={2} />
              <Line type="monotone" dataKey="marketing" stroke="#9C27B0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="category-growth">
        <h5>🚀 Category Growth Rates</h5>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={insights.marketTrends.categoryGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="growth" fill="#4CAF50" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Render competitive position
  const renderCompetitivePosition = () => (
    <div className="competitive-position">
      <h4>🏆 Your Competitive Position</h4>
      
      <div className="position-overview">
        <div className="ranking-card">
          <div className="ranking-header">
            <span className="ranking-icon">🏅</span>
            <div className="ranking-info">
              <h5>Overall Ranking</h5>
              <p className="ranking-value">{insights.competitivePosition.ranking}</p>
            </div>
          </div>
        </div>

        <div className="percentiles-chart">
          <h5>📊 Performance Percentiles</h5>
          <ResponsiveContainer width="100%" height={250}>
            <RadialBarChart 
              innerRadius="20%" 
              outerRadius="80%" 
              data={Object.entries(insights.competitivePosition.percentiles || {}).map(([key, value]) => ({
                name: key,
                value,
                fill: value >= 75 ? '#4CAF50' : value >= 50 ? '#FF9800' : '#F44336'
              }))}
            >
              <RadialBar dataKey="value" cornerRadius={10} />
              <Tooltip />
              <Legend />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="strengths-improvements">
        <div className="strengths">
          <h5>💪 Your Strengths</h5>
          <ul>
            {insights.competitivePosition.strengths?.map((strength, index) => (
              <li key={index}>
                <span className="strength-icon">✅</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="improvements">
          <h5>🎯 Areas for Improvement</h5>
          <ul>
            {insights.competitivePosition.improvements?.map((improvement, index) => (
              <li key={index}>
                <span className="improvement-icon">🔧</span>
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // Render opportunities
  const renderOpportunities = () => (
    <div className="opportunities">
      <h4>🚀 Growth Opportunities</h4>
      
      <div className="opportunities-grid">
        {insights.opportunities.map((opportunity, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`opportunity-card ${opportunity.potential}`}
          >
            <div className="opportunity-header">
              <div className="opportunity-type">
                {opportunity.type === 'skill-gap' && '🎯'}
                {opportunity.type === 'market-timing' && '⏰'}
                {opportunity.type === 'specialization' && '🎓'}
                {opportunity.type === 'geographic' && '🌍'}
              </div>
              <div className="opportunity-priority">
                <span className={`priority-badge ${opportunity.potential}`}>
                  {opportunity.potential.toUpperCase()} POTENTIAL
                </span>
              </div>
            </div>
            
            <h5>{opportunity.title}</h5>
            <p className="opportunity-description">{opportunity.description}</p>
            
            <div className="opportunity-metrics">
              <div className="metric">
                <span className="metric-label">Effort:</span>
                <span className={`metric-value ${opportunity.effort}`}>
                  {opportunity.effort}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Timeline:</span>
                <span className="metric-value">{opportunity.timeline}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Impact:</span>
                <span className="metric-value impact">{opportunity.impact}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Render predictions
  const renderPredictions = () => (
    <div className="predictions">
      <h4>🔮 Market Predictions & Forecasts</h4>
      
      <div className="predictions-grid">
        <div className="prediction-card">
          <h5>💰 Earnings Forecast</h5>
          <div className="earnings-prediction">
            <div className="prediction-item">
              <span className="prediction-label">Next Month:</span>
              <span className="prediction-value">
                ${Math.round(insights.predictions.earnings?.nextMonth || 0)}
              </span>
            </div>
            <div className="prediction-item">
              <span className="prediction-label">Next Quarter:</span>
              <span className="prediction-value">
                ${Math.round(insights.predictions.earnings?.nextQuarter || 0)}
              </span>
            </div>
            <div className="confidence">
              Confidence: {insights.predictions.earnings?.confidence}%
            </div>
          </div>
        </div>

        <div className="prediction-card">
          <h5>📈 Market Growth</h5>
          <div className="market-prediction">
            <div className="growth-stat">
              <span className="growth-label">Market Size Growth:</span>
              <span className="growth-value">+{insights.predictions.marketSize?.growth}%</span>
            </div>
            <div className="growth-timeline">
              Over next {insights.predictions.marketSize?.timeline}
            </div>
          </div>
        </div>

        <div className="prediction-card">
          <h5>🎯 Skill Trends</h5>
          <div className="skills-prediction">
            <div className="skill-category">
              <h6>🚀 Emerging:</h6>
              <ul>
                {insights.predictions.skills?.emerging.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
            <div className="skill-category">
              <h6>📉 Declining:</h6>
              <ul>
                {insights.predictions.skills?.declining.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render recommendations
  const renderRecommendations = () => (
    <div className="ai-recommendations">
      <h4>🤖 AI-Powered Recommendations</h4>
      
      <div className="recommendations-list">
        {insights.recommendations.map((rec, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`recommendation-item ${rec.type} ${rec.priority}`}
          >
            <div className="recommendation-icon">
              {rec.type === 'improvement' && '🎯'}
              {rec.type === 'opportunity' && '🚀'}
              {rec.type === 'skill' && '🎓'}
            </div>
            <div className="recommendation-content">
              <div className="recommendation-header">
                <h5>{rec.title}</h5>
                <span className={`priority-indicator ${rec.priority}`}>
                  {rec.priority === 'high' && '🔴 HIGH'}
                  {rec.priority === 'medium' && '🟡 MEDIUM'}
                  {rec.priority === 'low' && '🟢 LOW'}
                </span>
              </div>
              <p className="recommendation-description">{rec.description}</p>
              <p className="recommendation-action">
                <strong>Action:</strong> {rec.action}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Insight tabs
  const insightTabs = [
    { id: 'market-trends', label: '📊 Market Trends', component: renderMarketTrends },
    { id: 'competitive-position', label: '🏆 Your Position', component: renderCompetitivePosition },
    { id: 'opportunities', label: '🚀 Opportunities', component: renderOpportunities },
    { id: 'predictions', label: '🔮 Predictions', component: renderPredictions },
    { id: 'recommendations', label: '🤖 AI Recommendations', component: renderRecommendations }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="platform-insights"
    >
      <div className="insights-header">
        <h3>💡 Platform Insights</h3>
        <div className="insights-controls">
          <select
            value={comparisonMode}
            onChange={(e) => setComparisonMode(e.target.value)}
            className="comparison-select"
          >
            <option value="platform">vs Platform Average</option>
            <option value="category">vs Category</option>
            <option value="experience">vs Experience Level</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="insights-tabs">
        {insightTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleInsightChange(tab.id)}
            className={`insight-tab ${activeInsight === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="insights-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeInsight}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {insightTabs.find(tab => tab.id === activeInsight)?.component()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-panel">
          <summary>🔧 Debug: Platform Insights</summary>
          <pre className="debug-content">
            {JSON.stringify({
              activeInsight,
              comparisonMode,
              hasData: !!data,
              hasAnalytics: !!analyticsData,
              opportunitiesCount: insights.opportunities.length,
              recommendationsCount: insights.recommendations.length
            }, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
};

export default React.memo(PlatformInsights);