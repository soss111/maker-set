import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Badge,
  Slide,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Close as CloseIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
  Payment as CheckoutIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface FloatingCartProps {
  onCheckout?: (orderData: any) => void;
}

const FloatingCart: React.FC<FloatingCartProps> = ({ onCheckout }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { items, getTotalItems, getTotalPrice, updateQuantity, removeFromCart, clearCart, validateStock, getShippingInfo } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    company_name: '',
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveCustomerInfo, setSaveCustomerInfo] = useState(false);

  // Load saved customer info when dialog opens
  useEffect(() => {
    if (checkoutOpen) {
      const hasSaved = loadSavedCustomerInfo();
      if (hasSaved) {
        setSaveCustomerInfo(true);
      }
    }
  }, [checkoutOpen]);

  const handleAddToCart = (setId: number) => {
    const item = items.find(i => i.set_id === setId);
    if (item) {
      updateQuantity(setId, item.quantity + 1);
    }
  };

  const handleRemoveFromCart = (setId: number) => {
    const item = items.find(i => i.set_id === setId);
    if (item && item.quantity > 1) {
      updateQuantity(setId, item.quantity - 1);
    } else {
      removeFromCart(setId);
    }
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      // First validate stock availability
      const stockValidation = await validateStock();
      
      if (!stockValidation.valid) {
        // Show detailed error messages for each invalid item
        const errorMessages = stockValidation.results
          .filter(result => !result.valid)
          .map(result => {
            const item = items.find(i => i.set_id === result.set_id);
            const itemName = item?.set_name || `Set ${result.set_id}`;
            
            if (!result.parts_configured) {
              return `${itemName}: No parts configured for this set`;
            } else if (result.insufficient_parts && result.insufficient_parts.length > 0) {
              const partDetails = result.insufficient_parts
                .map(part => `${part.part_name} (${part.part_number}): need ${part.required}, have ${part.available}`)
                .join(', ');
              return `${itemName}: Insufficient stock - ${partDetails}`;
            } else {
              return `${itemName}: ${result.error}`;
            }
          });
        
        setError(`Cannot place order due to stock issues:\n${errorMessages.join('\n')}`);
        return;
      }

      const orderItems = items.map(item => ({
        set_id: item.set_id,
        quantity: item.quantity,
        unit_price: item.display_price || item.price || item.unit_price,
        line_total: item.total_price,
        provider_set_id: item.provider_set_id, // Include provider set ID for stock management
        provider_id: item.provider_id, // Include provider ID
      }));

      const orderData = {
        customer_id: user?.user_id || 1, // Use actual user ID or fallback to 1
        provider_id: items[0]?.provider_id || 1, // Use provider ID from the first item
        provider_code: items[0]?.provider_code, // Include provider code
        company_name: customerInfo.company_name,
        customer_first_name: customerInfo.customer_first_name,
        customer_last_name: customerInfo.customer_last_name,
        customer_email: customerInfo.customer_email,
        customer_phone: customerInfo.customer_phone,
        shipping_address: customerInfo.shipping_address,
        billing_address: customerInfo.shipping_address,
        notes: customerInfo.notes,
        payment_method: 'credit_card',
        items: orderItems,
        total_amount: getTotalPrice(),
        status: 'pending_payment', // Customer places order - admin must confirm payment
        set_type: items[0]?.provider_id === null ? 'admin' : 'provider' // Determine set type based on provider_id
      };

      if (onCheckout) {
        await onCheckout(orderData);
        setSuccess('Order placed successfully!');
        clearCart();
        
        // Save customer info if checkbox is checked
        if (saveCustomerInfo) {
          saveCustomerInfoToStorage();
        }
        
        // Clear form only if not saving info
        if (!saveCustomerInfo) {
          setCustomerInfo({
            company_name: '',
            customer_first_name: '',
            customer_last_name: '',
            customer_email: '',
            customer_phone: '',
            shipping_address: '',
            notes: '',
          });
        }
        
        setTimeout(() => {
          setCheckoutOpen(false);
          setIsExpanded(false);
          setSuccess(null); // Clear success message when closing popup
        }, 2000);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setError(error instanceof Error ? error.message : 'Failed to place order');
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    return customerInfo.company_name?.trim() && 
           customerInfo.customer_first_name?.trim() && 
           customerInfo.customer_last_name?.trim() && 
           customerInfo.customer_email?.trim() && 
           customerInfo.customer_phone?.trim() &&
           customerInfo.shipping_address?.trim();
  };

  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load saved customer information from localStorage
  const loadSavedCustomerInfo = () => {
    try {
      const savedInfo = localStorage.getItem('customerInfo');
      if (savedInfo) {
        const parsedInfo = JSON.parse(savedInfo);
        setCustomerInfo(parsedInfo);
        return true;
      }
    } catch (error) {
      console.error('Error loading saved customer info:', error);
    }
    return false;
  };

  // Save customer information to localStorage
  const saveCustomerInfoToStorage = () => {
    try {
      localStorage.setItem('customerInfo', JSON.stringify(customerInfo));
      return true;
    } catch (error) {
      console.error('Error saving customer info:', error);
      return false;
    }
  };

  // Clear saved customer information
  const clearSavedCustomerInfo = () => {
    try {
      localStorage.removeItem('customerInfo');
      setCustomerInfo({
        company_name: '',
        customer_first_name: '',
        customer_last_name: '',
        customer_email: '',
        customer_phone: '',
        shipping_address: '',
        notes: '',
      });
      setSaveCustomerInfo(false);
      return true;
    } catch (error) {
      console.error('Error clearing saved customer info:', error);
      return false;
    }
  };

  // Check if there's saved customer info
  const hasSavedCustomerInfo = () => {
    try {
      const savedInfo = localStorage.getItem('customerInfo');
      return savedInfo !== null;
    } catch (error) {
      return false;
    }
  };

  // Always show cart icon, even when empty
  // if (items.length === 0) {
  //   return null;
  // }

  return (
    <>
      {/* Floating Cart Button */}
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          borderRadius: 3,
          overflow: 'hidden',
          minWidth: 200,
          maxWidth: 400,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            backgroundColor: 'primary.main',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={getTotalItems()} color="secondary">
              <ShoppingCartIcon />
            </Badge>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {getTotalItems()} items
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                €{Number(getTotalPrice() || 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            sx={{ color: 'white' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <CloseIcon /> : <ShoppingCartIcon />}
          </IconButton>
        </Box>

        {/* Expanded Cart Content */}
        <Slide direction="up" in={isExpanded} mountOnEnter unmountOnExit>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {items.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Your cart is empty
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add some items to get started!
                </Typography>
              </Box>
            ) : (
              <List dense>
                {items.map((item, index) => (
                  <React.Fragment key={item.set_id}>
                    <ListItem sx={{ py: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={600}>
                            {item.set_name}
                          </Typography>
                        }
                        secondary={
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <Typography variant="caption" color="text.secondary">
                              €{Number(item.unit_price || 0).toFixed(2)} each
                            </Typography>
                          </span>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFromCart(item.set_id)}
                            disabled={item.quantity <= 1}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleAddToCart(item.set_id)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => removeFromCart(item.set_id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}

            {items.length > 0 && (
              <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                {/* Shipping Information */}
                {(() => {
                  const shippingInfo = getShippingInfo();
                  return (
                    <Box sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                      <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>
                        📦 Shipping Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {shippingInfo.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                          Shipping Cost:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          €{shippingInfo.cost.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Total:
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    €{Number(getTotalPrice() || 0).toFixed(2)}
                  </Typography>
                </Box>
                
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<CheckoutIcon />}
                  onClick={() => setCheckoutOpen(true)}
                  sx={{ 
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: 2
                  }}
                >
                  Proceed to Checkout
                </Button>
              </Box>
            )}
          </Box>
        </Slide>
      </Paper>

      {/* Checkout Dialog */}
      <Dialog 
        open={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" fontWeight={600}>
              Complete Your Order
            </Typography>
            <IconButton onClick={() => setCheckoutOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {error}
                  </Typography>
                </Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* Customer Information */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Customer Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    id="company-name"
                    label="Company Name"
                    value={customerInfo.company_name}
                    onChange={(e) => handleCustomerInfoChange('company_name', e.target.value)}
                    required
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      id="first-name"
                      label="First Name"
                      value={customerInfo.customer_first_name}
                      onChange={(e) => handleCustomerInfoChange('customer_first_name', e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      id="last-name"
                      label="Last Name"
                      value={customerInfo.customer_last_name}
                      onChange={(e) => handleCustomerInfoChange('customer_last_name', e.target.value)}
                      required
                      fullWidth
                    />
                  </Box>
                  <TextField
                    id="email"
                    label="Email"
                    type="email"
                    value={customerInfo.customer_email}
                    onChange={(e) => handleCustomerInfoChange('customer_email', e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    id="phone"
                    label="Phone Number"
                    type="tel"
                    value={customerInfo.customer_phone}
                    onChange={(e) => handleCustomerInfoChange('customer_phone', e.target.value)}
                    required
                    fullWidth
                    placeholder="+1 (555) 123-4567"
                  />
                  <TextField
                    id="shipping-address"
                    label="Shipping Address"
                    multiline
                    rows={3}
                    value={customerInfo.shipping_address}
                    onChange={(e) => handleCustomerInfoChange('shipping_address', e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    id="notes"
                    label="Notes (Optional)"
                    multiline
                    rows={2}
                    value={customerInfo.notes}
                    onChange={(e) => handleCustomerInfoChange('notes', e.target.value)}
                    fullWidth
                  />
                </Box>
                
                {/* Customer Info Management */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Customer Information Management
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={saveCustomerInfo}
                          onChange={(e) => setSaveCustomerInfo(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Save my information for future orders"
                    />
                    {hasSavedCustomerInfo() && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SaveIcon />}
                          onClick={() => {
                            if (saveCustomerInfoToStorage()) {
                              setSuccess('Customer information saved successfully!');
                              setTimeout(() => setSuccess(null), 3000);
                            }
                          }}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Update Saved Info
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<ClearIcon />}
                          onClick={() => {
                            if (clearSavedCustomerInfo()) {
                              setSuccess('Saved customer information cleared!');
                              setTimeout(() => setSuccess(null), 3000);
                            }
                          }}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Clear Saved Info
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Order Summary */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <List dense>
                    {items.map((item) => (
                      <ListItem key={item.set_id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={item.set_name}
                          secondary={`Qty: ${item.quantity} × €${Number(item.unit_price || 0).toFixed(2)}`}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          €{Number(item.total_price || 0).toFixed(2)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>
                      Total:
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      €{Number(getTotalPrice() || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
            </>
          )}
        </DialogContent>

        {!success && (
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCheckout}
              disabled={!validateForm() || loading}
              startIcon={<CheckoutIcon />}
            >
              {loading ? 'Processing...' : 'Place Order'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

export default FloatingCart;
