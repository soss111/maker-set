const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PDFGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'generated-invoices');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateProviderInvoice(providerData, reportData) {
    try {
      console.log(`📄 Generating PDF invoice for ${providerData.provider_company}`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Generate HTML content for the invoice
      const htmlContent = this.generateInvoiceHTML(providerData, reportData);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generate filename
      const filename = `invoice-${providerData.provider_company.replace(/[^a-zA-Z0-9]/g, '-')}-${reportData.month}-${reportData.year}.pdf`;
      const filepath = path.join(this.outputDir, filename);
      
      // Generate PDF
      await page.pdf({
        path: filepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      await browser.close();
      
      console.log(`✅ PDF generated: ${filepath}`);
      return {
        success: true,
        filepath: filepath,
        filename: filename,
        url: `/api/invoices/download/${filename}`
      };
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateInvoiceHTML(providerData, reportData) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = monthNames[reportData.month - 1];
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${providerData.provider_company}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #007bff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }
        .invoice-title {
          font-size: 28px;
          margin: 10px 0;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .provider-info, .maker-info {
          width: 45%;
        }
        .info-section h3 {
          color: #007bff;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .summary-table th, .summary-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .summary-table th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        .total-row {
          background-color: #e9ecef;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .payment-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">MakerSet Platform</div>
        <div class="invoice-title">Provider Payment Invoice</div>
        <div>Invoice Period: ${monthName} ${reportData.year}</div>
      </div>
      
      <div class="invoice-details">
        <div class="provider-info">
          <h3>Provider Information</h3>
          <p><strong>Company:</strong> ${providerData.provider_company}</p>
          <p><strong>Contact:</strong> ${providerData.provider_name}</p>
          <p><strong>Email:</strong> ${providerData.provider_email}</p>
        </div>
        
        <div class="maker-info">
          <h3>MakerSet Platform</h3>
          <p><strong>Company:</strong> MakerSet Platform</p>
          <p><strong>Address:</strong> [Your Business Address]</p>
          <p><strong>Email:</strong> admin@makerset.com</p>
        </div>
      </div>
      
      <table class="summary-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Value</th>
            <th>Amount (€)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Orders Delivered</td>
            <td>${providerData.total_orders}</td>
            <td>-</td>
          </tr>
          <tr>
            <td>Total Revenue Generated</td>
            <td>-</td>
            <td>${providerData.total_revenue.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Provider Markup (${providerData.provider_markup_percentage}%)</td>
            <td>-</td>
            <td>${providerData.provider_payment.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Platform Fee (${(100 - providerData.provider_markup_percentage).toFixed(1)}%)</td>
            <td>-</td>
            <td>${providerData.platform_fee_amount.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Total Payment Due</strong></td>
            <td>-</td>
            <td><strong>€${providerData.provider_payment.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Payment Method:</strong> Bank Transfer</p>
        <p><strong>Payment Reference:</strong> MS-${reportData.year}-${reportData.month.toString().padStart(2, '0')}-${providerData.provider_id}</p>
        <p><strong>Due Date:</strong> ${new Date(reportData.year, reportData.month, 15).toLocaleDateString()}</p>
      </div>
      
      <div class="footer">
        <p>This invoice was automatically generated by the MakerSet Platform.</p>
        <p>For any questions regarding this invoice, please contact our support team.</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = PDFGenerator;
