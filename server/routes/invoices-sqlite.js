const express = require('express');
const router = express.Router();
const db = require('../utils/sqliteConnectionManager');
const path = require('path');
const fs = require('fs').promises;

// Generate invoice PDF for an order
router.post('/generate/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order details
    const orderQuery = `
      SELECT 
        o.*,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.company_name as customer_company_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.user_id
      WHERE o.order_id = ?
    `;
    
    const orderResult = await db.query(orderQuery, [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*,
        s.name as set_name,
        s.description as set_description
      FROM order_items oi
      LEFT JOIN sets s ON oi.set_id = s.set_id
      WHERE oi.order_id = ?
    `;
    
    const itemsResult = await db.query(itemsQuery, [orderId]);
    const items = itemsResult.rows;
    
    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${order.order_id.toString().padStart(6, '0')}`,
      orderNumber: order.order_number,
      date: new Date(order.created_at).toLocaleDateString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
      company: {
        name: 'MakerSet Solutions',
        address: '123 Innovation Street, Tech City, TC 12345, Estonia',
        phone: '+372 123 4567',
        email: 'info@makerset.com',
        website: 'www.makerset.com',
        taxId: 'EE123456789',
        bankAccount: {
          bankName: 'Estonian Bank',
          accountNumber: '1234567890',
          iban: 'EE123456789012345678',
          swift: 'ESTBEE2X'
        }
      },
      customer: {
        name: `${order.customer_first_name || 'Customer'} ${order.customer_last_name || 'Name'}`,
        company: order.customer_company_name || '',
        email: order.customer_email || 'customer@example.com',
        address: order.shipping_address || 'No address provided'
      },
      items: items.map(item => {
        let description;
        if (item.set_id === null || item.set_id === '') {
          description = 'Shipment handling and transport';
        } else if (item.set_name) {
          description = item.set_name;
        } else {
          description = 'MakerSet Product';
        }
        
        return {
          description: description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.line_total
        };
      }),
      subtotal: order.total_amount,
      tax: 0, // No tax for now
      total: order.total_amount,
      notes: order.notes || '',
      paymentMethod: order.payment_method || 'Invoice',
      paymentStatus: order.payment_status || 'Pending'
    };
    
    // Generate HTML invoice
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    // Create invoices directory if it doesn't exist
    const invoicesDir = path.join(__dirname, '..', 'generated-invoices');
    try {
      await fs.mkdir(invoicesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save HTML file
    const filename = `invoice-${order.order_number}-${Date.now()}.html`;
    const filepath = path.join(invoicesDir, filename);
    await fs.writeFile(filepath, htmlContent, 'utf8');
    
    // Update order with invoice generated flag
    await db.run(
      'UPDATE orders SET invoice_generated = 1 WHERE order_id = ?',
      [orderId]
    );
    
    res.json({
      success: true,
      message: 'Invoice generated successfully',
      invoiceNumber: invoiceData.invoiceNumber,
      filename: filename,
      downloadUrl: `/api/invoices/download/${filename}`,
      invoiceData: invoiceData
    });
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Download invoice file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '..', 'generated-invoices', filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
    } catch (error) {
      return res.status(404).json({ error: 'Invoice file not found' });
    }
    
    res.download(filepath, filename);
    
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

// Generate HTML invoice content
function generateInvoiceHTML(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .company-info h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
        }
        .company-info p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-details h2 {
            color: #e74c3c;
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        .invoice-details p {
            margin: 3px 0;
            color: #666;
            font-size: 14px;
        }
        .customer-info {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .customer-info h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .customer-info p {
            margin: 3px 0;
            color: #666;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .items-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .items-table .text-right {
            text-align: right;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals table {
            width: 100%;
        }
        .totals td {
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
        }
        .totals .total-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #f8f9fa;
        }
        .payment-info {
            margin-top: 30px;
            padding: 20px;
            background-color: #e8f5e8;
            border-radius: 5px;
            border-left: 4px solid #27ae60;
        }
        .payment-info h3 {
            margin: 0 0 10px 0;
            color: #27ae60;
        }
        .payment-info p {
            margin: 3px 0;
            color: #2c3e50;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <h1>${data.company.name}</h1>
                <p>${data.company.address}</p>
                <p>Phone: ${data.company.phone} | Email: ${data.company.email}</p>
                <p>Website: ${data.company.website}</p>
                <p>Tax ID: ${data.company.taxId}</p>
            </div>
            <div class="invoice-details">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Order #:</strong> ${data.orderNumber}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
            </div>
        </div>
        
        <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${data.customer.name}</strong></p>
            ${data.customer.company ? `<p>${data.customer.company}</p>` : ''}
            <p>${data.customer.email}</p>
            <p>${data.customer.address}</p>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">€${item.unitPrice.toFixed(2)}</td>
                        <td class="text-right">€${item.total.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">€${data.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Tax:</td>
                    <td class="text-right">€${data.tax.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td>Total:</td>
                    <td class="text-right">€${data.total.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <div class="payment-info">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            <p><strong>Status:</strong> ${data.paymentStatus}</p>
            <p><strong>Bank Account:</strong> ${data.company.bankAccount.bankName}</p>
            <p><strong>Account Number:</strong> ${data.company.bankAccount.accountNumber}</p>
            <p><strong>IBAN:</strong> ${data.company.bankAccount.iban}</p>
            <p><strong>SWIFT:</strong> ${data.company.bankAccount.swift}</p>
        </div>
        
        ${data.notes ? `
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h4>Notes:</h4>
            <p>${data.notes}</p>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>This invoice was automatically generated by the MakerSet Platform.</p>
            <p>For any questions regarding this invoice, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
  `;
}

module.exports = router;
