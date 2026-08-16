const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Initialize transporter based on environment variables
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Gmail (and most providers) reject From addresses that don't match the
   * authenticated mailbox. Prefer SMTP_FROM, then SMTP_USER, then a local default.
   */
  getFromAddress() {
    const from = (process.env.SMTP_FROM || '').trim();
    if (from) return from;
    const user = (process.env.SMTP_USER || '').trim();
    if (user) return user;
    return 'noreply@makerset.com';
  }

  initializeTransporter() {
    // Check if email configuration is available
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // If no SMTP credentials are provided, use a test account
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.log('📧 No SMTP credentials found. Using test account for email service.');
      console.log('📧 To enable real email sending, set SMTP_USER and SMTP_PASS environment variables.');
      
      // Create a test transporter (emails will be logged but not sent)
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
      
      this.isTestMode = true;
    } else {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.isTestMode = false;
      console.log('📧 SMTP configured. From address:', this.getFromAddress());
    }
  }

  async sendOrderConfirmation(orderData, customerEmail) {
    try {
      const orderSummary = this.generateOrderSummaryHTML(orderData);
      
      const mailOptions = {
        from: this.getFromAddress(),
        to: customerEmail,
        subject: `Order Confirmation - ${orderData.order_number}`,
        html: orderSummary,
        text: this.generateOrderSummaryText(orderData)
      };

      if (this.isTestMode) {
        // In test mode, log the email instead of sending
        console.log('📧 TEST MODE - Email would be sent:');
        console.log('📧 To:', customerEmail);
        console.log('📧 Subject:', mailOptions.subject);
        console.log('📧 Content:', orderSummary);
        return { success: true, message: 'Email logged (test mode)' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Order confirmation email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('📧 Error sending order confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  generateOrderSummaryHTML(orderData) {
    const itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.set_name || `Set ID: ${item.set_id}`}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${item.unit_price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">€${item.line_total.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; }
          .content { padding: 20px 0; }
          .order-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f4f4f4; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
            <p>Thank you for your order!</p>
          </div>
          
          <div class="content">
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${orderData.order_number}</p>
              <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${orderData.status}</p>
              <p><strong>Company:</strong> ${orderData.company_name}</p>
              <p><strong>Customer:</strong> ${orderData.customer_first_name} ${orderData.customer_last_name}</p>
              <p><strong>Email:</strong> ${orderData.customer_email}</p>
            </div>

            <h3>Order Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="total">
              <strong>Total Amount: €${orderData.total_amount.toFixed(2)}</strong>
            </div>

            ${orderData.shipping_address ? `
            <div class="order-details">
              <h3>Shipping Address</h3>
              <p>${orderData.shipping_address.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}

            ${orderData.notes ? `
            <div class="order-details">
              <h3>Notes</h3>
              <p>${orderData.notes}</p>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>If you have any questions about your order, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOrderSummaryText(orderData) {
    const itemsText = orderData.items.map(item => 
      `- ${item.set_name || `Set ID: ${item.set_id}`} x${item.quantity} = €${item.line_total.toFixed(2)}`
    ).join('\n');

    return `
Order Confirmation

Order Number: ${orderData.order_number}
Order Date: ${new Date(orderData.created_at).toLocaleDateString()}
Status: ${orderData.status}

Customer Information:
Company: ${orderData.company_name}
Name: ${orderData.customer_first_name} ${orderData.customer_last_name}
Email: ${orderData.customer_email}

Order Items:
${itemsText}

Total Amount: €${orderData.total_amount.toFixed(2)}

${orderData.shipping_address ? `Shipping Address:\n${orderData.shipping_address}\n` : ''}
${orderData.notes ? `Notes:\n${orderData.notes}\n` : ''}

Thank you for your order!
    `.trim();
  }

  async sendLoginCode(email, code) {
    try {
      const mailOptions = {
        from: this.getFromAddress(),
        to: email,
        subject: 'Your MakerSet login code',
        text: `Your MakerSet login code is ${code}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Your login code</h2>
            <p>Use this 6-digit code to sign in to MakerSet:</p>
            <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</p>
            <p style="color: #666;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
          </div>
        `
      };

      if (this.isTestMode) {
        console.log('📧 TEST MODE - Login code email would be sent:');
        console.log('📧 To:', email);
        console.log('📧 Code:', code);
        return { success: true, message: 'Email logged (test mode)', testMode: true };
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Login code email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId, testMode: false };
    } catch (error) {
      console.error('📧 Error sending login code email:', error);
      const raw = String(error && error.message ? error.message : error);
      // Safe, non-secret hint for common Gmail From / auth misconfiguration
      const fromHint = /sender|from address|550|553|mailbox unavailable|invalid login|username and password|authentication|eauth|enalfrom/i.test(raw);
      return {
        success: false,
        error: raw,
        testMode: this.isTestMode,
        likelyFromOrAuthIssue: fromHint,
      };
    }
  }

  async testConnection() {
    try {
      if (this.isTestMode) {
        console.log('📧 Email service is in test mode - no actual SMTP connection');
        return { success: true, mode: 'test' };
      }

      await this.transporter.verify();
      console.log('📧 SMTP connection verified successfully');
      return { success: true, mode: 'production' };
    } catch (error) {
      console.error('📧 SMTP connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
