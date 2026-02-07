import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { Order } from '../services/api';
import { SimpleInvoiceService, InvoiceData } from '../services/simpleInvoiceService';
import { SystemSettingsService } from '../services/systemSettingsService';

interface InvoiceGeneratorProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  open,
  onClose,
  order,
}) => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open && order) {
      const data = convertOrderToInvoiceData(order);
      setInvoiceData(data);
    }
  }, [open, order]);

  const convertOrderToInvoiceData = (order: Order): InvoiceData => {
    const settings = SystemSettingsService.getSettings();
    const invoiceSettings = SystemSettingsService.getInvoiceSettings();
    const companyInfo = SystemSettingsService.getCompanyInfo();
    
    const invoiceNumber = `${settings.invoicePrefix}-${order.order_id.toString().padStart(6, '0')}`;
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    return {
      invoiceNumber,
      orderNumber: order.order_number,
      date: orderDate,
      dueDate,
      company: companyInfo,
      customer: {
        name: `${order.customer_first_name} ${order.customer_last_name}`,
        company: order.company_name || '',
        email: order.customer_email || '',
        address: order.shipping_address || '',
      },
      items: order.items?.map(item => ({
        description: item.set_name || 'Handling, Packaging & Transport',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price.toString()),
        total: parseFloat(item.line_total.toString()),
      })) || [],
      subtotal: parseFloat(order.total_amount),
      taxRate: invoiceSettings.taxRate,
      taxAmount: parseFloat(order.total_amount) * invoiceSettings.taxRate,
      total: parseFloat(order.total_amount) * (1 + invoiceSettings.taxRate),
      notes: order.notes || '',
      status: order.status,
      paymentTerms: invoiceSettings.paymentTerms,
    };
  };

  const handlePreview = () => {
    if (invoiceData) {
      const templateId = SystemSettingsService.getInvoiceSettings().template;
      const html = SimpleInvoiceService.generateInvoiceHTML(invoiceData, templateId);
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(html);
        previewWindow.document.close();
      }
    }
  };

  const handleDownload = () => {
    if (invoiceData) {
      setLoading(true);
      try {
        const templateId = SystemSettingsService.getInvoiceSettings().template;
        SimpleInvoiceService.downloadInvoice(invoiceData, templateId);
        setSuccess('Invoice downloaded successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error('Download failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = () => {
    if (invoiceData) {
      setLoading(true);
      try {
        const templateId = SystemSettingsService.getInvoiceSettings().template;
        SimpleInvoiceService.printInvoice(invoiceData, templateId);
        setSuccess('Invoice sent to printer!');
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error('Print failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEmail = () => {
    if (invoiceData && invoiceData.customer.email) {
      const subject = `Invoice ${invoiceData.invoiceNumber} - ${invoiceData.company.name}`;
      const body = `Dear ${invoiceData.customer.name},\n\nPlease find attached your invoice for order ${invoiceData.orderNumber}.\n\nThank you for your business!\n\nBest regards,\n${invoiceData.company.name}`;
      window.open(`mailto:${invoiceData.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  };

  const handleCopyToClipboard = async () => {
    if (invoiceData) {
      try {
        const templateId = SystemSettingsService.getInvoiceSettings().template;
        await SimpleInvoiceService.copyInvoiceToClipboard(invoiceData, templateId);
        setSuccess('Invoice copied to clipboard!');
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  };


  if (!order) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Invoice Generator</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Invoice Information */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Invoice Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Invoice #:</strong> {invoiceData?.invoiceNumber}<br/>
              <strong>Order #:</strong> {invoiceData?.orderNumber}<br/>
              <strong>Customer:</strong> {invoiceData?.customer.name}<br/>
              <strong>Total:</strong> ${invoiceData?.total.toFixed(2)}<br/>
              <strong>Company:</strong> {invoiceData?.company.name}<br/>
              <strong>Template:</strong> {SystemSettingsService.getInvoiceSettings().template.charAt(0).toUpperCase() + SystemSettingsService.getInvoiceSettings().template.slice(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Invoice template and company settings are configured by administrators in System Settings.
            </Typography>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handlePreview} 
          startIcon={<PreviewIcon />}
          variant="outlined"
        >
          Preview
        </Button>
        <Button 
          onClick={handleCopyToClipboard} 
          startIcon={<CopyIcon />}
          variant="outlined"
        >
          Copy HTML
        </Button>
        <Button 
          onClick={handleEmail} 
          startIcon={<EmailIcon />}
          variant="outlined"
          disabled={!invoiceData?.customer.email}
        >
          Email
        </Button>
        <Button 
          onClick={handlePrint} 
          startIcon={loading ? <CircularProgress size={16} /> : <PrintIcon />}
          variant="outlined"
          disabled={loading}
        >
          Print
        </Button>
        <Button 
          onClick={handleDownload} 
          startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
          variant="contained"
          disabled={loading}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceGenerator;
