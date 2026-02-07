import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Chip,
  IconButton,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  InputAdornment,
  Badge,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import RatingDialog from '../components/RatingDialog';
import {
  ShoppingCart as ShoppingCartIcon,
  Sort as SortIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  PlayArrow as YouTubeIcon,
  PlayArrow as PlayIcon,
  Description as DescriptionIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Verified as VerifiedIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useOrderNotification } from '../contexts/OrderNotificationContext';
import { useAuth } from '../contexts/AuthContext';
import FloatingCart from '../components/FloatingCart';
import ResponsiveImage from '../components/ResponsiveImage';
import ManualGenerator from '../components/ManualGenerator';
import SocialShare from '../components/SocialShare';
import { setsApi, favoritesApi, ordersApi, shopApi, mediaApi, Set as SetType } from '../services/api';
import { getProviderDisplayName } from '../utils/shopNameGenerator';

const ShopPage: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const { addToCart, isInCart, getTotalItems, getTotalPrice, getCurrentProvider, clearCart } = useCart();
  const { refreshOrderCount } = useOrderNotification();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sets, setSets] = useState<SetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  // Load preferences from localStorage
  const [searchTerm, setSearchTerm] = useState(() => {
    const saved = localStorage.getItem('shop_searchTerm');
    return saved || '';
  });
  const [sortBy, setSortBy] = useState<string>(() => {
    const saved = localStorage.getItem('shop_sortBy');
    return saved || 'name';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('shop_sortOrder') as 'asc' | 'desc';
    return saved || 'asc';
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('shop_viewMode') as 'grid' | 'list';
    return saved || 'grid';
  });
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedSetForManual, setSelectedSetForManual] = useState<SetType | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedSetForRating, setSelectedSetForRating] = useState<SetType | null>(null);
  const [addedToCartFeedback, setAddedToCartFeedback] = useState<number | null>(null);
  const [photoIndices, setPhotoIndices] = useState<{ [setId: number]: number }>({});
  const [quantities, setQuantities] = useState<{ [setId: number]: number }>({});
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedSetForPurchase, setSelectedSetForPurchase] = useState<SetType | null>(null);
  const [learningOutcomesDialogOpen, setLearningOutcomesDialogOpen] = useState(false);
  const [selectedSetForOutcomes, setSelectedSetForOutcomes] = useState<SetType | null>(null);
  const [shareStats, setShareStats] = useState({ sharesUntilReward: 3, hasEarnedReward: false });
  const [socialShareConfig, setSocialShareConfig] = useState({
    shares_required: 3,
    reward_amount: 5,
    reward_message: '📱 Share 3 sets & get €5 off!'
  });

  // Helper function to get quantity for a set
  const getQuantity = (setId: number) => {
    return quantities[setId] || 1;
  };

  // Helper function to update quantity for a set
  const updateQuantity = (setId: number, newQuantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [setId]: Math.max(1, Math.min(newQuantity, 99)) // Limit between 1 and 99
    }));
  };

  // Helper function to get translated set name
  const getTranslatedSetName = (set: SetType) => {
    return set.translations?.[currentLanguage]?.name || set.name || '';
  };

  // Helper function to safely get learning outcomes as an array
  // API/DB may return string (JSON), string[], or plain object
  const getLearningOutcomes = (set: SetType): string[] => {
    const raw = set.learning_outcomes as string[] | string | Record<string, unknown> | null | undefined;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw !== null && raw !== undefined && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items as string[];
      const vals = Object.values(obj).filter((v): v is string => typeof v === 'string');
      if (vals.length > 0) return vals;
      return [];
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (s === '' || s === '[object Object]') return [];
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper function to get translated set description
  const getTranslatedSetDescription = (set: SetType) => {
    return set.translations?.[currentLanguage]?.description || set.description || '';
  };

  // Helper function to get featured photo (master photo)
  const getFeaturedPhoto = (set: SetType) => {
    if (!set.media || set.media.length === 0) return null;
    
    // First, try to find a featured photo
    const featuredPhoto = set.media.find(media => media.is_featured);
    if (featuredPhoto) return featuredPhoto;
    
    // If no featured photo, return the first photo
    return set.media[0];
  };

  // Helper function to calculate available quantity for a set
  const getAvailableQuantity = (set: SetType) => {
    // For shop sets, use provider-specific available_quantity
    if (set.available_quantity !== undefined) {
      return set.available_quantity;
    }
    
    // Fallback to parts-based calculation for backward compatibility
    if (!set.parts || set.parts.length === 0) {
      // If no parts are defined for this set, return -1 to indicate "parts not configured"
      return -1;
    }

    // Find the minimum available quantity based on required parts
    let minAvailable = Infinity;
    let hasRequiredParts = false;
    
    for (const part of set.parts) {
      if (!part.is_optional && part.stock_quantity !== undefined) {
        hasRequiredParts = true;
        const requiredPerSet = part.quantity || 1;
        const availableForThisPart = Math.floor(part.stock_quantity / requiredPerSet);
        minAvailable = Math.min(minAvailable, availableForThisPart);
      }
    }

    // If no required parts found, return -1 to indicate "parts not configured"
    if (!hasRequiredParts) {
      return -1;
    }

    return minAvailable === Infinity ? 0 : Math.max(0, minAvailable);
  };

  useEffect(() => {
    fetchSets();
    loadFavorites();
    fetchSocialShareConfig();
  }, [user, isAuthenticated]);

  const fetchSocialShareConfig = async () => {
    try {
      const keys = ['social_share_required', 'social_share_reward_amount', 'social_share_message'];
      const config: any = {};
      
      for (const key of keys) {
        try {
          const response = await fetch(`http://localhost:5001/api/settings/${key}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            console.log(`Fetched ${key}:`, data);
            // API returns { setting: { setting_key, setting_value, ... } }
            config[key] = data.setting?.setting_value || data.value || data.setting_value;
          }
        } catch (err) {
          console.log(`No saved setting for ${key}`);
        }
      }
      
      console.log('Social share config:', config);
      
      setSocialShareConfig({
        shares_required: config.social_share_required ? parseInt(config.social_share_required) : 3,
        reward_amount: config.social_share_reward_amount ? parseFloat(config.social_share_reward_amount) : 5,
        reward_message: config.social_share_message || '📱 Share 3 sets & get €5 off!'
      });
    } catch (error) {
      console.error('Error fetching social share config:', error);
    }
  };

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('shop_searchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('shop_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('shop_sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('shop_viewMode', viewMode);
  }, [viewMode]);

  const loadFavorites = async () => {
    if (!isAuthenticated || !user?.user_id) {
      setFavorites(new Set());
      return;
    }

    try {
      setFavoritesLoading(true);
      const response = await favoritesApi.getAll(user.user_id);
      
      // Check if response and data exist, and if favorites is an array
      // The API returns the favorites array directly, not wrapped in an object
      if (response?.data && Array.isArray(response.data)) {
        const favoriteSetIds = response.data.map(fav => fav.set_id);
        setFavorites(new Set(favoriteSetIds));
      } else {
        console.log('No favorites data found or invalid format:', response?.data);
        setFavorites(new Set());
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites(new Set());
    } finally {
      setFavoritesLoading(false);
    }
  };

  const toggleFavorite = async (setId: number) => {
    if (!isAuthenticated || !user?.user_id) {
      setError('Please log in to save favorites');
      return;
    }

    try {
      setFavoritesLoading(true);
      
      if (favorites.has(setId)) {
        // Remove from favorites
        await favoritesApi.remove(user.user_id, setId);
        const newFavorites = new Set(favorites);
        newFavorites.delete(setId);
        setFavorites(newFavorites);
        setSuccess('Removed from favorites');
      } else {
        // Add to favorites
        await favoritesApi.add(user.user_id, setId);
        const newFavorites = new Set(favorites);
        newFavorites.add(setId);
        setFavorites(newFavorites);
        setSuccess('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorites');
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleOpenRatingDialog = (set: SetType) => {
    setSelectedSetForRating(set);
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    setSelectedSetForRating(null);
  };

  const handleOpenLearningOutcomesDialog = (set: SetType) => {
    setSelectedSetForOutcomes(set);
    setLearningOutcomesDialogOpen(true);
  };

  const handleCloseLearningOutcomesDialog = () => {
    setLearningOutcomesDialogOpen(false);
    setSelectedSetForOutcomes(null);
  };

  const handleRatingSubmitted = () => {
    // Refresh the sets data to show updated ratings
    fetchSets();
  };

  const fetchSets = async () => {
    try {
      setLoading(true);
      console.log('ShopPage - Starting to fetch shop sets...');
      const response = await shopApi.getShopSets();
      console.log('ShopPage - Full response:', response);
      console.log('ShopPage - Response data:', response.data);
      console.log('ShopPage - Fetched shop sets:', response.data.sets.length, 'sets');
      console.log('ShopPage - Sample shop set:', response.data.sets[0]);
      console.log('ShopPage - Sample shop set manual field:', response.data.sets[0]?.manual);
      console.log('ShopPage - Sample shop set keys:', Object.keys(response.data.sets[0] || {}));
      
      const sets = response.data.sets;
      
      // Media data is already provided by the server in the sets response
      const setsWithMedia = sets.map(set => ({
        ...set,
        media: set.media || []
      }));
      
      console.log('ShopPage - Setting sets with media:', setsWithMedia);
      setSets(setsWithMedia);
      console.log('ShopPage - Sets state updated, total sets:', setsWithMedia.length);
    } catch (err: any) {
      setError('Failed to load sets');
      console.error('Error fetching shop sets:', err);
      console.error('Error details:', err.response?.data);
      console.error('Error status:', err.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const handleBuySet = (set: SetType) => {
    try {
      addToCart(set, 1);
      setSuccess(`${getTranslatedSetName(set)} added to cart!`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      setError(error.message || 'Failed to add item to cart');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDownloadStudentManual = (set: SetType) => {
    if (set.manual) {
      // Create a text file with the manual content
      const blob = new Blob([set.manual], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${set.name || 'set'}_manual.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      console.log('No manual available for this set');
    }
  };

  const handleOpenManual = (set: SetType) => {
    console.log('🔧 handleOpenManual called for set:', set.set_id, set.name);
    console.log('🔧 Set manual field:', set.manual);
    console.log('🔧 Set keys:', Object.keys(set));
    setSelectedSetForManual(set);
    setManualDialogOpen(true);
    console.log('🔧 Manual dialog should now be open');
  };

  const handleCloseManual = () => {
    setManualDialogOpen(false);
    setSelectedSetForManual(null);
  };

  const handleOpenVideo = (set: SetType) => {
    if (set.video_url) {
      // Open video in a new tab
      window.open(set.video_url, '_blank');
    }
  };

  const handleDirectPurchase = (set: SetType) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (set.set_type === 'admin') {
      // Direct purchase for admin sets
      setSelectedSetForPurchase(set);
      setPurchaseDialogOpen(true);
    } else {
      // Purchase request for provider sets
      setSelectedSetForPurchase(set);
      setPurchaseDialogOpen(true);
    }
  };

  const handleAddToCart = async (set: SetType) => {
    try {
      const quantity = getQuantity(set.set_id);
      await addToCart(set, quantity);
      setAddedToCartFeedback(set.set_id);
      setTimeout(() => setAddedToCartFeedback(null), 2000);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      if (error.message === 'LOGIN_REQUIRED') {
        setError('Please login to add items to your cart');
        setTimeout(() => {
          setError(null);
          navigate('/login');
        }, 2000);
      } else {
        setError(error.message || 'Failed to add item to cart');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleCreateOrder = async (set: SetType) => {
    try {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Create order data
      const orderData = {
        customer_id: user.user_id,
        items: [{
          set_id: set.set_id,
          quantity: 1,
          price: set.price || set.base_price || 0
        }],
        total_amount: set.price || set.base_price || 0,
        status: 'pending',
        payment_method: 'direct_purchase',
        notes: `Direct purchase of ${set.name}`
      };

      // Create the order
      const response = await ordersApi.create(orderData);
      
      setSuccess(`Order created successfully! Order ID: ${response.data.order_id || response.data.id}`);
      setTimeout(() => setSuccess(null), 5000);
      
      // Refresh order count
      refreshOrderCount();
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      setError(error.response?.data?.error || 'Failed to create order');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCreateOrderWithInvoice = async (set: SetType) => {
    try {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Calculate total with handling fee
      const setPrice = set.price || set.base_price || 0;
      const handlingFee = 15.00;
      const totalAmount = setPrice + handlingFee;

      // Create order data with invoice generation
      const orderData = {
        customer_id: user.user_id,
        items: [
          {
            set_id: set.set_id,
            quantity: 1,
            price: setPrice,
            set_type: set.set_type,
            provider_id: set.provider_id || null
          },
          {
            set_id: null, // Special handling fee item
            quantity: 1,
            price: handlingFee,
            set_type: 'handling_fee',
            provider_id: null,
            description: 'Shipment handling and transport'
          }
        ],
        total_amount: totalAmount,
        status: 'pending_payment', // New status for invoice generation
        payment_method: 'invoice',
        payment_status: 'pending',
        notes: `Purchase request for ${set.name} (${set.set_type === 'admin' ? 'Platform Set' : 'Provider Set'}) - Includes €${handlingFee} handling fee`,
        invoice_required: true,
        set_type: set.set_type
      };

      // Create the order with invoice
      const response = await ordersApi.create(orderData);
      
      const orderId = response.data.order_id || response.data.id;
      const invoiceData = response.data.invoice;
      
      setSuccess(`Order created successfully! Order ID: ${orderId}. Total: €${totalAmount.toFixed(2)} (including €${handlingFee} handling fee). Invoice generated and opened automatically.`);
      setTimeout(() => setSuccess(null), 8000);
      
      // Store invoice URL for manual access
      if (invoiceData && invoiceData.downloadUrl) {
        const fullInvoiceUrl = `http://localhost:5001${invoiceData.downloadUrl}`;
        setInvoiceUrl(fullInvoiceUrl);
        setTimeout(() => setInvoiceUrl(null), 8000); // Clear after 8 seconds
      }
      
      // Refresh order count
      refreshOrderCount();
      
      // Automatically open invoice in new tab if available
      if (invoiceData && invoiceData.downloadUrl) {
        setTimeout(() => {
          const invoiceUrl = `http://localhost:5001${invoiceData.downloadUrl}`;
          window.open(invoiceUrl, '_blank');
        }, 1000); // Small delay to ensure success message is shown first
      }
      
    } catch (error: any) {
      console.error('Error creating order with invoice:', error);
      setError(error.response?.data?.error || 'Failed to create order');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Photo navigation functions
  const getCurrentPhotoIndex = (setId: number) => {
    return photoIndices[setId] || 0;
  };

  const getSetPhotos = (set: SetType) => {
    return set.media || [];
  };

  const getCurrentPhoto = (set: SetType) => {
    const photos = getSetPhotos(set);
    const currentIndex = getCurrentPhotoIndex(set.set_id);
    return photos[currentIndex] || photos[0];
  };

  const navigatePhoto = (setId: number, direction: 'prev' | 'next') => {
    const set = sets.find(s => s.set_id === setId);
    if (!set) return;
    
    const photos = getSetPhotos(set);
    if (!photos || photos.length <= 1) return;

    const currentIndex = getCurrentPhotoIndex(setId);
    let newIndex: number;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    } else {
      newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    }
    
    setPhotoIndices(prev => ({
      ...prev,
      [setId]: newIndex
    }));
  };

  const handleCheckout = async (orderData: any) => {
    try {
      console.log('🛒 Placing order:', orderData);
      
      // Use the proper API service instead of direct fetch
      const response = await ordersApi.create(orderData);
      
      console.log('✅ Order created successfully:', response.data);
      
      setSuccess('Order placed successfully!');
      // Refresh the order notification count to show the new order
      refreshOrderCount();
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('❌ Error placing order:', err);
      setError(`Failed to place order: ${err?.response?.data?.error || err?.message || 'Network error'}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  // Get unique categories and difficulties for filters
  const categories = Array.from(new Set(sets.map(set => set.category).filter(Boolean)));
  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];

  // Filter and sort sets
  const filteredAndSortedSets = React.useMemo(() => {
    console.log('ShopPage - Starting filtering with', sets.length, 'sets');
    let filtered = sets;
    
    // Apply provider filter based on cart contents
    const currentProvider = getCurrentProvider();
    if (currentProvider) {
      filtered = filtered.filter(set => {
        // Only show sets from the same provider/admin as what's in the cart
        return set.provider_id === currentProvider.provider_id;
      });
      console.log('ShopPage - After provider filter:', filtered.length, 'sets (filtering for provider:', currentProvider.provider_name, ')');
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(set => 
        getTranslatedSetName(set).toLowerCase().includes(searchLower) ||
        set.category.toLowerCase().includes(searchLower) ||
        set.difficulty_level.toLowerCase().includes(searchLower) ||
        (set.description && set.description.toLowerCase().includes(searchLower))
      );
      console.log('ShopPage - After search filter:', filtered.length, 'sets');
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(set => set.category === filterCategory);
      console.log('ShopPage - After category filter:', filtered.length, 'sets');
    }

    // Apply difficulty filter
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(set => set.difficulty_level === filterDifficulty);
      console.log('ShopPage - After difficulty filter:', filtered.length, 'sets');
    }

    // Sort sets - always show favorites first, then apply selected sorting
    return [...filtered].sort((a, b) => {
      // First, check if one is favorite and the other is not
      const aIsFavorite = favorites.has(a.set_id);
      const bIsFavorite = favorites.has(b.set_id);
      
      if (aIsFavorite && !bIsFavorite) return -1; // a comes first
      if (!aIsFavorite && bIsFavorite) return 1;  // b comes first
      
      // If both are favorites or both are not favorites, apply the selected sorting
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = getTranslatedSetName(a).toLowerCase();
          bValue = getTranslatedSetName(b).toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder: { [key: string]: number } = { 
            beginner: 1, 
            intermediate: 2, 
            advanced: 3 
          };
          aValue = difficultyOrder[a.difficulty_level] || 0;
          bValue = difficultyOrder[b.difficulty_level] || 0;
          break;
        case 'duration':
          aValue = a.estimated_duration_minutes || 0;
          bValue = b.estimated_duration_minutes || 0;
          break;
        default:
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      } else {
        if (aValue > bValue) return -1;
        if (aValue < bValue) return 1;
        return 0;
      }
    });
  }, [sets, sortBy, sortOrder, searchTerm, filterCategory, filterDifficulty, currentLanguage, favorites, getCurrentProvider]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" component="h1">
            {t('shop.title') || 'MakerSets Shop'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('shop.subtitle') || 'Discover amazing STEM projects and educational sets for all ages'}
          </Typography>
        </Box>
        
        {/* Cart Summary */}
        {getTotalItems() > 0 && (
          <Paper elevation={2} sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCartIcon />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {getTotalItems()} items in cart
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  €{Number(getTotalPrice() || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Search and Filters */}
      <Box mb={3}>
        <TextField
          id="sets-search"
          name="sets-search"
          fullWidth
          placeholder={t('search.setsPlaceholder') || "Search sets by name, category, difficulty, or description..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />

        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          {/* Category Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              id="category-filter"
              name="category-filter"
              labelId="category-filter-label"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="all">{t('common.all') || 'All Categories'}</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Difficulty Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="difficulty-filter-label">Difficulty</InputLabel>
            <Select
              id="difficulty-filter"
              name="difficulty-filter"
              labelId="difficulty-filter-label"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <MenuItem value="all">{t('common.all') || 'All Levels'}</MenuItem>
              {difficulties.map(difficulty => (
                <MenuItem key={difficulty} value={difficulty}>
                  {t(`difficulty.${difficulty}`) || difficulty}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sorting */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="sort-by-label">Sort By</InputLabel>
            <Select
              id="sort-by"
              name="sort-by"
              labelId="sort-by-label"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="name">{t('dropdowns.name')}</MenuItem>
              <MenuItem value="category">{t('dropdowns.category')}</MenuItem>
              <MenuItem value="difficulty">{t('dropdowns.difficulty')}</MenuItem>
              <MenuItem value="duration">{t('dropdowns.duration')}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="sort-order-label">Order</InputLabel>
            <Select
              id="sort-order"
              name="sort-order"
              labelId="sort-order-label"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <MenuItem value="asc">{t('dropdowns.ascending')}</MenuItem>
              <MenuItem value="desc">{t('dropdowns.descending')}</MenuItem>
            </Select>
          </FormControl>

          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ListViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="body2" color="text.secondary">
            ({filteredAndSortedSets.length} sets)
          </Typography>
          
          {/* Provider filter indicator */}
          {getCurrentProvider() && (
            <Alert 
              severity="info" 
              sx={{ mt: 1, mb: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => {
                    if (window.confirm('Clear your cart to see all available sets?')) {
                      clearCart();
                    }
                  }}
                >
                  Clear Cart
                </Button>
              }
            >
              Showing sets from <strong>{getCurrentProvider()?.provider_name}</strong> only. 
              Clear your cart to see all available sets.
            </Alert>
          )}
        </Box>
      </Box>

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {renderError(error)}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4}>
          {filteredAndSortedSets.map((set) => (
            <Card key={`${set.set_id}-${set.set_type || 'provider'}`} sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                transform: 'translateY(-2px)'
              }
            }}>
              {getSetPhotos(set).length > 0 ? (
                <Box sx={{ position: 'relative', aspectRatio: '3/2' }}>
                  <img
                    src={getCurrentPhoto(set)?.file_url}
                    alt={set.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px 8px 0 0',
                      backgroundColor: '#f5f5f5'
                    }}
                  />
                  
                  {/* Photo Navigation Arrows */}
                  {getSetPhotos(set).length > 1 && (
                    <>
                      <IconButton
                        sx={{
                          position: 'absolute',
                          left: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigatePhoto(set.set_id, 'prev');
                        }}
                        size="small"
                        title="Previous Photo"
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                      <IconButton
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigatePhoto(set.set_id, 'next');
                        }}
                        size="small"
                        title="Next Photo"
                      >
                        <ChevronRightIcon />
                      </IconButton>
                    </>
                  )}
                  
                  {/* Photo Counter */}
                  {getSetPhotos(set).length > 1 && (
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: 8, 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem'
                    }}>
                      {getCurrentPhotoIndex(set.set_id) + 1} / {getSetPhotos(set).length}
                    </Box>
                  )}
                  
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
                    {set.video_url && (
                      <IconButton
                      sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                        onClick={() => window.open(set.video_url, '_blank')}
                        size="small"
                        title="Watch Video"
                      >
                        <YouTubeIcon sx={{ color: 'error.main' }} />
                      </IconButton>
                    )}
                    <IconButton
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                        },
                      }}
                      onClick={() => toggleFavorite(set.set_id)}
                      size="small"
                      title="Add to Favorites"
                    >
                      {favorites.has(set.set_id) ? (
                        <FavoriteIcon sx={{ color: 'error.main' }} />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>
                    </Box>
                </Box>
              ) : (
                <Box sx={{ aspectRatio: '3/2', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No image available
                  </Typography>
                </Box>
              )}
              <CardContent sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column',
                p: 3,
                '&:last-child': { pb: 3 }
              }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {getTranslatedSetName(set)}
                </Typography>
                
                {/* Enhanced Provider Information */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 1,
                  p: 1,
                  backgroundColor: set.set_type === 'admin' ? 'primary.light' : 'secondary.light',
                  borderRadius: 1,
                  border: `2px solid ${set.set_type === 'admin' ? 'primary.main' : 'secondary.main'}`
                }}>
                  {/* Provider Avatar */}
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {set.set_type === 'admin' ? 'MP' : 
                     (set.provider_company || set.provider_username || 'P').substring(0, 2).toUpperCase()}
                  </Box>
                  
                  {/* Provider Details */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" sx={{ 
                      color: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                      fontWeight: 600,
                      display: 'block',
                      fontSize: '11px'
                    }}>
                      {set.set_type === 'admin' ? '🏢 MakerSet Platform' : 
                       `🏢 ${getProviderDisplayName({ 
                         user_id: set.provider_id, // Use provider_id as user_id for generation
                         provider_code: set.provider_code,
                         provider_company: set.provider_company,
                         provider_name: set.provider_name,
                       })}`}
                    </Typography>
                  </Box>
                  
                  {/* Provider Type Badge */}
                  <Chip 
                    label={set.set_type === 'admin' ? 'Platform' : 'Provider'} 
                    size="small" 
                    color={set.set_type === 'admin' ? 'primary' : 'secondary'}
                    variant="filled"
                    sx={{ fontSize: '9px', height: '18px' }}
                  />
                  
                  {/* Trust Certificate Badge or Mystery Box */}
                  {set.tested_by_makerset ? (
                    <Chip 
                      icon={<VerifiedIcon sx={{ fontSize: '12px' }} />}
                      label="Trust Certificate"
                      size="small" 
                      color="success"
                      variant="filled"
                      sx={{ 
                        fontSize: '9px', 
                        height: '18px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        fontWeight: 'bold',
                        ml: 0.5
                      }}
                    />
                  ) : (
                    <Chip 
                      icon={<Box sx={{ fontSize: '12px' }} />}
                      label="Mystery Box"
                      size="small" 
                      color="warning"
                      variant="filled"
                      sx={{ 
                        fontSize: '9px', 
                        height: '18px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        fontWeight: 'bold',
                        ml: 0.5,
                        animation: 'pulse 2s infinite'
                      }}
                    />
                  )}
                </Box>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2, 
                    flexGrow: 1,
                    minHeight: '60px',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {getTranslatedSetDescription(set) || 
                    `Explore the fascinating world of ${set.category} through hands-on learning. This ${set.difficulty_level} project is perfect for ages ${set.recommended_age_min || 8}-${set.recommended_age_max || 12} and takes approximately ${set.estimated_duration_minutes || 60} minutes to complete.`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={set.category} size="small" />
                  <Chip 
                    label={set.difficulty_level} 
                    color={set.difficulty_level === 'beginner' ? 'success' : 
                           set.difficulty_level === 'intermediate' ? 'warning' : 'error'}
                    size="small" 
                  />
                </Box>
                {getLearningOutcomes(set).length > 0 && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Learning Outcomes:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {getLearningOutcomes(set).slice(0, 2).map((outcome, index) => (
                        <Chip
                          key={index}
                          label={outcome}
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => handleOpenLearningOutcomesDialog(set)}
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: '20px',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'primary.contrastText'
                            }
                          }}
                        />
                      ))}
                      {getLearningOutcomes(set).length > 2 && (
                        <Chip
                          label={`+${getLearningOutcomes(set).length - 2} more`}
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => handleOpenLearningOutcomesDialog(set)}
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: '20px',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'primary.contrastText'
                            }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                )}
                
                {/* Customer Rating and Feedback Section */}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          sx={{
                            fontSize: '1rem',
                            color: star <= (set.average_rating || 0) ? 'warning.main' : 'grey.300',
                          }}
                        />
                      ))}
                </Box>
                <Typography variant="body2" color="text.secondary">
                      {set.average_rating ? set.average_rating.toFixed(1) : '0.0'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({set.review_count || 0} reviews)
                </Typography>
                  </Box>
                  
                  {/* Customer Review */}
                  {set.latest_review_text ? (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        "{set.latest_review_text}"
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          - {set.latest_reviewer_name || 'Happy Customer'}
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          sx={{ 
                            fontSize: '0.75rem', 
                            minWidth: 'auto', 
                            p: 0.5,
                            textTransform: 'none',
                            color: 'primary.main',
                            fontWeight: 500,
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'white'
                            }
                          }}
                          onClick={() => navigate(`/reviews/${set.set_id}`)}
                        >
                          📝 View All Reviews
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No reviews yet - be the first to share your experience!
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Share your feedback
                </Typography>
                        <Button
                          size="small"
                          variant="text"
                          sx={{ 
                            fontSize: '0.75rem', 
                            minWidth: 'auto', 
                            p: 0.5,
                            textTransform: 'none',
                            color: 'primary.main',
                            fontWeight: 500,
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'white'
                            }
                          }}
                          onClick={() => navigate(`/reviews/${set.set_id}`)}
                        >
                          📝 View All Reviews
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
                
                {/* Price and Availability */}
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                      €{Number(set.price || set.display_price || set.base_price || 0).toFixed(2)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: getAvailableQuantity(set) > 10 ? 'success.main' : 
                                          getAvailableQuantity(set) > 0 ? 'warning.main' : 'error.main'
                        }}
                      />
                      <Typography 
                        variant="body2" 
                        color={getAvailableQuantity(set) === -1 ? 'text.secondary' :
                               getAvailableQuantity(set) > 10 ? 'success.main' : 
                               getAvailableQuantity(set) > 0 ? 'warning.main' : 'error.main'}
                        sx={{ fontWeight: 500 }}
                      >
                        {getAvailableQuantity(set) === -1 ? 'Parts not configured' :
                         getAvailableQuantity(set) > 99 ? '99+' : getAvailableQuantity(set) + ' available'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Quantity Selector */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Qty:
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(set.set_id, getQuantity(set.set_id) - 1)}
                        disabled={getQuantity(set.set_id) <= 1}
                        sx={{ 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          width: 28,
                          height: 28
                        }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          minWidth: 30, 
                          textAlign: 'center',
                          fontWeight: 600,
                          px: 1
                        }}
                      >
                        {getQuantity(set.set_id)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(set.set_id, getQuantity(set.set_id) + 1)}
                        disabled={getQuantity(set.set_id) >= Math.min(getAvailableQuantity(set), 99)}
                        sx={{ 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          width: 28,
                          height: 28
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => handleAddToCart(set)}
                      size="medium"
                      fullWidth
                      disabled={getAvailableQuantity(set) === 0}
                      sx={{ 
                        fontWeight: 600,
                        py: 1.2,
                        borderRadius: 2,
                        backgroundColor: addedToCartFeedback === set.set_id ? 'success.main' : 'primary.main',
                        '&:hover': {
                          backgroundColor: addedToCartFeedback === set.set_id ? 'success.dark' : 'primary.dark',
                        }
                      }}
                    >
                      {addedToCartFeedback === set.set_id ? '✓ Added!' : 
                       !isAuthenticated ? 'Login to Buy' :
                       getAvailableQuantity(set) === 0 ? 'Out of Stock' : 
                       `Add ${getQuantity(set.set_id)} to Cart`}
                    </Button>
                    
                <Button
                  variant="outlined"
                      onClick={() => handleOpenRatingDialog(set)}
                      size="medium"
                  fullWidth
                      sx={{ 
                        fontWeight: 500,
                        py: 1,
                        borderRadius: 2,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'white'
                        }
                      }}
                    >
                      ⭐ Rate & Review
                </Button>
                
                    <Button
                  variant="outlined"
                  onClick={() => handleOpenManual(set)}
                  size="medium"
                  fullWidth
                  sx={{ 
                    fontWeight: 500,
                    py: 1,
                    borderRadius: 2,
                    borderColor: 'secondary.main',
                    color: 'secondary.main',
                    '&:hover': {
                      backgroundColor: 'secondary.light',
                      color: 'white'
                    }
                  }}
                >
                  📖 Manual & Instructions
                </Button>
                
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <SocialShare
                    url={`${window.location.origin}/shop?set=${set.set_id}`}
                    title={set.name || 'MakerLab STEM Set'}
                    description={set.description || 'Amazing STEM learning set'}
                    category={set.category}
                    difficulty={set.difficulty_level}
                    age={`${set.recommended_age_min || 8}-${set.recommended_age_max || 12}`}
                    price={set.price || set.display_price || set.base_price}
                    variant="icon"
                    size="medium"
                    shareCount={set.share_count || 0}
                    sharesRequired={socialShareConfig.shares_required}
                    rewardAmount={socialShareConfig.reward_amount}
                    sharesUntilReward={shareStats.sharesUntilReward}
                    hasEarnedReward={shareStats.hasEarnedReward}
                    onShare={(platform) => {
                      // Track share
                      if (isAuthenticated && user?.user_id) {
                        fetch(`http://localhost:5001/api/social-shares/track`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                          },
                          body: JSON.stringify({
                            set_id: set.set_id,
                            platform: platform
                          })
                        }).then(res => res.json())
                          .then(data => {
                            if (data.reward_eligible) {
                              setSuccess(`🎉 You earned a reward! Share ${socialShareConfig.shares_required} sets to get €${socialShareConfig.reward_amount} off!`);
                              setTimeout(() => setSuccess(null), 4000);
                            }
                          });
                      }
                    }}
                  />
                  
                  {/* Reward Progress Banner */}
                  {isAuthenticated && (
                    <Box sx={{ 
                      fontSize: '0.7rem', 
                      color: 'text.secondary',
                      textAlign: 'center',
                      px: 1,
                      py: 0.5,
                      bgcolor: 'info.light',
                      borderRadius: 1
                    }}>
                      {socialShareConfig.reward_message.replace('{amount}', `€${socialShareConfig.reward_amount}`).replace('{shares}', socialShareConfig.shares_required.toString())}
                    </Box>
                  )}
                </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredAndSortedSets.map((set) => (
            <Card key={`${set.set_id}-${set.set_type || 'provider'}`} sx={{ 
              display: 'flex', 
              flexDirection: 'row',
              height: 220,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                transform: 'translateY(-2px)'
              }
            }}>
              {/* Image Section */}
              <Box sx={{ width: 200, flexShrink: 0, position: 'relative' }}>
                {getSetPhotos(set).length > 0 ? (
                  <>
                    <img
                      src={getCurrentPhoto(set)?.file_url}
                      alt={set.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px 0 0 8px',
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                    
                    {/* Photo Navigation for List View */}
                    {getSetPhotos(set).length > 1 && (
                      <>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            left: 4,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 1)',
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigatePhoto(set.set_id, 'prev');
                          }}
                          size="small"
                          title="Previous Photo"
                        >
                          <ChevronLeftIcon />
                        </IconButton>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            right: 4,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 1)',
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigatePhoto(set.set_id, 'next');
                          }}
                          size="small"
                          title="Next Photo"
                        >
                          <ChevronRightIcon />
                        </IconButton>
                        
                        {/* Photo Counter for List View */}
                        <Box sx={{ 
                          position: 'absolute', 
                          bottom: 4, 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }}>
                          {getCurrentPhotoIndex(set.set_id) + 1} / {getSetPhotos(set).length}
                        </Box>
                      </>
                    )}
                  </>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px 0 0 8px'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No Image
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Content Section */}
              <CardContent sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                p: 3,
                '&:last-child': { pb: 3 }
              }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 1 }}>
                        {getTranslatedSetName(set)}
                      </Typography>
                      
                      {/* Enhanced Provider Information for List View */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1,
                        p: 0.5,
                        backgroundColor: set.set_type === 'admin' ? 'primary.light' : 'secondary.light',
                        borderRadius: 1,
                        border: `1px solid ${set.set_type === 'admin' ? 'primary.main' : 'secondary.main'}`,
                        width: 'fit-content'
                      }}>
                        {/* Provider Avatar */}
                        <Box sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          {set.set_type === 'admin' ? 'MP' : 
                           (set.provider_company || set.provider_username || 'P').substring(0, 2).toUpperCase()}
                        </Box>
                        
                        {/* Provider Details */}
                        <Typography variant="caption" sx={{ 
                          color: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                          fontWeight: 600,
                          fontSize: '10px'
                        }}>
                          {set.set_type === 'admin' ? '🏢 MakerSet Platform' : 
                           `🏢 ${set.provider_company || set.provider_username || 'Provider'}`}
                        </Typography>
                        
                        {/* Provider Type Badge */}
                        <Chip 
                          label={set.set_type === 'admin' ? 'Platform' : 'Provider'} 
                          size="small" 
                          color={set.set_type === 'admin' ? 'primary' : 'secondary'}
                          variant="filled"
                          sx={{ fontSize: '8px', height: '16px' }}
                        />
                        
                        {/* Trust Certificate Badge or Mystery Box */}
                        {set.tested_by_makerset ? (
                          <Chip 
                            icon={<VerifiedIcon sx={{ fontSize: '10px' }} />}
                            label="Trust Certificate"
                            size="small" 
                            color="success"
                            variant="filled"
                            sx={{ 
                              fontSize: '8px', 
                              height: '16px',
                              backgroundColor: '#4caf50',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        ) : (
                          <Chip 
                            icon={<Box sx={{ fontSize: '10px' }} />}
                            label="Mystery Box"
                            size="small" 
                            color="warning"
                            variant="filled"
                            sx={{ 
                              fontSize: '8px', 
                              height: '16px',
                              backgroundColor: '#ff9800',
                              color: 'white',
                              fontWeight: 'bold',
                              animation: 'pulse 2s infinite'
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {set.video_url && (
                        <IconButton
                          size="small"
                          onClick={() => window.open(set.video_url, '_blank')}
                          title="Watch Video"
                        >
                          <YouTubeIcon sx={{ color: 'error.main' }} />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => toggleFavorite(set.set_id)}
                      >
                        {favorites.has(set.set_id) ? (
                          <FavoriteIcon sx={{ color: 'error.main' }} />
                        ) : (
                          <FavoriteBorderIcon />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip label={set.category} size="small" variant="outlined" />
                    <Chip label={set.difficulty_level} size="small" variant="outlined" />
                    
                    
                    
                    {getAvailableQuantity(set) === -1 && (
                      <Chip 
                        label="Parts Not Configured" 
                        size="small" 
                        color="warning" 
                        variant="filled"
                      />
                    )}
                    {getAvailableQuantity(set) === 0 && (
                      <Chip 
                        label="Out of Stock" 
                        size="small" 
                        color="error" 
                        variant="filled"
                      />
                    )}
                    {getAvailableQuantity(set) > 0 && (
                      <Chip 
                        label={set.set_type === 'admin' ? 'Platform Set' : `${getAvailableQuantity(set)} Available`} 
                        size="small" 
                        color="success" 
                        variant="filled"
                      />
                    )}
                    {getLearningOutcomes(set).length > 0 && (
                      <Chip 
                        label={`${getLearningOutcomes(set).length} Learning Outcomes`} 
                        size="small" 
                        variant="outlined" 
                        color="secondary"
                      />
                  )}
                </Box>

                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2, 
                      flexGrow: 1,
                      minHeight: '40px',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {getTranslatedSetDescription(set) || 
                      `Explore the fascinating world of ${set.category} through hands-on learning. This ${set.difficulty_level} project is perfect for ages ${set.recommended_age_min || 8}-${set.recommended_age_max || 12} and takes approximately ${set.estimated_duration_minutes || 60} minutes to complete.`}
                  </Typography>

                  {/* Learning Outcomes */}
                  {getLearningOutcomes(set).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Learning Outcomes:
                  </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {getLearningOutcomes(set).slice(0, 3).map((outcome, index) => (
                          <Chip 
                            key={index}
                            label={outcome}
                            size="small" 
                            variant="outlined"
                            clickable
                            onClick={() => handleOpenLearningOutcomesDialog(set)}
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '20px',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText'
                              }
                            }}
                          />
                        ))}
                        {getLearningOutcomes(set).length > 3 && (
                          <Chip
                            label={`+${getLearningOutcomes(set).length - 3} more`}
                            size="small"
                            variant="outlined"
                            clickable
                            onClick={() => handleOpenLearningOutcomesDialog(set)}
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '20px',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText'
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Customer Rating and Feedback Section */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            sx={{
                              fontSize: '1rem',
                              color: star <= (set.average_rating || 0) ? 'warning.main' : 'grey.300',
                            }}
                          />
                        ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                        {set.average_rating ? set.average_rating.toFixed(1) : '0.0'}
                  </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({set.review_count || 0} reviews)
                      </Typography>
                    </Box>
                    
                    {/* Sample Customer Feedback */}
                    {set.customer_feedback && set.customer_feedback.length > 0 ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "{set.customer_feedback[0].review}"
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            - {set.customer_feedback[0].customer_name || 'Happy Customer'}
                  </Typography>
                          <Button
                            size="small"
                            variant="text"
                            sx={{ 
                              fontSize: '0.7rem', 
                              minWidth: 'auto', 
                              p: 0.5,
                              textTransform: 'none'
                            }}
                            onClick={() => {
                              console.log('View all reviews for set:', set.set_id);
                            }}
                          >
                            View All Reviews
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No reviews yet - be the first to share your experience!
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Share your feedback
                          </Typography>
                          <Button
                            size="small"
                            variant="text"
                            sx={{ 
                              fontSize: '0.7rem', 
                              minWidth: 'auto', 
                              p: 0.5,
                              textTransform: 'none'
                            }}
                            onClick={() => {
                              console.log('View all reviews for set:', set.set_id);
                            }}
                          >
                            View All Reviews
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Bottom Section with Price and Action Buttons */}
                <Box sx={{ mt: 'auto', pt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                      €{Number(set.display_price || set.price || set.base_price || 0).toFixed(2)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: getAvailableQuantity(set) > 10 ? 'success.main' : 
                                          getAvailableQuantity(set) > 0 ? 'warning.main' : 'error.main'
                        }}
                      />
                      <Typography 
                        variant="body2" 
                        color={getAvailableQuantity(set) === -1 ? 'text.secondary' :
                               getAvailableQuantity(set) > 10 ? 'success.main' : 
                               getAvailableQuantity(set) > 0 ? 'warning.main' : 'error.main'}
                        sx={{ fontWeight: 500 }}
                      >
                        {getAvailableQuantity(set) === -1 ? 'Parts not configured' :
                         getAvailableQuantity(set) > 99 ? '99+' : getAvailableQuantity(set) + ' available'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                      onClick={() => handleDirectPurchase(set)}
                      size="large"
                      disabled={getAvailableQuantity(set) <= 0}
                      sx={{ 
                        fontWeight: 600,
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        flex: 1,
                        backgroundColor: addedToCartFeedback === set.set_id ? 'success.main' : 
                                       getAvailableQuantity(set) === -1 ? 'warning.main' :
                                       getAvailableQuantity(set) === 0 ? 'error.main' : 'primary.main',
                        '&:hover': {
                          backgroundColor: addedToCartFeedback === set.set_id ? 'success.dark' : 
                                         getAvailableQuantity(set) === -1 ? 'warning.dark' :
                                         getAvailableQuantity(set) === 0 ? 'error.dark' : 'primary.dark',
                        }
                      }}
                    >
                      {addedToCartFeedback === set.set_id ? '✓ Added!' : 
                       !isAuthenticated ? 'Login to Buy' :
                       getAvailableQuantity(set) === -1 ? 'Parts Not Configured' :
                       getAvailableQuantity(set) === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                    
                  <Button
                    variant="outlined"
                      onClick={() => handleOpenRatingDialog(set)}
                      size="large"
                      sx={{ 
                        fontWeight: 500,
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'white'
                        },
                        flex: 1
                      }}
                    >
                      ⭐ Rate & Review
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => handleOpenManual(set)}
                    size="large"
                    sx={{ 
                      fontWeight: 500,
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: 'secondary.main',
                      color: 'secondary.main',
                      '&:hover': {
                        backgroundColor: 'secondary.light',
                        color: 'white'
                      },
                      flex: 1
                    }}
                  >
                    📖 Manual
                  </Button>
                </Box>
              </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Floating Cart */}
      <FloatingCart onCheckout={handleCheckout} />

      {/* Rating Dialog */}
      <RatingDialog
        open={ratingDialogOpen}
        onClose={handleCloseRatingDialog}
        set={selectedSetForRating}
        onRatingSubmitted={handleRatingSubmitted}
      />

      {/* Learning Outcomes Dialog */}
      <Dialog 
        open={learningOutcomesDialogOpen} 
        onClose={handleCloseLearningOutcomesDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            Learning Outcomes - {selectedSetForOutcomes?.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedSetForOutcomes && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {getTranslatedSetDescription(selectedSetForOutcomes)}
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                What You'll Learn:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {getLearningOutcomes(selectedSetForOutcomes).map((outcome, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: 'grey.50',
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main',
                        minWidth: '20px'
                      }}
                    >
                      {index + 1}.
                    </Typography>
                    <Typography variant="body1">
                      {outcome}
                    </Typography>
                  </Box>
                ))}
              </Box>
              
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="body2" color="primary.contrastText">
                  <strong>Ready to start learning?</strong> Add this set to your cart and begin your STEM journey!
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLearningOutcomesDialog}>
            Close
          </Button>
          {selectedSetForOutcomes && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleAddToCart(selectedSetForOutcomes);
                handleCloseLearningOutcomesDialog();
              }}
              disabled={getAvailableQuantity(selectedSetForOutcomes) <= 0}
            >
              Add to Cart
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Direct Purchase Dialog */}
      <Dialog 
        open={purchaseDialogOpen} 
        onClose={() => setPurchaseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedSetForPurchase?.set_type === 'admin' ? 'Complete Your Purchase' : 'Request Purchase'}
        </DialogTitle>
        <DialogContent>
          {selectedSetForPurchase && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {getTranslatedSetName(selectedSetForPurchase)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedSetForPurchase.description || 'No description available'}
              </Typography>
              
              {selectedSetForPurchase.set_type === 'admin' ? (
                // Admin set - direct purchase
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Order Summary
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Set Price:</Typography>
                    <Typography>€{Number(selectedSetForPurchase.price || selectedSetForPurchase.base_price || 0).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Available Quantity:</Typography>
                    <Typography color={getAvailableQuantity(selectedSetForPurchase) > 0 ? 'success.main' : 'error.main'}>
                      {getAvailableQuantity(selectedSetForPurchase)} sets
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6" color="primary">
                      €{Number(selectedSetForPurchase.price || selectedSetForPurchase.base_price || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                // Provider set - purchase request
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'blue.50', borderRadius: 1, border: '1px solid', borderColor: 'blue.200' }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    Purchase Request Process
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This is a provider set. Your purchase request will be sent to MakerSet admin for approval and invoice generation.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Set Price:</Typography>
                    <Typography>€{Number(selectedSetForPurchase.price || selectedSetForPurchase.base_price || 0).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Provider:</Typography>
                    <Typography>{selectedSetForPurchase.provider_company || selectedSetForPurchase.provider_username || 'Unknown'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Available Quantity:</Typography>
                    <Typography color={getAvailableQuantity(selectedSetForPurchase) > 0 ? 'success.main' : 'error.main'}>
                      {getAvailableQuantity(selectedSetForPurchase)} sets
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  
                  {/* Price Breakdown */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Set Price:</Typography>
                    <Typography>€{Number(selectedSetForPurchase.price || selectedSetForPurchase.base_price || 0).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Handling & Transport:</Typography>
                    <Typography>€15.00</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Estimated Total:</Typography>
                    <Typography variant="h6" color="primary">
                      €{(Number(selectedSetForPurchase.price || selectedSetForPurchase.base_price || 0) + 15.00).toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Next Steps:</strong><br/>
                      1. Submit purchase request<br/>
                      2. Admin will generate invoice<br/>
                      3. Complete payment as instructed<br/>
                      4. Admin confirms payment<br/>
                      5. Order is fulfilled and shipped
                    </Typography>
                  </Alert>
                </Box>
              )}

              {getAvailableQuantity(selectedSetForPurchase) === 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This set is currently out of stock. Please check back later.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)}>
            Cancel
          </Button>
          {selectedSetForPurchase && getAvailableQuantity(selectedSetForPurchase) > 0 && (
            <Button 
              variant="contained" 
              onClick={() => {
                // Create order and generate invoice
                handleCreateOrderWithInvoice(selectedSetForPurchase);
                setPurchaseDialogOpen(false);
              }}
              sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' } }}
            >
              Complete Purchase
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Manual Generator Dialog */}
      <ManualGenerator
        open={manualDialogOpen}
        onClose={handleCloseManual}
        selectedSet={selectedSetForManual}
      />
    </Box>
  );
};

export default ShopPage;
