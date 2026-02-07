const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const PDFGenerator = require('./pdfGenerator');
const NotificationService = require('./notificationService');
const AIMotivationAssistant = require('./aiMotivationAssistant');

// Initialize database connection
const dbPath = path.join(__dirname, '..', 'database', 'makerset.db');
const db = new sqlite3.Database(dbPath);

class AutomatedScheduler {
  constructor() {
    this.db = db;
    this.pdfGenerator = new PDFGenerator();
    this.notificationService = new NotificationService();
    this.aiMotivationAssistant = new AIMotivationAssistant();
    this.isRunning = false;
  }

  // Start the automated scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting automated scheduler...');
    
    // Schedule monthly report generation on the 1st of every month at 9:00 AM
    cron.schedule('0 9 1 * *', () => {
      console.log('📅 Monthly report generation triggered by cron');
      this.generateMonthlyReport();
    }, {
      scheduled: true,
      timezone: "Europe/Helsinki"
    });

    // Schedule daily cleanup of old notifications (keep only last 30 days)
    cron.schedule('0 2 * * *', () => {
      console.log('🧹 Daily cleanup triggered by cron');
      this.cleanupOldNotifications();
    }, {
      scheduled: true,
      timezone: "Europe/Helsinki"
    });

    this.isRunning = true;
    console.log('✅ Automated scheduler started successfully');
    console.log('📅 Monthly reports will be generated on the 1st of each month at 9:00 AM');
    console.log('🧹 Daily cleanup will run at 2:00 AM');
  }

  // Stop the automated scheduler
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    // Note: node-cron doesn't have a destroy method
    // The scheduler will stop when the process exits
    this.isRunning = false;
    console.log('🛑 Automated scheduler stopped');
  }

  // Generate monthly report for the previous month
  async generateMonthlyReport() {
    try {
      const now = new Date();
      const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      console.log(`📊 Generating automated monthly report for ${previousMonth}/${year}`);
      
      // Note: We now overwrite existing reports - only one report per month
      
      // Generate the report data
      const reportData = await this.calculateMonthlyReport(previousMonth, year);
      
      // Save report to database
      const reportId = await this.saveMonthlyReport(reportData);
      
      // Generate PDFs for each provider
      await this.generateProviderPDFs(reportData, reportId);
      
      // Create notifications for admins
      await this.notificationService.notifyMonthlyReportGenerated(reportData);
      
      // Create notifications for each provider
      await this.notifyProvidersAboutReports(reportData, reportId);
      
      console.log(`✅ Monthly report generated successfully for ${previousMonth}/${year}`);
      
    } catch (error) {
      console.error('❌ Error generating monthly report:', error);
      
      // Create error notification
      await this.notificationService.createNotification(
        'system_error',
        'Monthly Report Generation Failed',
        `Failed to generate monthly report: ${error.message}`,
        { error: error.message, timestamp: new Date().toISOString() },
        null,
        'high'
      );
    }
  }

  // Calculate monthly report data
  async calculateMonthlyReport(month, year) {
    return new Promise((resolve, reject) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      const reportQuery = `
        SELECT 
          u.user_id as provider_id,
          u.username as provider_name,
          u.company_name as provider_company,
          u.email as provider_email,
          u.provider_markup_percentage,
          COUNT(o.order_id) as total_orders,
          SUM(o.total_amount) as total_revenue,
          SUM(o.total_amount) * (u.provider_markup_percentage / 100) as provider_payment,
          SUM(o.total_amount) * (1 - u.provider_markup_percentage / 100) as platform_fee_amount
        FROM orders o
        JOIN users u ON o.provider_id = u.user_id
        WHERE o.order_date >= ? AND o.order_date <= ?
          AND o.status = 'delivered'
          AND o.payment_status = 'confirmed'
          AND u.role = 'provider'
        GROUP BY u.user_id, u.username, u.company_name, u.email, u.provider_markup_percentage
        HAVING total_orders > 0
      `;
      
      this.db.all(reportQuery, [startDate.toISOString(), endDate.toISOString()], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const providers = rows.map(provider => ({
          ...provider,
          total_revenue: parseFloat(provider.total_revenue) || 0,
          platform_fee_amount: parseFloat(provider.platform_fee_amount) || 0,
          provider_payment: parseFloat(provider.provider_payment) || 0
        }));
        
        const totalRevenue = providers.reduce((sum, p) => sum + p.total_revenue, 0);
        const totalPlatformFees = providers.reduce((sum, p) => sum + p.platform_fee_amount, 0);
        const totalProviderPayments = providers.reduce((sum, p) => sum + p.provider_payment, 0);
        
        resolve({
          month,
          year,
          total_providers: providers.length,
          total_revenue: totalRevenue,
          total_platform_fees: totalPlatformFees,
          total_provider_payments: totalProviderPayments,
          providers
        });
      });
    });
  }

  // Save monthly report to database (overwrites if exists)
  async saveMonthlyReport(reportData) {
    return new Promise((resolve, reject) => {
      // First, delete any existing report for this month/year
      const deleteSql = `DELETE FROM monthly_reports WHERE month = ? AND year = ?`;
      
      this.db.run(deleteSql, [reportData.month, reportData.year], (err) => {
        if (err) {
          console.error('Error deleting existing report:', err);
        }
        
        // Now insert the new report
        const sql = `
          INSERT INTO monthly_reports (month, year, total_providers, total_revenue, 
                                     total_platform_fees, total_provider_payments, report_data, generated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        this.db.run(sql, [
          reportData.month,
          reportData.year,
          reportData.total_providers,
          reportData.total_revenue,
          reportData.total_platform_fees,
          reportData.total_provider_payments,
          JSON.stringify(reportData),
          1 // System user ID
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });
    });
  }

  // Generate PDFs for all providers
  async generateProviderPDFs(reportData, reportId) {
    for (const provider of reportData.providers) {
      try {
        const pdfResult = await this.pdfGenerator.generateProviderInvoice(provider, reportData);
        
        if (pdfResult.success) {
          // Save invoice record
          await this.saveProviderInvoice(reportId, provider, reportData, pdfResult.filepath);
          
          // Create notification
          await this.notificationService.notifyInvoiceGenerated(provider, reportData);
        }
      } catch (error) {
        console.error(`Error generating PDF for ${provider.provider_company}:`, error);
      }
    }
  }

  // Save provider invoice record
  async saveProviderInvoice(reportId, provider, reportData, pdfPath) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO provider_invoices (report_id, provider_id, month, year, total_revenue,
                                     provider_markup_percentage, provider_payment, platform_fee, invoice_pdf_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        reportId,
        provider.provider_id,
        reportData.month,
        reportData.year,
        provider.total_revenue,
        provider.provider_markup_percentage,
        provider.provider_payment,
        provider.platform_fee_amount,
        pdfPath
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Get existing report
  async getExistingReport(month, year) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM monthly_reports WHERE month = ? AND year = ?`;
      
      this.db.get(sql, [month, year], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Cleanup old notifications
  async cleanupOldNotifications() {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM system_notifications 
        WHERE created_at < datetime('now', '-30 days')
      `;
      
      this.db.run(sql, [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`🧹 Cleaned up ${this.changes} old notifications`);
          resolve(this.changes);
        }
      });
    });
  }

  // Notify providers about their monthly reports
  async notifyProvidersAboutReports(reportData, reportId) {
    for (const provider of reportData.providers) {
      try {
        // Get previous month data for comparison
        const previousMonthData = await this.aiMotivationAssistant.getPreviousMonthData(
          provider.provider_id, 
          reportData.month, 
          reportData.year
        );
        
        // Generate AI motivational message
        const motivationData = await this.aiMotivationAssistant.generateMotivationalMessage(
          provider, 
          reportData, 
          previousMonthData
        );
        
        const title = `Monthly Report Available - ${new Date(reportData.year, reportData.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        const message = `Your monthly report is ready! You earned €${provider.provider_payment.toFixed(2)} from ${provider.total_orders} orders. ` +
                       `Total revenue: €${provider.total_revenue.toFixed(2)}. ` +
                       `Platform fee: €${provider.platform_fee_amount.toFixed(2)}. ` +
                       `Click to view detailed report and download your invoice.`;
        
        await this.notificationService.createNotification(
          'provider_monthly_report',
          title,
          message,
          { 
            provider: provider, 
            report: reportData, 
            reportId: reportId,
            month: reportData.month,
            year: reportData.year,
            motivation: motivationData // Include AI motivation data
          },
          provider.provider_id, // Send to specific provider
          'normal'
        );
        
        console.log(`📧 Notification with AI motivation sent to provider ${provider.provider_company} (ID: ${provider.provider_id})`);
        console.log(`🤖 Motivation tone: ${motivationData.motivational_tone}, Trend: ${motivationData.performance_trend}`);
      } catch (error) {
        console.error(`Error notifying provider ${provider.provider_company}:`, error);
      }
    }
  }

  // Manual trigger for testing
  async triggerMonthlyReport(month, year) {
    console.log(`🔧 Manual trigger for monthly report: ${month}/${year}`);
    await this.generateMonthlyReport();
  }
}

module.exports = AutomatedScheduler;
