export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  css: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  dueDate: string;
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    logo?: string;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
      iban: string;
      swift: string;
    };
  };
  customer: {
    name: string;
    company: string;
    email: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  status: string;
  paymentTerms: string;
}

export class SimpleInvoiceService {
  private static templates: InvoiceTemplate[] = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean, modern design with subtle colors',
      preview: 'Modern template preview',
      css: `
        .invoice-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #ffffff;
          color: #333;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }
        .company-info h1 {
          color: #2c3e50;
          margin: 0;
          font-size: 28px;
          font-weight: 300;
        }
        .company-details {
          color: #7f8c8d;
          font-size: 14px;
          line-height: 1.4;
        }
        .invoice-details {
          text-align: right;
          color: #34495e;
        }
        .invoice-details h2 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          font-size: 24px;
        }
        .invoice-meta {
          font-size: 14px;
          line-height: 1.6;
        }
        .customer-section {
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .customer-section h3 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 18px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        .items-table th {
          background: #34495e;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 500;
        }
        .items-table td {
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
        }
        .items-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        .totals-section {
          margin-top: 30px;
          text-align: right;
        }
        .totals-table {
          display: inline-block;
          min-width: 300px;
        }
        .totals-table td {
          padding: 8px 15px;
          border-bottom: 1px solid #e0e0e0;
        }
        .totals-table .total-row {
          font-weight: bold;
          font-size: 18px;
          background: #34495e;
          color: white;
        }
        .notes-section {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .notes-section h3 {
          margin: 0 0 15px 0;
          color: #2c3e50;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #7f8c8d;
          font-size: 12px;
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
        }
      `
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional business invoice design',
      preview: 'Classic template preview',
      css: `
        .invoice-container {
          font-family: 'Times New Roman', serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #ffffff;
          color: #000;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #000;
        }
        .company-info h1 {
          color: #000;
          margin: 0;
          font-size: 32px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .company-details {
          color: #333;
          font-size: 14px;
          line-height: 1.5;
          margin-top: 10px;
        }
        .invoice-details {
          text-align: right;
          color: #000;
        }
        .invoice-details h2 {
          margin: 0 0 15px 0;
          color: #000;
          font-size: 28px;
          font-weight: bold;
        }
        .invoice-meta {
          font-size: 14px;
          line-height: 1.8;
        }
        .customer-section {
          margin: 30px 0;
          padding: 20px;
          border: 2px solid #000;
        }
        .customer-section h3 {
          margin: 0 0 15px 0;
          color: #000;
          font-size: 20px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
          border: 2px solid #000;
        }
        .items-table th {
          background: #000;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: bold;
          text-transform: uppercase;
        }
        .items-table td {
          padding: 15px;
          border-bottom: 1px solid #000;
          border-right: 1px solid #000;
        }
        .items-table td:last-child {
          border-right: none;
        }
        .totals-section {
          margin-top: 30px;
          text-align: right;
        }
        .totals-table {
          display: inline-block;
          min-width: 300px;
          border: 2px solid #000;
        }
        .totals-table td {
          padding: 10px 15px;
          border-bottom: 1px solid #000;
        }
        .totals-table .total-row {
          font-weight: bold;
          font-size: 20px;
          background: #000;
          color: white;
        }
        .notes-section {
          margin-top: 30px;
          padding: 20px;
          border: 2px solid #000;
        }
        .notes-section h3 {
          margin: 0 0 15px 0;
          color: #000;
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 2px solid #000;
          padding-top: 20px;
        }
      `
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple, clean design with minimal styling',
      preview: 'Minimal template preview',
      css: `
        .invoice-container {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #ffffff;
          color: #333;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .company-info h1 {
          color: #333;
          margin: 0;
          font-size: 24px;
          font-weight: normal;
        }
        .company-details {
          color: #666;
          font-size: 14px;
          line-height: 1.4;
          margin-top: 5px;
        }
        .invoice-details {
          text-align: right;
          color: #333;
        }
        .invoice-details h2 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 20px;
          font-weight: normal;
        }
        .invoice-meta {
          font-size: 14px;
          line-height: 1.6;
        }
        .customer-section {
          margin: 30px 0;
        }
        .customer-section h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
          font-weight: normal;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        .items-table th {
          background: #f5f5f5;
          color: #333;
          padding: 12px;
          text-align: left;
          font-weight: normal;
          border-bottom: 1px solid #ddd;
        }
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
        .totals-section {
          margin-top: 30px;
          text-align: right;
        }
        .totals-table {
          display: inline-block;
          min-width: 250px;
        }
        .totals-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
        }
        .totals-table .total-row {
          font-weight: bold;
          font-size: 16px;
          border-top: 2px solid #333;
        }
        .notes-section {
          margin-top: 30px;
        }
        .notes-section h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
          font-weight: normal;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #999;
          font-size: 12px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      `
    }
  ];

  static getTemplates(): InvoiceTemplate[] {
    return this.templates;
  }

  static getTemplate(id: string): InvoiceTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  static generateInvoiceHTML(data: InvoiceData, templateId: string = 'modern'): string {
    const template = this.getTemplate(templateId) || this.templates[0];
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${data.invoiceNumber}</title>
        <style>
          ${template.css}
          @media print {
            .invoice-container {
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="company-info">
              <h1>${data.company.name}</h1>
              <div class="company-details">
                ${data.company.address}<br>
                Phone: ${data.company.phone}<br>
                Email: ${data.company.email}<br>
                ${data.company.website ? `Website: ${data.company.website}<br>` : ''}
                ${data.company.taxId ? `Tax ID: ${data.company.taxId}<br>` : ''}
                ${data.company.bankAccount ? `
                <br><strong>Bank Details:</strong><br>
                Bank: ${data.company.bankAccount.bankName}<br>
                Account: ${data.company.bankAccount.accountNumber}<br>
                IBAN: ${data.company.bankAccount.iban}<br>
                SWIFT: ${data.company.bankAccount.swift}
                ` : ''}
              </div>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <div class="invoice-meta">
                Invoice #: ${data.invoiceNumber}<br>
                Order #: ${data.orderNumber}<br>
                Date: ${data.date}<br>
                Due Date: ${data.dueDate}<br>
                Status: ${data.status}
              </div>
            </div>
          </div>

          <div class="customer-section">
            <h3>Bill To:</h3>
            <div>
              <strong>${data.customer.name}</strong><br>
              ${data.customer.company ? `${data.customer.company}<br>` : ''}
              ${data.customer.email}<br>
              ${data.customer.address}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>€${item.unitPrice.toFixed(2)}</td>
                  <td>€${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td>€${data.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax (${(data.taxRate * 100).toFixed(1)}%):</td>
                <td>€${data.taxAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td>€${data.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${data.notes ? `
            <div class="notes-section">
              <h3>Notes</h3>
              <p>${data.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Payment Terms: ${data.paymentTerms}</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static downloadInvoice(data: InvoiceData, templateId: string = 'modern', filename?: string): void {
    const html = this.generateInvoiceHTML(data, templateId);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `invoice-${data.invoiceNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static printInvoice(data: InvoiceData, templateId: string = 'modern'): void {
    const html = this.generateInvoiceHTML(data, templateId);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  static copyInvoiceToClipboard(data: InvoiceData, templateId: string = 'modern'): Promise<void> {
    const html = this.generateInvoiceHTML(data, templateId);
    return navigator.clipboard.writeText(html);
  }
}
