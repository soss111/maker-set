const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database connection
const dbPath = path.join(__dirname, '..', 'database', 'makerset.db');
const db = new sqlite3.Database(dbPath);

class NotificationService {
  constructor() {
    this.db = db;
  }

  // Create a notification
  async createNotification(type, title, message, data = null, createdFor = null, priority = 'normal') {
    return new Promise((resolve, reject) => {
      // Handle both old signature (separate params) and new signature (object)
      const params = typeof type === 'object' ? type : { type, title, message, data, createdFor, priority };
      
      const sql = `
        INSERT INTO system_notifications (type, title, message, data, created_for, priority)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        params.type,
        params.title,
        params.message,
        params.data ? JSON.stringify(params.data) : null,
        params.createdFor || params.created_for || null,
        params.priority
      ], function(err) {
        if (err) {
          console.error('Error creating notification:', err);
          reject(err);
        } else {
          console.log(`📢 Notification created: ${params.title}`);
          resolve(this.lastID);
        }
      });
    });
  }

  // Get notifications for a user (or all admin notifications if user is admin)
  async getNotifications(userId, userRole, limit = 50) {
    return new Promise((resolve, reject) => {
      let sql, params;
      
      if (userRole === 'admin') {
        // Admins see all notifications
        sql = `
          SELECT * FROM system_notifications 
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        params = [limit];
      } else {
        // Other users see only their notifications
        sql = `
          SELECT * FROM system_notifications 
          WHERE created_for = ? OR created_for IS NULL
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        params = [userId, limit];
      }
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error fetching notifications:', err);
          reject(err);
        } else {
          const notifications = rows.map(row => ({
            ...row,
            data: row.data ? JSON.parse(row.data) : null,
            is_read: Boolean(row.is_read)
          }));
          resolve(notifications);
        }
      });
    });
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE system_notifications SET is_read = 1 WHERE notification_id = ?`;
      
      this.db.run(sql, [notificationId], function(err) {
        if (err) {
          console.error('Error marking notification as read:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Get unread count for a user
  async getUnreadCount(userId, userRole) {
    return new Promise((resolve, reject) => {
      let sql, params;
      
      if (userRole === 'admin') {
        sql = `SELECT COUNT(*) as count FROM system_notifications WHERE is_read = 0`;
        params = [];
      } else {
        sql = `SELECT COUNT(*) as count FROM system_notifications WHERE (created_for = ? OR created_for IS NULL) AND is_read = 0`;
        params = [userId];
      }
      
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Error getting unread count:', err);
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  // Create monthly report notification
  async notifyMonthlyReportGenerated(reportData) {
    const title = `Monthly Report Generated - ${reportData.month}/${reportData.year}`;
    const message = `Monthly report for ${reportData.month}/${reportData.year} has been generated. ` +
                   `Total providers: ${reportData.total_providers}, ` +
                   `Total revenue: €${reportData.total_revenue.toFixed(2)}, ` +
                   `Total provider payments: €${reportData.total_provider_payments.toFixed(2)}`;
    
    return await this.createNotification(
      'monthly_report',
      title,
      message,
      reportData,
      null, // For all admins
      'normal'
    );
  }

  // Create provider payment notification
  async notifyProviderPayment(providerData, reportData) {
    const title = `Payment Processed - ${providerData.provider_company}`;
    const message = `Payment of €${providerData.provider_payment.toFixed(2)} has been processed ` +
                   `for ${providerData.provider_company} for ${reportData.month}/${reportData.year}`;
    
    return await this.createNotification(
      'provider_payment',
      title,
      message,
      { provider: providerData, report: reportData },
      null, // For all admins
      'normal'
    );
  }

  // Create invoice generated notification
  async notifyInvoiceGenerated(providerData, invoiceData) {
    const title = `Invoice Generated - ${providerData.provider_company}`;
    const message = `PDF invoice has been generated for ${providerData.provider_company} ` +
                   `for ${invoiceData.month}/${invoiceData.year}. ` +
                   `Amount: €${providerData.provider_payment.toFixed(2)}`;
    
    return await this.createNotification(
      'invoice_generated',
      title,
      message,
      { provider: providerData, invoice: invoiceData },
      null, // For all admins
      'normal'
    );
  }
}

module.exports = NotificationService;
