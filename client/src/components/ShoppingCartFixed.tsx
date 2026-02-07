import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  TextField,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface ShoppingCartProps {
  onCheckout?: (orderData: any) => void;
}

interface CustomerInfo {
  company_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  shipping_address: string;
  notes: string;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ onCheckout }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { items, getTotalItems, clearCart, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    company_name: '',
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    shipping_address: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    
    // Company name is required
    if (!customerInfo.company_name.trim()) {
      newErrors.company_name = t('common.required') || 'Required';
    }
    
    // Email is required
    if (!customerInfo.customer_email.trim()) {
      newErrors.customer_email = t('common.required') || 'Required';
    } else if (!/\S+@\S+\.\S+/.test(customerInfo.customer_email)) {
      newErrors.customer_email = t('common.invalidEmail') || 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckoutClick = () => {
    setCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setErrors({});
    setSuccess(null);
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess(null);

    try {
      const orderItems = items.map(item => ({
        set_id: item.set_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.total_price,
      }));

      const orderData = {
        customer_id: user?.user_id || 1, // Use actual user ID or fallback to 1
        provider_id: items[0]?.provider_id || 1, // Use provider ID from the first item
        provider_code: items[0]?.provider_code, // Include provider code
        company_name: customerInfo.company_name,
        customer_first_name: customerInfo.customer_first_name,
        customer_last_name: customerInfo.customer_last_name,
        customer_email: customerInfo.customer_email,
        shipping_address: customerInfo.shipping_address,
        billing_address: customerInfo.shipping_address, // Use shipping address as billing address
        notes: customerInfo.notes,
        payment_method: 'credit_card',
        items: orderItems,
        total_amount: getTotalPrice(),
        status: 'pending_payment', // Customer places order - admin must confirm payment
        set_type: items[0]?.provider_id === null ? 'admin' : 'provider' // Determine set type based on provider_id
      };

      if (onCheckout) {
        await onCheckout(orderData);
        setSuccess(t('cart.orderPlacedSuccessfully') || 'Order placed successfully!');
        clearCart();
        setCustomerInfo({
          company_name: '',
          customer_first_name: '',
          customer_last_name: '',
          customer_email: '',
          shipping_address: '',
          notes: '',
        });
        
        setTimeout(() => {
          handleCloseCheckout();
          setOpen(false);
          setSuccess(null); // Clear success message when closing popup
        }, 2000);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Cart Icon with Badge */}
      <Badge badgeContent={getTotalItems()} color="error">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.light',
            },
          }}
        >
          <CartIcon />
        </IconButton>
      </Badge>

      {/* Cart Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {t('cart.title') || 'Shopping Cart'}
            </Typography>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {items.length === 0 ? (
            <Box textAlign="center" py={4}>
              <CartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('cart.empty') || 'Your cart is empty'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('cart.emptyDescription') || 'Add some maker sets to get started!'}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('cart.items') || 'Cart Items'} ({items.length})
              </Typography>
              
              {items.map((item) => (
                <Box key={item.set_id} display="flex" alignItems="center" mb={2} p={2} border="1px solid" borderColor="grey.300" borderRadius={1}>
                  <Box flexGrow={1}>
                    <Typography variant="body1" fontWeight="bold">
                      {item.set_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('common.price') || 'Price'}: €{Number(item.unit_price || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mr={2}>
                    <IconButton 
                      size="small" 
                      onClick={() => updateQuantity(item.set_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon />
                    </IconButton>
                    <TextField
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1;
                        if (newQuantity >= 1) {
                          updateQuantity(item.set_id, newQuantity);
                        }
                      }}
                      onBlur={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1;
                        if (newQuantity < 1) {
                          updateQuantity(item.set_id, 1);
                        }
                      }}
                      inputProps={{
                        min: 1,
                        style: { textAlign: 'center', width: '50px' }
                      }}
                      size="small"
                      sx={{ width: '60px' }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => updateQuantity(item.set_id, item.quantity + 1)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body1" fontWeight="bold" minWidth="80px" textAlign="right">
                    €{Number(item.total_price || 0).toFixed(2)}
                  </Typography>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => removeFromCart(item.set_id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                  {t('cart.total') || 'Total'}:
                </Typography>
                <Typography variant="h6" color="primary">
                  €{Number(getTotalPrice() || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        {items.length > 0 && (
          <DialogActions>
            <Button onClick={clearCart} color="error">
              {t('cart.clear') || 'Clear Cart'}
            </Button>
            <Button onClick={handleCheckoutClick} variant="contained" color="primary">
              {t('cart.checkout') || 'Checkout'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onClose={handleCloseCheckout} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('cart.orderSummary') || 'Order Summary'}
        </DialogTitle>
        
        <DialogContent>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            {t('cart.customerInfo') || 'Customer Information'}
          </Typography>

          {/* Company Name - Required */}
          <TextField
            margin="dense"
            name="company_name"
            label={`${t('cart.companyName') || 'Company Name'} *`}
            type="text"
            fullWidth
            variant="outlined"
            value={customerInfo.company_name}
            onChange={handleCustomerInfoChange('company_name')}
            required
            error={!!errors.company_name}
            helperText={errors.company_name}
            sx={{ mb: 2 }}
          />

          {/* First Name - Optional */}
          <TextField
            margin="dense"
            name="customer_first_name"
            label={t('cart.firstName') || 'First Name'}
            type="text"
            fullWidth
            variant="outlined"
            value={customerInfo.customer_first_name}
            onChange={handleCustomerInfoChange('customer_first_name')}
            sx={{ mb: 2 }}
          />

          {/* Last Name - Optional */}
          <TextField
            margin="dense"
            name="customer_last_name"
            label={t('cart.lastName') || 'Last Name'}
            type="text"
            fullWidth
            variant="outlined"
            value={customerInfo.customer_last_name}
            onChange={handleCustomerInfoChange('customer_last_name')}
            sx={{ mb: 2 }}
          />

          {/* Email - Required */}
          <TextField
            margin="dense"
            name="customer_email"
            label={`${t('cart.email') || 'Email'} *`}
            type="email"
            fullWidth
            variant="outlined"
            value={customerInfo.customer_email}
            onChange={handleCustomerInfoChange('customer_email')}
            error={!!errors.customer_email}
            helperText={errors.customer_email}
            required
            sx={{ mb: 2 }}
          />

          {/* Shipping Address - Optional */}
          <TextField
            margin="dense"
            name="shipping_address"
            label={t('cart.shippingAddress') || 'Shipping Address'}
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={customerInfo.shipping_address}
            onChange={handleCustomerInfoChange('shipping_address')}
            sx={{ mb: 2 }}
          />

          {/* Notes - Optional */}
          <TextField
            margin="dense"
            name="notes"
            label={t('cart.notes') || 'Notes'}
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={customerInfo.notes}
            onChange={handleCustomerInfoChange('notes')}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            {t('cart.orderItems') || 'Order Items'}
          </Typography>
          
          {items.map((item) => (
            <Box key={item.set_id} display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">
                {item.set_name} x {item.quantity}
              </Typography>
              <Typography variant="body2">
                €{Number(item.total_price || 0).toFixed(2)}
              </Typography>
            </Box>
          ))}
          
          <Divider sx={{ my: 1 }} />
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {t('cart.total') || 'Total'}:
            </Typography>
            <Typography variant="h6" color="primary">
              €{Number(getTotalPrice() || 0).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseCheckout} disabled={loading}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handlePlaceOrder}
            color="primary"
            variant="contained"
            disabled={loading || !customerInfo.company_name.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? (t('common.placingOrder') || 'Placing Order...') : (t('cart.placeOrder') || 'Place Order')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShoppingCart;
