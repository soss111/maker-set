import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Order } from '../services/api';

interface MinimalInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onPrint?: () => void;
  onEmail?: () => void;
  onDownload?: () => void;
}

const MinimalInvoiceDialog: React.FC<MinimalInvoiceDialogProps> = ({
  open,
  onClose,
  order,
  onPrint,
  onEmail,
  onDownload,
}) => {
  if (!order) return null;

  const invoiceNumber = `INV-${order.order_id.toString().padStart(6, '0')}`;
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  const subtotal = Number(order.total_amount) || 0;
  const taxRate = 20; // 20% VAT
  const taxAmount = subtotal * 0.2;
  const total = subtotal + taxAmount;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'processing': return 'primary';
      case 'shipped': return 'success';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      case 'refunded': return 'error';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Invoice {invoiceNumber}</Typography>
          <Chip 
            label={order.status?.toUpperCase() || 'PENDING'} 
            color={getStatusColor(order.status || 'pending')}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Company Header */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" color="primary" gutterBottom>
              MakerSet Solutions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              123 Innovation Street, Tech City, TC 12345, Estonia
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phone: +372 123 4567 | Email: info@makerset.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Website: www.makerset.com | Tax ID: EE123456789
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Invoice Details */}
          <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Bill To:
              </Typography>
              <Typography variant="body1">
                {order.customer_first_name || 'Customer'} {order.customer_last_name || 'Name'}
              </Typography>
              {order.company_name && (
                <Typography variant="body1">{order.company_name}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {order.customer_email || 'customer@example.com'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.shipping_address || 'No address provided'}
              </Typography>
            </Box>
            
            <Box textAlign="right">
              <Typography variant="body2" color="text.secondary">
                Invoice Number:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {invoiceNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Order Number:
              </Typography>
              <Typography variant="body1">
                {order.order_number || `ORD-${order.order_id}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Invoice Date:
              </Typography>
              <Typography variant="body1">
                {orderDate}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Due Date:
              </Typography>
              <Typography variant="body1">
                {dueDate}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Items Table */}
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.set_name || item.name || `Set #${item.set_id || 'Unknown'}`}
                      </TableCell>
                      <TableCell align="center">
                        {Number(item.quantity) || 1}
                      </TableCell>
                      <TableCell align="right">
                        €{(Number(item.unit_price) || Number(item.price) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        €{((Number(item.quantity) || 1) * (Number(item.unit_price) || Number(item.price) || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell>Order Items</TableCell>
                    <TableCell align="center">1</TableCell>
                    <TableCell align="right">€{subtotal.toFixed(2)}</TableCell>
                    <TableCell align="right">€{subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals */}
          <Box display="flex" justifyContent="flex-end">
            <Box sx={{ minWidth: 200 }}>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">€{subtotal.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">VAT ({taxRate}%):</Typography>
                <Typography variant="body2">€{taxAmount.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">€{total.toFixed(2)}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Notes */}
          {order.notes && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Notes:</strong> {order.notes}
              </Typography>
            </Box>
          )}

          {/* Payment Terms */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Payment Terms:</strong> Prepayment required. Payment due within 30 days of invoice date.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Bank Details:</strong> Estonian Bank | Account: 1234567890 | IBAN: EE123456789012345678
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Close
        </Button>
        {onPrint && (
          <Button onClick={onPrint} startIcon={<PrintIcon />} variant="outlined">
            Print
          </Button>
        )}
        {onEmail && (
          <Button onClick={onEmail} startIcon={<EmailIcon />} variant="outlined">
            Email
          </Button>
        )}
        {onDownload && (
          <Button onClick={onDownload} startIcon={<DownloadIcon />} variant="contained">
            Download PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MinimalInvoiceDialog;
