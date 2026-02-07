const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database connection
const dbPath = path.join(__dirname, '..', 'database', 'makerset.db');
const db = new sqlite3.Database(dbPath);

class AIMotivationAssistant {
  constructor() {
    this.db = db;
  }

  // Generate motivational message based on provider performance
  async generateMotivationalMessage(providerData, reportData, previousMonthData = null) {
    try {
      const currentMonth = reportData.month;
      const currentYear = reportData.year;
      const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', { month: 'long' });
      
      // Analyze performance trends
      const performanceAnalysis = this.analyzePerformance(providerData, previousMonthData);
      
      // Generate contextual suggestions
      const suggestions = await this.generateSuggestions(currentMonth, performanceAnalysis);
      
      // Create motivational message
      const motivationalMessage = this.createMotivationalMessage(
        providerData, 
        performanceAnalysis, 
        suggestions, 
        monthName
      );
      
      return {
        message: motivationalMessage,
        performance_trend: performanceAnalysis.trend,
        suggestions: suggestions,
        motivational_tone: performanceAnalysis.tone,
        generated_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error generating motivational message:', error);
      return {
        message: `Great work this month, ${providerData.provider_company}! Keep up the excellent performance!`,
        performance_trend: 'stable',
        suggestions: ['Continue creating quality sets', 'Engage with customer feedback'],
        motivational_tone: 'positive',
        generated_at: new Date().toISOString()
      };
    }
  }

  // Analyze provider performance trends
  analyzePerformance(currentData, previousData) {
    if (!previousData) {
      return {
        trend: 'new',
        tone: 'encouraging',
        sales_change: 0,
        revenue_change: 0,
        orders_change: 0
      };
    }

    const salesChange = ((currentData.total_orders - previousData.total_orders) / previousData.total_orders) * 100;
    const revenueChange = ((currentData.total_revenue - previousData.total_revenue) / previousData.total_revenue) * 100;

    let trend, tone;
    
    if (salesChange > 20) {
      trend = 'excellent';
      tone = 'celebratory';
    } else if (salesChange > 5) {
      trend = 'good';
      tone = 'positive';
    } else if (salesChange > -5) {
      trend = 'stable';
      tone = 'encouraging';
    } else if (salesChange > -20) {
      trend = 'declining';
      tone = 'supportive';
    } else {
      trend = 'challenging';
      tone = 'motivational';
    }

    return {
      trend,
      tone,
      sales_change: salesChange,
      revenue_change: revenueChange,
      orders_change: currentData.total_orders - previousData.total_orders
    };
  }

  // Generate contextual suggestions based on month and performance
  async generateSuggestions(month, performanceAnalysis) {
    const suggestions = [];
    
    // Seasonal suggestions
    const seasonalSuggestions = this.getSeasonalSuggestions(month);
    suggestions.push(...seasonalSuggestions);
    
    // Performance-based suggestions
    const performanceSuggestions = this.getPerformanceSuggestions(performanceAnalysis);
    suggestions.push(...performanceSuggestions);
    
    // General business suggestions
    const businessSuggestions = this.getBusinessSuggestions();
    suggestions.push(...businessSuggestions);
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  // Get seasonal suggestions based on month
  getSeasonalSuggestions(month) {
    const suggestions = [];
    
    switch (month) {
      case 1: // January
        suggestions.push('New Year, new opportunities! Consider creating resolution-themed sets');
        suggestions.push('Post-holiday season - focus on educational and skill-building sets');
        break;
      case 2: // February
        suggestions.push('Valentine\'s Day is coming - consider romantic or couple-themed sets');
        suggestions.push('Winter projects are popular - think cozy indoor activities');
        break;
      case 3: // March
        suggestions.push('Spring is here! Garden and outdoor sets are trending');
        suggestions.push('St. Patrick\'s Day themes could attract customers');
        break;
      case 4: // April
        suggestions.push('Easter season - family-friendly sets are in demand');
        suggestions.push('Spring cleaning and organization sets are popular');
        break;
      case 5: // May
        suggestions.push('Mother\'s Day gifts - consider craft and DIY sets');
        suggestions.push('Graduation season - educational and achievement sets');
        break;
      case 6: // June
        suggestions.push('Father\'s Day approaching - tech and hobby sets');
        suggestions.push('Summer vacation prep - travel and outdoor sets');
        break;
      case 7: // July
        suggestions.push('Summer activities - beach, camping, and outdoor sets');
        suggestions.push('Independence Day themes could be popular');
        break;
      case 8: // August
        suggestions.push('Back-to-school season - educational sets are trending');
        suggestions.push('End of summer - transition to indoor activities');
        break;
      case 9: // September
        suggestions.push('Fall is coming - harvest and autumn-themed sets');
        suggestions.push('School year starts - focus on learning and development');
        break;
      case 10: // October
        suggestions.push('Halloween season - spooky and creative sets');
        suggestions.push('Autumn crafts and decorations are popular');
        break;
      case 11: // November
        suggestions.push('Thanksgiving themes - family and gratitude sets');
        suggestions.push('Black Friday prep - consider bundle offers');
        break;
      case 12: // December
        suggestions.push('Christmas is coming! Gift sets and holiday themes');
        suggestions.push('Winter activities - cozy indoor projects');
        suggestions.push('New Year preparation sets could be popular');
        break;
    }
    
    return suggestions;
  }

  // Get performance-based suggestions
  getPerformanceSuggestions(performanceAnalysis) {
    const suggestions = [];
    
    switch (performanceAnalysis.trend) {
      case 'excellent':
        suggestions.push('Outstanding performance! Consider expanding your set portfolio');
        suggestions.push('Your success could inspire others - maybe create tutorial sets');
        break;
      case 'good':
        suggestions.push('Great progress! Keep building on this momentum');
        suggestions.push('Consider adding more variety to attract different customers');
        break;
      case 'stable':
        suggestions.push('Steady performance is good! Time to try something new');
        suggestions.push('Consider seasonal themes to boost sales');
        break;
      case 'declining':
        suggestions.push('Every business has ups and downs - this is temporary');
        suggestions.push('Try refreshing your existing sets with new features');
        suggestions.push('Consider customer feedback to improve your offerings');
        break;
      case 'challenging':
        suggestions.push('Challenging times call for creative solutions');
        suggestions.push('Focus on your best-performing sets and improve them');
        suggestions.push('Consider collaborating with other providers');
        break;
      case 'new':
        suggestions.push('Welcome to the platform! Focus on quality over quantity');
        suggestions.push('Start with proven popular categories');
        break;
    }
    
    return suggestions;
  }

  // Get general business suggestions
  getBusinessSuggestions() {
    return [
      'Engage with customer reviews to improve your sets',
      'Consider creating sets for different skill levels',
      'High-quality photos and descriptions boost sales',
      'Bundle related sets together for better value',
      'Stay updated with trending topics and themes',
      'Regular updates keep your sets fresh and relevant'
    ];
  }

  // Create the motivational message
  createMotivationalMessage(providerData, performanceAnalysis, suggestions, monthName) {
    const companyName = providerData.provider_company || providerData.provider_name;
    const earnings = providerData.provider_payment.toFixed(2);
    const orders = providerData.total_orders;
    const revenue = providerData.total_revenue.toFixed(2);
    
    let message = `Hello ${companyName}! 👋\n\n`;
    
    // Performance greeting
    switch (performanceAnalysis.tone) {
      case 'celebratory':
        message += `🎉 AMAZING WORK this ${monthName}! You've earned €${earnings} from ${orders} orders - that's fantastic growth! `;
        message += `Your dedication to quality sets is really paying off. `;
        break;
      case 'positive':
        message += `👍 Great job this ${monthName}! You earned €${earnings} from ${orders} orders. `;
        message += `Your consistent performance shows real commitment to your customers. `;
        break;
      case 'encouraging':
        message += `💪 Solid performance this ${monthName}! You earned €${earnings} from ${orders} orders. `;
        message += `Steady progress is the foundation of long-term success. `;
        break;
      case 'supportive':
        message += `🤝 We know this ${monthName} was challenging, but you still earned €${earnings} from ${orders} orders. `;
        message += `Every provider faces ups and downs - you're handling it well. `;
        break;
      case 'motivational':
        message += `🚀 This ${monthName} was tough, but you earned €${earnings} from ${orders} orders. `;
        message += `Challenging times are opportunities to innovate and grow stronger. `;
        break;
    }
    
    // Add performance context
    if (performanceAnalysis.trend === 'excellent') {
      message += `Your sales are up significantly - you're clearly doing something right! `;
    } else if (performanceAnalysis.trend === 'declining') {
      message += `Sales were a bit down this month, but that's normal in business. `;
    } else if (performanceAnalysis.trend === 'challenging') {
      message += `We believe in your potential to bounce back stronger. `;
    }
    
    // Add suggestions
    if (suggestions.length > 0) {
      message += `\n\n💡 Here are some ideas to help you succeed:\n`;
      suggestions.forEach((suggestion, index) => {
        message += `• ${suggestion}\n`;
      });
    }
    
    // Closing motivation
    message += `\n🎯 Remember: Every successful provider started exactly where you are now. `;
    message += `Keep creating amazing sets, and your customers will keep coming back!\n\n`;
    message += `Looking forward to seeing your success next month! 🌟\n\n`;
    message += `Best regards,\nThe MakerSet Team`;
    
    return message;
  }

  // Get previous month data for comparison
  async getPreviousMonthData(providerId, currentMonth, currentYear) {
    return new Promise((resolve, reject) => {
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      const startDate = new Date(previousYear, previousMonth - 1, 1);
      const endDate = new Date(previousYear, previousMonth, 0, 23, 59, 59);
      
      const sql = `
        SELECT 
          COUNT(o.order_id) as total_orders,
          SUM(o.total_amount) as total_revenue
        FROM orders o
        WHERE o.provider_id = ? 
          AND o.order_date >= ? 
          AND o.order_date <= ?
          AND o.status = 'delivered'
          AND o.payment_status = 'confirmed'
      `;
      
      this.db.get(sql, [providerId, startDate.toISOString(), endDate.toISOString()], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || { total_orders: 0, total_revenue: 0 });
        }
      });
    });
  }
}

module.exports = AIMotivationAssistant;
