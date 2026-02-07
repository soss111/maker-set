import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  Chip,
  Badge,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Payment as CheckoutIcon,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ShoppingCartProps {
  onCheckout?: (orderData: any) => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ onCheckout }) => {
  const { t } = useLanguage();
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  } = useCart();
  
  const [open, setOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_name: '',
    shipping_address: '',
    notes: '',
  });

  const handleCheckout = () => {
    setCheckoutDialogOpen(true);
  };

  const handlePlaceOrder = async () => {
    try {
      // Create order with items
      const orderData = {
        ...customerInfo,
        items: items.map(item => ({
          set_id: item.set_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      // Call the checkout callback if provided
      if (onCheckout) {
        await onCheckout(orderData);
        clearCart();
        setCheckoutDialogOpen(false);
        setOpen(false);
      }
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  const handleQuantityChange = (setId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(setId);
    } else {
      updateQuantity(setId, newQuantity);
    }
  };

  return (
    <>
      {/* Cart Icon with Badge */}
      <Badge badgeContent={getTotalItems()} color="primary">
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
            <List>
              {items.map((item, index) => (
                <React.Fragment key={item.set_id}>
                  <ListItem
                    secondaryAction={
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          onClick={() => handleQuantityChange(item.set_id, item.quantity - 1)}
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                        <TextField
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            if (newQuantity >= 1) {
                              handleQuantityChange(item.set_id, newQuantity);
                            }
                          }}
                          onBlur={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            if (newQuantity < 1) {
                              handleQuantityChange(item.set_id, 1);
                            }
                          }}
                          type="number"
                          size="small"
                          sx={{ width: 60 }}
                          inputProps={{ 
                            min: 1,
                            style: { textAlign: 'center' }
                          }}
                        />
                        <IconButton
                          onClick={() => handleQuantityChange(item.set_id, item.quantity + 1)}
                          size="small"
                        >
                          <AddIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => removeFromCart(item.set_id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={item.image_url ? `http://localhost:5001${item.image_url}` : undefined}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                      >
                        {item.set_name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {item.set_name}
                          </Typography>
                          <Box display="flex" gap={1} mt={1}>
                            <Chip label={item.category} size="small" />
                            <Chip 
                              label={item.difficulty_level} 
                              size="small" 
                              color={
                                item.difficulty_level === 'beginner' ? 'success' :
                                item.difficulty_level === 'intermediate' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {item.set_description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Age: {item.recommended_age_min}-{item.recommended_age_max} years • 
                            Duration: {item.estimated_duration_minutes} min
                          </Typography>
                          {item.set_id !== -1 && (
                            <Box display="flex" alignItems="center" gap={1} mt={1}>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.set_id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <RemoveIcon />
                              </IconButton>
                              <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.set_id, item.quantity + 1)}
                              >
                                <AddIcon />
                              </IconButton>
                            </Box>
                          )}
                          {item.set_id === -1 && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Fixed service fee
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box textAlign="right" minWidth={100}>
                      <Typography variant="h6" color="primary">
                        €{(Number(item.total_price) || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        €{(Number(item.unit_price) || 0).toFixed(2)} each
                      </Typography>
                      {item.set_id !== -1 && (
                        <IconButton
                          size="small"
                          onClick={() => removeFromCart(item.set_id)}
                          color="error"
                          sx={{ mt: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>

        {items.length > 0 && (
          <DialogActions>
            <Box width="100%" p={2}>
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">
                    {t('cart.total') || 'Total'}:
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    €{(Number(getTotalPrice()) || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {getTotalItems()} {t('cart.items') || 'items'}
                </Typography>
              </Paper>
              
              <Box display="flex" gap={2}>
                <Button
                  onClick={clearCart}
                  variant="outlined"
                  color="error"
                  fullWidth
                >
                  {t('cart.clear') || 'Clear Cart'}
                </Button>
                <Button
                  onClick={handleCheckout}
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<CheckoutIcon />}
                >
                  {t('cart.checkout') || 'Checkout'}
                </Button>
              </Box>
            </Box>
          </DialogActions>
        )}
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onClose={() => setCheckoutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('cart.checkout') || 'Checkout'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('cart.orderSummary') || 'Order Summary'}
            </Typography>
            
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              {items.map(item => (
                <Box key={item.set_id} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color={item.set_id === -1 ? "text.secondary" : "text.primary"}>
                    {item.set_name} {item.set_id !== -1 && `x${item.quantity}`}
                    {item.set_id === -1 && " (Fixed)"}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    €{(Number(item.total_price) || 0).toFixed(2)}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6">
                  {t('cart.total') || 'Total'}:
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  €{getTotalPrice().toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            <Typography variant="h6" gutterBottom>
              {t('cart.customerInfo') || 'Customer Information'}
            </Typography>
            
            <Box display="flex" flexWrap="wrap" gap={2}>
              <TextField
                fullWidth
                label={t('cart.firstName') || 'First Name'}
                value={customerInfo.first_name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, first_name: e.target.value })}
                sx={{ minWidth: 200 }}
              />
              <TextField
                fullWidth
                label={t('cart.lastName') || 'Last Name'}
                value={customerInfo.last_name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, last_name: e.target.value })}
                sx={{ minWidth: 200 }}
              />
              <TextField
                fullWidth
                label={t('cart.email') || 'Email'}
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                sx={{ minWidth: 200 }}
              />
              <TextField
                fullWidth
                label={t('cart.companyName') || 'Company Name'}
                value={customerInfo.company_name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, company_name: e.target.value })}
                sx={{ minWidth: 200 }}
              />
              <TextField
                fullWidth
                label={t('cart.shippingAddress') || 'Shipping Address'}
                multiline
                rows={3}
                value={customerInfo.shipping_address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, shipping_address: e.target.value })}
              />
              <TextField
                fullWidth
                label={t('cart.notes') || 'Notes'}
                multiline
                rows={2}
                value={customerInfo.notes}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialogOpen(false)}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handlePlaceOrder}
            variant="contained"
            color="primary"
            disabled={!customerInfo.first_name || !customerInfo.last_name || !customerInfo.email}
          >
            {t('cart.placeOrder') || 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShoppingCart;
