import { PDFDocument, PDFForm, PDFTextField, PDFPage, rgb } from 'pdf-lib';

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

export interface AnalyticsReportData {
  title: string;
  generated: string;
  reportType: string;
  summary: {
    totalUsers?: number;
    totalSales?: number;
    totalRevenue?: number;
    totalOrders?: number;
    averageOrderValue?: number;
    conversionRate?: number;
    userGrowth?: number;
    activeUsers?: number;
  };
  overview?: {
    totalUsers?: number;
    totalSets?: number;
    totalOrders?: number;
    totalRevenue?: number;
  };
}

class PDFTemplateService {
  private async loadTemplate(templateName: string): Promise<PDFDocument> {
    try {
      // For now, we'll create a simple template programmatically
      // In production, you would load actual PDF templates from assets
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      // Add basic template structure
      this.addTemplateStructure(page, templateName);
      
      return pdfDoc;
    } catch (error) {
      console.error('Error loading PDF template:', error);
      throw new Error(`Failed to load PDF template: ${templateName}`);
    }
  }

  private addTemplateStructure(page: PDFPage, templateName: string) {
    const { width, height } = page.getSize();
    
    // Add header
    page.drawText('MakerSet Solutions', {
      x: 50,
      y: height - 50,
      size: 24,
      color: rgb(0, 0, 0), // Primary blue
    });

    page.drawText('123 Innovation Street, Tech City, TC 12345, Estonia', {
      x: 50,
      y: height - 70,
      size: 10,
      color: rgb(0, 0, 0),
    });

    page.drawText('Phone: +372 123 4567 | Email: info@makerset.com', {
      x: 50,
      y: height - 85,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Add title based on template type
    const title = templateName === 'invoice' ? 'INVOICE' : 'ANALYTICS REPORT';
    page.drawText(title, {
      x: width - 150,
      y: height - 50,
      size: 20,
      color: rgb(0, 0, 0),
    });

    // Add line separator
    page.drawLine({
      start: { x: 50, y: height - 100 },
      end: { x: width - 50, y: height - 100 },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
  }

  async generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size (8.5" x 11")
      const { width, height } = page.getSize();

      // Print-safe margins (0.5" margins)
      const margin = 36; // 0.5 inch in points
      const contentWidth = width - (margin * 2);
      const contentHeight = height - (margin * 2);

      // Professional header with company branding
      this.addProfessionalHeader(page, data, margin, contentWidth);

      // Invoice details section
      let yPosition = height - margin - 150;
      this.addInvoiceDetails(page, data, yPosition, width, margin);

      // Customer information section
      yPosition = height - margin - 150;
      this.addCustomerInfo(page, data, yPosition, margin);

      // Items table
      yPosition = height - margin - 300;
      yPosition = this.addItemsTable(page, pdfDoc, data, yPosition, margin, contentWidth);

      // Totals section
      yPosition = this.addTotalsSection(page, data, yPosition, margin, contentWidth);

      // Notes section
      if (data.notes) {
        yPosition = this.addNotesSection(page, data, yPosition, margin);
      }

      // Professional footer
      this.addProfessionalFooter(page, data, margin);

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addProfessionalHeader(page: PDFPage, data: InvoiceData, margin: number, contentWidth: number) {
    const { width, height } = page.getSize();
    
    // Improved header design with better spacing
    const headerHeight = 140; // Increased height for better spacing
    const logoAreaWidth = 100;
    const companyAreaWidth = 300;
    const invoiceAreaWidth = 200;
    
    // Main header background - white
    page.drawRectangle({
      x: margin,
      y: height - margin - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(1, 1, 1), // White background
    });
    
    // Solid blue background - no gradient overlay

    // Logo area - left side
    const logoX = margin + 15;
    const logoY = height - margin - 50;
    const logoSize = 70;
    
    // Logo placeholder - black border
    page.drawRectangle({
      x: logoX,
      y: logoY - logoSize,
      width: logoSize,
      height: logoSize,
      borderColor: rgb(0, 0, 0), // Black border
      borderWidth: 2,
    });
    
    // Logo text
    page.drawText('MS', {
      x: logoX + 22,
      y: logoY - 40,
      size: 20,
      color: rgb(0, 0, 0), // Black text
    });
    
    // Company name and tagline - center area
    const companyX = margin + logoAreaWidth + 20;
    const companyY = height - margin - 40;
    
    // Company name
    page.drawText(data.company.name, {
      x: companyX,
      y: companyY,
      size: 28,
      color: rgb(0, 0, 0), // Black text
    });

    // Company tagline
    page.drawText('STEM Education Solutions', {
      x: companyX,
      y: companyY - 22,
      size: 12,
      color: rgb(0, 0, 0), // Black text
    });

    // Invoice title - right side
    const invoiceTitleX = width - margin - 180;
    const invoiceTitleY = height - margin - 35;
    
    // Invoice title text
    page.drawText('INVOICE', {
      x: invoiceTitleX,
      y: invoiceTitleY,
      size: 24,
      color: rgb(0, 0, 0), // Black text
    });

    // Contact information - bottom section with better organization
    const contactStartY = height - margin - 90;
    const contactLeftX = companyX;
    const contactRightX = width - margin - 200;
    
    // Left column contact info
    const leftContactInfo = [
      { label: 'Address:', value: data.company.address },
      { label: 'Phone:', value: data.company.phone },
      { label: 'Email:', value: data.company.email }
    ];

    // Right column contact info
    const rightContactInfo = [
      { label: 'Website:', value: data.company.website },
      { label: 'Tax ID:', value: data.company.taxId }
    ];

    // Add bank info to right column if available
    if (data.company.bankAccount) {
      rightContactInfo.push(
        { label: 'Bank:', value: data.company.bankAccount.bankName }
      );
    }

    // Draw left column
    let currentY = contactStartY;
    const lineHeight = 12;
    
    leftContactInfo.forEach((info, index) => {
      if (index === 0) {
        // Address - split by newlines
        const addressLines = info.value.split('\n');
        addressLines.forEach(addrLine => {
          page.drawText(`${info.label} ${addrLine}`, {
            x: contactLeftX,
            y: currentY,
            size: 9,
            color: rgb(0, 0, 0), // Black text
          });
          currentY -= lineHeight;
        });
      } else {
        page.drawText(`${info.label} ${info.value}`, {
          x: contactLeftX,
          y: currentY,
          size: 9,
          color: rgb(0, 0, 0), // Black text
        });
        currentY -= lineHeight;
      }
    });

    // Draw right column
    currentY = contactStartY;
    rightContactInfo.forEach((info) => {
      page.drawText(`${info.label} ${info.value}`, {
        x: contactRightX,
        y: currentY,
        size: 9,
        color: rgb(0, 0, 0), // Black text
      });
      currentY -= lineHeight;
    });

    // Decorative elements
    // Top accent line
    page.drawLine({
      start: { x: margin, y: height - margin - 5 },
      end: { x: width - margin, y: height - margin - 5 },
      thickness: 3,
      color: rgb(0, 0, 0), // Bright blue
    });
    
    // Bottom accent line
    page.drawLine({
      start: { x: margin, y: height - margin - headerHeight - 5 },
      end: { x: width - margin, y: height - margin - headerHeight - 5 },
      thickness: 2,
      color: rgb(0, 0, 0), // Bright blue
    });
    
    // Side accent lines
    page.drawLine({
      start: { x: margin, y: height - margin },
      end: { x: margin, y: height - margin - headerHeight },
      thickness: 2,
      color: rgb(0, 0, 0), // Black
    });
    
    page.drawLine({
      start: { x: width - margin, y: height - margin },
      end: { x: width - margin, y: height - margin - headerHeight },
      thickness: 2,
      color: rgb(0, 0, 0), // Black
    });

    // Corner accents
    page.drawCircle({
      x: width - margin - 15,
      y: height - margin - 15,
      size: 12,
      color: rgb(1, 1, 1),
    });
    
    page.drawCircle({
      x: margin + 15,
      y: height - margin - headerHeight + 15,
      size: 8,
      color: rgb(1, 1, 1),
    });
  }

  private addInvoiceDetails(page: PDFPage, data: InvoiceData, yPosition: number, width: number, margin: number) {
    // Enhanced invoice details box with shadow
    const detailsWidth = 220;
    const detailsHeight = 140;
    
    // Shadow effect
    page.drawRectangle({
      x: width - margin - detailsWidth + 3,
      y: yPosition - detailsHeight - 3,
      width: detailsWidth,
      height: detailsHeight,
      color: rgb(0, 0, 0),
    });
    
    // Main box with gradient background
    page.drawRectangle({
      x: width - margin - detailsWidth,
      y: yPosition - detailsHeight,
      width: detailsWidth,
      height: detailsHeight,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0, 0, 0),
      borderWidth: 2,
    });

    // Header background
    page.drawRectangle({
      x: width - margin - detailsWidth,
      y: yPosition - 30,
      width: detailsWidth,
      height: 30,
      color: rgb(0, 0, 0),
    });

    // Header text
    page.drawText('INVOICE DETAILS', {
      x: width - margin - detailsWidth + 10,
      y: yPosition - 20,
      size: 12,
      color: rgb(1, 1, 1),
    });

    let detailY = yPosition - 50;
    
    // Invoice details with better formatting
    const details = [
      { label: 'Invoice #:', value: data.invoiceNumber },
      { label: 'Order #:', value: data.orderNumber },
      { label: 'Date:', value: data.date },
      { label: 'Due Date:', value: data.dueDate }
    ];

    details.forEach(detail => {
      // Label with styling
      page.drawText(detail.label, {
        x: width - margin - detailsWidth + 10,
        y: detailY,
        size: 9,
        color: rgb(0, 0, 0),
      });
      
      // Value with emphasis
      page.drawText(detail.value, {
        x: width - margin - detailsWidth + 80,
        y: detailY,
        size: 10,
        color: rgb(0, 0, 0),
      });
      
      detailY -= 16;
    });
  }

  private addCustomerInfo(page: PDFPage, data: InvoiceData, yPosition: number, margin: number) {
    // Enhanced Bill To section with background
    const customerBoxHeight = 120;
    
    // Background box
    page.drawRectangle({
      x: margin,
      y: yPosition - customerBoxHeight,
      width: 300,
      height: customerBoxHeight,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Header background
    page.drawRectangle({
      x: margin,
      y: yPosition - 25,
      width: 300,
      height: 25,
      color: rgb(0, 0, 0),
    });

    // Header text
    page.drawText('BILL TO', {
      x: margin + 10,
      y: yPosition - 18,
      size: 12,
      color: rgb(1, 1, 1),
    });
    
    let customerY = yPosition - 45;

    // Customer name with emphasis
    page.drawText(data.customer.name, {
      x: margin + 10,
      y: customerY,
      size: 14,
      color: rgb(0, 0, 0),
    });
    customerY -= 20;

    // Company name
    if (data.customer.company && data.customer.company !== 'N/A') {
      page.drawText(data.customer.company, {
        x: margin + 10,
        y: customerY,
        size: 12,
        color: rgb(0, 0, 0),
      });
      customerY -= 18;
    }

    // Email
    page.drawText(data.customer.email, {
      x: margin + 10,
      y: customerY,
      size: 10,
      color: rgb(0, 0, 0),
    });
    customerY -= 15;

    // Address with better formatting
    const addressLines = data.customer.address.split('\n');
    addressLines.forEach(line => {
      page.drawText(line, {
        x: margin + 10,
        y: customerY,
        size: 11,
        color: rgb(0, 0, 0),
      });
      customerY -= 15;
    });
  }

  private addItemsTable(page: PDFPage, pdfDoc: PDFDocument, data: InvoiceData, yPosition: number, margin: number, contentWidth: number): number {
    const { width, height } = page.getSize();
    
    // Enhanced items section header
    page.drawText('ITEMS & SERVICES', {
      x: margin,
      y: yPosition,
      size: 16,
      color: rgb(0, 0, 0),
    });
    yPosition -= 35;

    // Enhanced table headers with gradient background
    const headerHeight = 30;
    page.drawRectangle({
      x: margin,
      y: yPosition - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(0, 0, 0),
    });

    // Header text with better positioning
    page.drawText('Description', {
      x: margin + 15,
      y: yPosition - 20,
      size: 12,
      color: rgb(1, 1, 1),
    });
    page.drawText('Qty', {
      x: margin + 320,
      y: yPosition - 20,
      size: 12,
      color: rgb(1, 1, 1),
    });
    page.drawText('Unit Price', {
      x: margin + 380,
      y: yPosition - 20,
      size: 12,
      color: rgb(1, 1, 1),
    });
    page.drawText('Total', {
      x: margin + 480,
      y: yPosition - 20,
      size: 12,
      color: rgb(1, 1, 1),
    });

    yPosition -= 40;

    // Items rows with enhanced styling
    data.items.forEach((item, index) => {
      // Check if we need a new page
      if (yPosition < 200) {
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = newPage.getSize().height - margin - 50;
        
        // Redraw headers on new page
        newPage.drawRectangle({
          x: margin,
          y: yPosition - headerHeight,
          width: contentWidth,
          height: headerHeight,
          color: rgb(0, 0, 0),
        });
        
        newPage.drawText('Description', {
          x: margin + 15,
          y: yPosition - 20,
          size: 12,
          color: rgb(1, 1, 1),
        });
        newPage.drawText('Qty', {
          x: margin + 320,
          y: yPosition - 20,
          size: 12,
          color: rgb(1, 1, 1),
        });
        newPage.drawText('Unit Price', {
          x: margin + 380,
          y: yPosition - 20,
          size: 12,
          color: rgb(1, 1, 1),
        });
        newPage.drawText('Total', {
          x: margin + 480,
          y: yPosition - 20,
          size: 12,
          color: rgb(1, 1, 1),
        });
        
        yPosition -= 40;
      }

      // Enhanced row styling with borders
      const rowHeight = 25;
      
      // Row background with subtle border
      page.drawRectangle({
        x: margin,
        y: yPosition - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: index % 2 === 0 ? rgb(1, 1, 1) : rgb(0.99, 0.99, 0.99),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 0.5,
      });

      // Item details with better formatting
      page.drawText(item.description, {
        x: margin + 15,
        y: yPosition - 18,
        size: 11,
        color: rgb(0, 0, 0),
      });
      page.drawText(item.quantity.toString(), {
        x: margin + 320,
        y: yPosition - 18,
        size: 11,
        color: rgb(0, 0, 0),
      });
      page.drawText(`€${item.unitPrice.toFixed(2)}`, {
        x: margin + 380,
        y: yPosition - 18,
        size: 11,
        color: rgb(0, 0, 0),
      });
      page.drawText(`€${item.total.toFixed(2)}`, {
        x: margin + 480,
        y: yPosition - 18,
        size: 11,
        color: rgb(0, 0, 0),
      });

      yPosition -= 30;
    });

    return yPosition;
  }

  private addTotalsSection(page: PDFPage, data: InvoiceData, yPosition: number, margin: number, contentWidth: number): number {
    const totalsWidth = 250;
    const totalsX = margin + contentWidth - totalsWidth;
    
    // Enhanced totals background with shadow
    page.drawRectangle({
      x: totalsX + 3,
      y: yPosition - 120 - 3,
      width: totalsWidth,
      height: 120,
      color: rgb(0, 0, 0),
    });
    
    page.drawRectangle({
      x: totalsX,
      y: yPosition - 120,
      width: totalsWidth,
      height: 120,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0, 0, 0),
      borderWidth: 2,
    });

    // Header background
    page.drawRectangle({
      x: totalsX,
      y: yPosition - 30,
      width: totalsWidth,
      height: 30,
      color: rgb(0, 0, 0),
    });

    // Header text
    page.drawText('TOTAL AMOUNT', {
      x: totalsX + 15,
      y: yPosition - 20,
      size: 12,
      color: rgb(1, 1, 1),
    });

    let totalY = yPosition - 50;
    
    // Subtotal with better formatting
    page.drawText('Subtotal:', {
      x: totalsX + 15,
      y: totalY,
      size: 11,
      color: rgb(0, 0, 0),
    });
    page.drawText(`€${data.subtotal.toFixed(2)}`, {
      x: totalsX + totalsWidth - 80,
      y: totalY,
      size: 11,
      color: rgb(0, 0, 0),
    });
    totalY -= 20;

    // Enhanced total line
    page.drawLine({
      start: { x: totalsX + 15, y: totalY },
      end: { x: totalsX + totalsWidth - 15, y: totalY },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
    totalY -= 15;

    // Enhanced total with emphasis
    page.drawText('TOTAL:', {
      x: totalsX + 15,
      y: totalY,
      size: 16,
      color: rgb(0, 0, 0),
    });
    page.drawText(`€${data.subtotal.toFixed(2)}`, {
      x: totalsX + totalsWidth - 100,
      y: totalY,
      size: 18,
      color: rgb(0, 0, 0),
    });

    return yPosition - 140;
  }

  private addNotesSection(page: PDFPage, data: InvoiceData, yPosition: number, margin: number): number {
    page.drawText('Notes:', {
      x: margin,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
    
    page.drawText(data.notes, {
      x: margin,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    return yPosition - 40;
  }

  private addProfessionalFooter(page: PDFPage, data: InvoiceData, margin: number) {
    const { height } = page.getSize();
    
    // Enhanced footer with gradient background
    const footerHeight = 120; // Increased height for bank account info
    
    // Footer background - white
    page.drawRectangle({
      x: margin,
      y: margin,
      width: page.getSize().width - (margin * 2),
      height: footerHeight,
      color: rgb(1, 1, 1), // White background
    });

    // Main footer content
    const footerY = margin + 20;
    
    // Payment terms with better styling
    page.drawText('Payment Terms:', {
      x: margin + 20,
      y: footerY + 80,
      size: 11,
      color: rgb(0, 0, 0),
    });
    page.drawText(data.paymentTerms, {
      x: margin + 120,
      y: footerY + 80,
      size: 11,
      color: rgb(0, 0, 0),
    });

    // Thank you message with emphasis
    page.drawText('Thank you for your business!', {
      x: margin + 20,
      y: footerY + 65,
      size: 12,
      color: rgb(0, 0, 0), // Black text
    });

    // Bank account information section
    if (data.company.bankAccount) {
      // Bank account header
      page.drawText('Bank Account Details:', {
        x: margin + 20,
        y: footerY + 45,
        size: 12,
        color: rgb(0, 0, 0),
      });

      // Bank account details
      const bankDetails = [
        `Bank: ${data.company.bankAccount.bankName}`,
        `Account: ${data.company.bankAccount.accountNumber}`,
        `IBAN: ${data.company.bankAccount.iban}`,
        `SWIFT: ${data.company.bankAccount.swift}`
      ];

      let bankY = footerY + 30;
      bankDetails.forEach(detail => {
        page.drawText(detail, {
          x: margin + 20,
          y: bankY,
          size: 10,
          color: rgb(0, 0, 0),
        });
        bankY -= 12;
      });
    }

    // Company info in footer with better layout
    const companyInfo = `${data.company.name} | ${data.company.website} | ${data.company.email}`;
    page.drawText(companyInfo, {
      x: margin + 300,
      y: footerY + 80,
      size: 9,
      color: rgb(0, 0, 0),
    });

    // Add decorative line at top of footer
    page.drawLine({
      start: { x: margin, y: margin + footerHeight },
      end: { x: page.getSize().width - margin, y: margin + footerHeight },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
  }

  async generateAnalyticsReportPDF(data: AnalyticsReportData): Promise<Uint8Array> {
    try {
      const pdfDoc = await this.loadTemplate('analytics');
      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();

      let yPosition = height - 120;

      // Report details
      page.drawText(`Report: ${data.title}`, {
        x: 50,
        y: yPosition,
        size: 16,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      page.drawText(`Generated: ${data.generated}`, {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      // Summary metrics
      page.drawText('Summary Metrics:', {
        x: 50,
        y: yPosition,
        size: 14,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      const metrics = [
        { label: 'Total Users', value: data.summary?.totalUsers || data.overview?.totalUsers || 0 },
        { label: 'Total Revenue', value: data.summary?.totalSales || data.summary?.totalRevenue || data.overview?.totalRevenue || 0 },
        { label: 'Total Orders', value: data.summary?.totalOrders || data.overview?.totalOrders || 0 },
        { label: 'Average Order Value', value: data.summary?.averageOrderValue || 0 },
        { label: 'Conversion Rate', value: data.summary?.conversionRate || 0 },
        { label: 'User Growth', value: data.summary?.userGrowth || 0 },
        { label: 'Active Users', value: data.summary?.activeUsers || 0 },
      ];

      metrics.forEach(metric => {
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = newPage.getSize().height - 50;
        }

        page.drawText(`${metric.label}:`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        
        const valueText = typeof metric.value === 'number' 
          ? (metric.label.includes('Rate') || metric.label.includes('Growth') 
              ? `${metric.value}%` 
              : metric.label.includes('Revenue') || metric.label.includes('Value')
                ? `€${metric.value.toLocaleString()}`
                : metric.value.toLocaleString())
          : String(metric.value);

        page.drawText(valueText, {
          x: 250,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 25;
      });

      // Footer
      yPosition = 50;
      page.drawText('Generated by MakerSet Analytics Platform', {
        x: 50,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
      page.drawText(`Report Type: ${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)}`, {
        x: 50,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating analytics report PDF:', error);
      throw new Error(`Failed to generate analytics report PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadPDF(pdfBytes: Uint8Array, filename: string): Promise<void> {
    try {
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const pdfTemplateService = new PDFTemplateService();
