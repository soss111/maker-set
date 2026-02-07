import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  ShoppingCart as CartIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersApi, setsApi, favoritesApi, creditsApi, Set as SetType, Order, OrderItem } from '../services/api';
import { SimpleInvoiceService, InvoiceData } from '../services/simpleInvoiceService';
import { SystemSettingsService } from '../services/systemSettingsService';
import LibreTranslateStatus from '../components/LibreTranslateStatus';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

interface FavoriteSet {
  set_id: number;
  name: string;
  category: string;
  base_price: number;
  media?: Array<{ file_url: string }>;
}

const CustomerAccount: React.FC = () => {
  const { t } = useLanguage();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<FavoriteSet[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<number | null>(null);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [creditsTransactions, setCreditsTransactions] = useState<any[]>([]);
  const [shareStats, setShareStats] = useState<any>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    company_name: (user as any)?.company_name || '',
    phone: (user as any)?.phone || '',
    address: (user as any)?.address || '',
    city: (user as any)?.city || '',
    postal_code: (user as any)?.postal_code || '',
    country: (user as any)?.country || '',
    country_code: (user as any)?.country_code || '+372', // Default to Estonia
  });

  // Country codes for phone numbers
  const countryCodes = [
    { code: '+1', country: 'US/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+39', country: 'Italy' },
    { code: '+34', country: 'Spain' },
    { code: '+31', country: 'Netherlands' },
    { code: '+46', country: 'Sweden' },
    { code: '+47', country: 'Norway' },
    { code: '+45', country: 'Denmark' },
    { code: '+358', country: 'Finland' },
    { code: '+372', country: 'Estonia' },
    { code: '+371', country: 'Latvia' },
    { code: '+370', country: 'Lithuania' },
    { code: '+7', country: 'Russia' },
    { code: '+86', country: 'China' },
    { code: '+81', country: 'Japan' },
    { code: '+82', country: 'South Korea' },
    { code: '+61', country: 'Australia' },
    { code: '+64', country: 'New Zealand' },
  ];

  // Countries list
  const countries = [
    'Estonia', 'Latvia', 'Lithuania', 'Finland', 'Sweden', 'Norway', 'Denmark',
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria',
    'Switzerland', 'Poland', 'Czech Republic', 'Slovakia', 'Hungary', 'Slovenia',
    'Croatia', 'Serbia', 'Bulgaria', 'Romania', 'Greece', 'Cyprus', 'Malta',
    'United Kingdom', 'Ireland', 'Portugal', 'Luxembourg', 'Iceland',
    'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile',
    'Australia', 'New Zealand', 'Japan', 'South Korea', 'China', 'India',
    'Singapore', 'Thailand', 'Malaysia', 'Indonesia', 'Philippines',
    'Russia', 'Ukraine', 'Belarus', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan'
  ];

  // Helper function to parse phone number and extract country code
  const parsePhoneNumber = (phone: string) => {
    if (!phone) return { countryCode: '+372', phoneNumber: '' };
    
    // Try to find matching country code
    for (const countryCode of countryCodes) {
      if (phone.startsWith(countryCode.code)) {
        return {
          countryCode: countryCode.code,
          phoneNumber: phone.substring(countryCode.code.length)
        };
      }
    }
    
    // Default to Estonia if no match found
    return { countryCode: '+372', phoneNumber: phone };
  };

  useEffect(() => {
    fetchCustomerData();
    fetchCreditsData();
  }, []);

  const fetchCreditsData = async () => {
    setLoadingCredits(true);
    try {
      const balanceRes = await creditsApi.getBalance();
      setCreditsBalance(balanceRes.data.balance || 0);

      const transactionsRes = await creditsApi.getTransactions();
      setCreditsTransactions(transactionsRes.data.transactions || []);

      const shareStatsRes = await creditsApi.getShareStats();
      setShareStats(shareStatsRes.data);
    } catch (error) {
      console.error('Error fetching credits data:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  // Update profile data when user data changes
  useEffect(() => {
    if (user) {
      console.log('User data changed, updating profile data:', user);
      const phoneData = parsePhoneNumber((user as any)?.phone || '');
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        company_name: (user as any)?.company_name || '',
        phone: phoneData.phoneNumber,
        address: (user as any)?.address || '',
        city: (user as any)?.city || '',
        postal_code: (user as any)?.postal_code || '',
        country: (user as any)?.country || '',
        country_code: phoneData.countryCode,
      });
    }
  }, [user]);

  // Update profile data when edit dialog opens
  useEffect(() => {
    if (editDialogOpen && user) {
      console.log('Edit dialog opened, ensuring profile data is current:', user);
      const phoneData = parsePhoneNumber((user as any)?.phone || '');
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        company_name: (user as any)?.company_name || '',
        phone: phoneData.phoneNumber,
        address: (user as any)?.address || '',
        city: (user as any)?.city || '',
        postal_code: (user as any)?.postal_code || '',
        country: (user as any)?.country || '',
        country_code: phoneData.countryCode,
      });
    }
  }, [editDialogOpen, user]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch orders for the current user using customer_id parameter
      const ordersResponse = await ordersApi.getAll({ customer_id: user?.user_id });
      const userOrders = ordersResponse.data.orders || [];
      
      setOrders(userOrders);

      // Fetch favorites from API
      if (user?.user_id) {
        try {
          const favoritesResponse = await favoritesApi.getAll(user.user_id);
          console.log('Favorites API response:', favoritesResponse);
          console.log('Favorites response data:', favoritesResponse?.data);
          console.log('Is data an array?', Array.isArray(favoritesResponse?.data));
          
          // The API returns the favorites array directly, not wrapped in an object
          // Add extra safety checks
          let favoritesData: any[] = [];
          
          if (favoritesResponse && favoritesResponse.data) {
            if (Array.isArray(favoritesResponse.data)) {
              favoritesData = favoritesResponse.data;
            } else {
              console.log('Unexpected favorites data structure:', favoritesResponse.data);
            }
          }
          
          if (favoritesData.length > 0) {
            const favoriteSets = favoritesData.map((fav: any) => ({
              set_id: fav.set_id,
              name: fav.set_name || fav.name || 'Unknown Set', // Use set_name from backend or fallback to name
              category: fav.category || 'uncategorized',
              base_price: 0, // We'll need to get this from sets if needed
              media: [] // We'll need to get this from sets if needed
            }));
            setFavorites(favoriteSets);
          } else {
            console.log('No favorites found or empty array');
            setFavorites([]);
          }
        } catch (error: any) {
          console.error('Error fetching favorites:', error);
          console.error('Error details:', {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            response: error?.response || 'No response'
          });
          setFavorites([]);
        }
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setError(null);
    setSuccess(null);
    
    console.log('Opening edit profile dialog. Current user data:', user);
    
    // Ensure profile data is loaded with current user data
    if (user) {
      const phoneData = parsePhoneNumber((user as any)?.phone || '');
      const newProfileData = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        company_name: (user as any)?.company_name || '',
        phone: phoneData.phoneNumber,
        address: (user as any)?.address || '',
        city: (user as any)?.city || '',
        postal_code: (user as any)?.postal_code || '',
        country: (user as any)?.country || '',
        country_code: phoneData.countryCode,
      };
      
      console.log('Setting profile data:', newProfileData);
      setProfileData(newProfileData);
    } else {
      console.warn('No user data available when opening edit profile dialog');
    }
    
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setError(null);
    setSuccess(null);
  };

  const handleViewSet = (setId: number) => {
    navigate(`/shop?setId=${setId}`);
  };

  const handleViewOrder = async (order: Order) => {
    console.log('handleViewOrder called with order:', order);
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching order details for ID:', order.order_id);
      // Fetch detailed order information
      const response = await ordersApi.getById(order.order_id);
      console.log('Order API response:', response);
      
      const orderData = response.data.order || response.data;
      console.log('Order data:', orderData);
      
      setSelectedOrder(orderData);
      setOrderDetailsOpen(true);
      console.log('Order details dialog opened');
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const generateInvoice = async (order: Order) => {
    setInvoiceLoading(order.order_id);
    try {
      console.log('Generating invoice for order:', order);
      
      // Validate order data
      if (!order || !order.order_id) {
        throw new Error('Invalid order data');
      }

      // Get system settings for invoice
      const settings = SystemSettingsService.getSettings();
      const invoiceSettings = SystemSettingsService.getInvoiceSettings();
      
      // Create invoice data
      const invoiceData: InvoiceData = {
        invoiceNumber: `INV-${order.order_id.toString().padStart(6, '0')}`,
        orderNumber: order.order_number || `ORD-${order.order_id}`,
        date: order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
        company: {
          name: settings.companyName || 'MakerSet Solutions',
          address: settings.companyAddress || '123 Innovation Street, Tech City, TC 12345, Estonia',
          phone: settings.companyPhone || '+372 123 4567',
          email: settings.companyEmail || 'info@makerset.com',
          website: settings.companyWebsite || 'www.makerset.com',
          taxId: settings.companyTaxId || 'EE123456789',
          bankAccount: {
            bankName: settings.bankName || 'Estonian Bank',
            accountNumber: settings.bankAccountNumber || '1234567890',
            iban: settings.bankIban || 'EE123456789012345678',
            swift: settings.bankSwift || 'ESTBEE2X'
          }
        },
        customer: {
          name: `${order.customer_first_name || 'Customer'} ${order.customer_last_name || 'Name'}`,
          company: order.company_name || '',
          email: order.customer_email || 'customer@example.com',
          address: order.shipping_address || 'No address provided'
        },
        items: (order.items && Array.isArray(order.items)) ? order.items.map(item => ({
          description: item.set_name || 'Maker Set',
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price?.toString() || '0'),
          total: parseFloat(item.line_total?.toString() || item.unit_price?.toString() || '0')
        })) : [],
        subtotal: parseFloat(order.total_amount?.toString() || '0'),
        taxRate: invoiceSettings.taxRate || 0.20, // Default 20% VAT
        taxAmount: parseFloat(order.total_amount?.toString() || '0') * (invoiceSettings.taxRate || 0.20),
        total: parseFloat(order.total_amount?.toString() || '0') * (1 + (invoiceSettings.taxRate || 0.20)),
        notes: order.notes || '',
        status: order.status,
        paymentTerms: invoiceSettings.paymentTerms || 'Payment due within 30 days'
      };

      // Generate and download invoice
      const templateId = invoiceSettings.template || 'modern';
      SimpleInvoiceService.downloadInvoice(invoiceData, templateId);
      
      setSuccess('Invoice downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      setError(`Failed to generate invoice: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setInvoiceLoading(null);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Saving profile data:', profileData);
      
      // Validate required fields
      if (!profileData.first_name.trim()) {
        throw new Error('First name is required');
      }
      if (!profileData.last_name.trim()) {
        throw new Error('Last name is required');
      }
      
      // Prepare the data to send, ensuring phone number is properly formatted
      const phoneNumber = profileData.phone.trim();
      const fullPhoneNumber = phoneNumber ? `${profileData.country_code}${phoneNumber}` : '';
      
      const dataToSend = {
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        phone: fullPhoneNumber,
        company_name: profileData.company_name.trim(),
        address: profileData.address.trim(),
        city: profileData.city.trim(),
        postal_code: profileData.postal_code.trim(),
        country: profileData.country.trim(),
      };
      
      console.log('Data being sent to API:', dataToSend);
      
      // Use the AuthContext's updateProfile function which now uses the correct endpoint
      await updateProfile(dataToSend);
      
      setSuccess('Profile updated successfully!');
      setEditDialogOpen(false);
      
      // No need to refresh the page since AuthContext will be updated automatically
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = (setId: number) => {
    setFavorites(prev => prev.filter(fav => fav.set_id !== setId));
  };


  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your profile, orders, and favorites
        </Typography>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {renderError(error)}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3 }}>
        {/* Profile Card */}
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64, mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                  {(user as any)?.phone && (
                    <Typography variant="body2" color="text.secondary">
                      {(user as any).phone}
                    </Typography>
                  )}
                  {(user as any)?.country && (
                    <Typography variant="body2" color="text.secondary">
                      {(user as any).country}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditProfile}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Summary
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Total Orders"
                    secondary={orders.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Favorites"
                    secondary={favorites.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Spent"
                    secondary={`€${orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0).toFixed(2)}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Available Credits"
                    secondary={
                      loadingCredits ? (
                        <CircularProgress size={16} />
                      ) : (
                        `€${creditsBalance.toFixed(2)}`
                      )
                    }
                  />
                  {creditsBalance > 0 && (
                    <Chip 
                      icon={<LocalOfferIcon />}
                      label="€5 Tickets"
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Credits & Rewards Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalOfferIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  My Credits & Rewards
                </Typography>
              </Box>
              
              {loadingCredits ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.dark" gutterBottom>
                      €{creditsBalance.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available credits will be automatically applied at checkout
                    </Typography>
                  </Box>

                  {shareStats && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Social Share Progress
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ flex: 1, height: 8, bgcolor: 'grey.300', borderRadius: 4, overflow: 'hidden' }}>
                          <Box 
                            sx={{ 
                              width: `${((3 - shareStats.sharesUntilReward) / 3) * 100}%`, 
                              height: '100%', 
                              bgcolor: 'primary.main',
                              transition: 'width 0.3s ease'
                            }} 
                          />
                        </Box>
                        <Typography variant="body2" color="primary">
                          {shareStats.sharesUntilReward || 3} shares until reward
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Share 3 sets to earn €5 credits
                      </Typography>
                    </Box>
                  )}

                  {creditsTransactions.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Recent Credits History
                      </Typography>
                      <List dense>
                        {creditsTransactions.slice(0, 3).map((transaction: any, idx: number) => (
                          <ListItem key={idx} sx={{ pl: 0 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: transaction.amount > 0 ? 'success.light' : 'error.light' }}>
                                {transaction.amount > 0 ? '+' : ''}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`€${transaction.amount.toFixed(2)} ${transaction.transaction_type === 'reward_earned' ? 'Reward' : ''}`}
                              secondary={transaction.description || new Date(transaction.created_at).toLocaleDateString()}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* LibreTranslate Service Status - Disabled to prevent CORS errors */}
          {/* <LibreTranslateStatus sx={{ mt: 2 }} /> */}
        </Box>

        {/* Orders */}
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">
                  Order History
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/shop')}
                >
                  Continue Shopping
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {order.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(order.order_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            €{Number(order.total_amount || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => {
                              console.log('View order button clicked for order:', order.order_id);
                              handleViewOrder(order);
                            }}
                            title="View Order Details"
                            disabled={loading}
                          >
                            <ViewIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Favorites */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Favorites
              </Typography>
              
              {favorites.length === 0 ? (
                <Alert severity="info">
                  You haven't added any favorites yet. Browse our sets and add some to your favorites!
                </Alert>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  {favorites.map((favorite) => (
                    <Box key={favorite.set_id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {favorite.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {favorite.category}
                              </Typography>
                              <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                                €{favorite.base_price.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleViewSet(favorite.set_id)}
                                title="View Set"
                              >
                                <ViewIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveFavorite(favorite.set_id)}
                                title="Remove from Favorites"
                                color="error"
                              >
                                <FavoriteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Fields marked with * are required. Email cannot be changed.
          </Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <Box>
              <TextField
                id="first-name"
                name="first-name"
                fullWidth
                required
                label="First Name *"
                value={profileData.first_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                error={!profileData.first_name.trim()}
                helperText={!profileData.first_name.trim() ? "First name is required" : ""}
              />
            </Box>
            <Box>
              <TextField
                id="last-name"
                name="last-name"
                fullWidth
                required
                label="Last Name *"
                value={profileData.last_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                error={!profileData.last_name.trim()}
                helperText={!profileData.last_name.trim() ? "Last name is required" : ""}
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                id="email"
                name="email"
                fullWidth
                label="Email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                disabled
                helperText="Email cannot be changed"
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                id="company-name"
                name="company-name"
                fullWidth
                label="Company Name (Optional)"
                value={profileData.company_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Enter your company name"
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel htmlFor="country-code">Country Code</InputLabel>
                  <Select
                    id="country-code"
                    name="country-code"
                    value={profileData.country_code}
                    label="Country Code"
                    onChange={(e) => setProfileData(prev => ({ ...prev, country_code: e.target.value }))}
                  >
                    {countryCodes.map((countryCode) => (
                      <MenuItem key={countryCode.code} value={countryCode.code}>
                        {countryCode.code} ({countryCode.country})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="12345678"
                />
              </Box>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="Address"
                value={profileData.address}
                onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="City"
                value={profileData.city}
                onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Postal Code"
                value={profileData.postal_code}
                onChange={(e) => setProfileData(prev => ({ ...prev, postal_code: e.target.value }))}
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <FormControl fullWidth>
                <InputLabel htmlFor="country">Country</InputLabel>
                <Select
                  id="country"
                  name="country"
                  value={profileData.country}
                  label="Country"
                  onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                >
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveProfile} 
            variant="contained" 
            disabled={loading || !profileData.first_name.trim() || !profileData.last_name.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog 
        open={orderDetailsOpen} 
        onClose={() => setOrderDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Order Details - {selectedOrder?.order_number}
            </Typography>
            <IconButton onClick={() => setOrderDetailsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              {/* Order Summary */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Order Summary</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Order Number</Typography>
                      <Typography variant="body1" fontWeight={600}>{selectedOrder.order_number}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Order Date</Typography>
                      <Typography variant="body1">{new Date(selectedOrder.order_date).toLocaleDateString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Chip 
                        label={selectedOrder.status} 
                        color={getStatusColor(selectedOrder.status) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                      <Typography variant="h6" color="primary">
                        €{Number(selectedOrder.total_amount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Order Items</Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Unit Price</TableCell>
                            <TableCell>Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedOrder.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.set_name || `Set ${item.set_id}`}
                                </Typography>
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>€{Number(item.unit_price || 0).toFixed(2)}</TableCell>
                              <TableCell>€{Number(item.line_total || item.unit_price * item.quantity || 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}

              {/* Shipping Information */}
              {selectedOrder.shipping_address && (
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Shipping Address</Typography>
                    <Typography variant="body2">
                      {selectedOrder.shipping_address}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Order Notes</Typography>
                    <Typography variant="body2">
                      {selectedOrder.notes}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailsOpen(false)}>Close</Button>
          {selectedOrder && (
            <Button
              variant="contained"
              startIcon={invoiceLoading === selectedOrder.order_id ? <CircularProgress size={20} /> : <ReceiptIcon />}
              onClick={() => generateInvoice(selectedOrder)}
              disabled={invoiceLoading === selectedOrder.order_id}
              color="primary"
            >
              {invoiceLoading === selectedOrder.order_id ? 'Generating...' : 'Download Invoice'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default CustomerAccount;
