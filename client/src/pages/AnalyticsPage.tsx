import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  DialogContentText,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  ShoppingCart as CartIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  FileUpload as FileUploadIcon,
  Schedule as ScheduleIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import api, { setsApi, partsApi, ordersApi, authApi, setPartsApi } from '../services/api';
import AutomatedReportingSection from '../components/AutomatedReportingSection';

interface ProviderStats {
  provider_id: number;
  provider_username: string;
  provider_company: string;
  provider_name: string;
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
  unique_sets_sold: number;
  total_units_sold: number;
  total_payout_amount: number;
  top_selling_sets: Array<{
    set_id: number;
    set_name: string;
    set_category: string;
    orders_count: number;
    units_sold: number;
    revenue: number;
    average_price: number;
  }>;
  monthly_payouts: Array<{
    month: string;
    orders_count: number;
    monthly_revenue: number;
    delivered_revenue: number;
    monthly_payout: number;
  }>;
}

interface SalesManagementData {
  sales: Array<{
    order_id: number;
    order_number: string;
    order_date: string;
    order_status: string;
    total_amount: number;
    payment_status: string;
    payment_method?: string;
    payment_reference?: string;
    payment_date?: string;
    payment_amount?: number;
    payment_notes?: string;
    payment_confirmed_at?: string;
    customer: {
      user_id: number;
      username: string;
      name: string;
      email: string;
      company?: string;
    };
    provider: {
      user_id: number;
      username: string;
      name: string;
      company?: string;
    };
    confirmed_by?: {
      username: string;
      name: string;
    };
    items: Array<{
      set_id: number;
      set_name: string;
      set_category: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }>;
  total_orders: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalSets: number;
    totalParts: number;
    totalOrders: number;
    totalRevenue: number;
    totalInventoryValue: number;
    activeUsers: number;
    conversionRate: number;
  };
  salesAnalytics: {
    totalSales: number;
    monthlySales: Array<{ month: string; sales: number; orders: number; revenue: number }>;
    topSellingSets: Array<{ name: string; sales: number; revenue: number; profit: number; margin: number }>;
    salesByCategory: Array<{ category: string; sales: number; revenue: number; percentage: number }>;
  };
  providerAnalytics: {
    provider_stats: ProviderStats[];
    total_providers: number;
    total_revenue: number;
    total_orders: number;
    total_payout_amount: number;
  };
  salesManagement: SalesManagementData;
  inventoryAnalytics: {
    totalInventoryValue: number;
    lowStockItems: number;
    fastMovingItems: Array<{ name: string; quantity: number; turnover: number; value: number }>;
    slowMovingItems: Array<{ name: string; quantity: number; lastSold: string; value: number }>;
    categoryBreakdown: Array<{ category: string; value: number; percentage: number; count: number }>;
  };
  profitAnalytics: {
    totalProfit: number;
    averageMargin: number;
    topProfitableSets: Array<{ name: string; sellingPrice: number; componentCost: number; profit: number; margin: number }>;
    leastProfitableSets: Array<{ name: string; sellingPrice: number; componentCost: number; profit: number; margin: number }>;
    profitByCategory: Array<{ category: string; totalProfit: number; averageMargin: number; setCount: number }>;
  };
  userAnalytics: {
    newUsers: number;
    returningUsers: number;
    userGrowth: number;
    userRoles: Array<{ role: string; count: number; percentage: number }>;
  };
}

const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_status: 'pending',
    payment_method: '',
    payment_reference: '',
    payment_amount: '',
    payment_notes: '',
    payment_date: ''
  });
  const [bankImportDialogOpen, setBankImportDialogOpen] = useState(false);
  const [bankImportResults, setBankImportResults] = useState<any>(null);
  const [bankImportFile, setBankImportFile] = useState<File | null>(null);
  const [bankImportLoading, setBankImportLoading] = useState(false);
  const [socialShareStats, setSocialShareStats] = useState<any>(null);
  const [loadingSocialStats, setLoadingSocialStats] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 5) { // Social Sharing tab
      fetchSocialShareStats();
    }
  }, [activeTab]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Starting analytics data fetch...');
      
      // Fetch all data in parallel
      const [setsResponse, partsResponse, ordersResponse, usersResponse, providerStatsResponse, salesManagementResponse] = await Promise.all([
        setsApi.getAll(),
        partsApi.getAll(),
        ordersApi.getAll(),
        authApi.getUsers().catch(() => ({ data: [] })), // Handle auth error gracefully
        ordersApi.getProviderStats().catch(() => ({ data: { provider_stats: [], total_providers: 0, total_revenue: 0, total_orders: 0, total_payout_amount: 0 } })), // Handle provider stats error gracefully
        ordersApi.getSalesManagement().catch(() => ({ data: { sales: [], total_orders: 0, total_amount: 0, paid_amount: 0, pending_amount: 0 } })) // Handle sales management error gracefully
      ]);

      console.log('📊 API responses received:', {
        sets: setsResponse.data?.sets?.length || 0,
        parts: partsResponse.data?.parts?.length || 0,
        orders: ordersResponse.data?.orders?.length || 0,
        users: usersResponse.data?.length || 0
      });

      console.log('🔍 Raw API response structures:', {
        setsType: typeof setsResponse.data,
        partsType: typeof partsResponse.data,
        ordersType: typeof ordersResponse.data,
        usersType: typeof usersResponse.data,
        usersData: usersResponse.data
      });

      const sets = setsResponse.data?.sets || [];
      const parts = partsResponse.data?.parts || [];
      const orders = ordersResponse.data?.orders || [];
      const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];

      console.log('✅ Data validation:', {
        setsIsArray: Array.isArray(sets),
        partsIsArray: Array.isArray(parts),
        ordersIsArray: Array.isArray(orders),
        usersIsArray: Array.isArray(users),
        setsLength: sets.length,
        partsLength: parts.length,
        ordersLength: orders.length,
        usersLength: users.length
      });

      console.log('🔧 Starting component cost calculation...');
      // Calculate component costs for each set (simplified for now)
      let setComponentCosts: { [setId: number]: number } = {};
      try {
        setComponentCosts = await calculateSetComponentCosts(sets);
        console.log('✅ Component costs calculated for', Object.keys(setComponentCosts).length, 'sets');
      } catch (error) {
        console.warn('⚠️ Component cost calculation failed, using mock data:', error);
        // Use mock component costs if the real calculation fails
        sets.forEach(set => {
          setComponentCosts[set.set_id] = (Number(set.base_price) || 0) * 0.3; // Assume 30% component cost
        });
      }

      // Calculate real analytics data
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0);
      const totalInventoryValue = parts.reduce((sum: number, part: any) => sum + ((Number(part.unit_cost) || 0) * (Number(part.stock_quantity) || 0)), 0);
      const lowStockItems = parts.filter((part: any) => (Number(part.stock_quantity) || 0) <= (Number(part.minimum_stock_level) || 1)).length;
      
      // Calculate user roles distribution
      const userRoles = users.reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      const userRolesArray = Object.entries(userRoles).map(([role, count]: [string, any]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        count,
        percentage: parseFloat(((count / users.length) * 100).toFixed(1))
      }));

      // Calculate sales by category
      const salesByCategory = sets.reduce((acc: any, set: any) => {
        const category = set.category || 'Other';
        if (!acc[category]) {
          acc[category] = { sales: 0, revenue: 0 };
        }
        acc[category].sales += 1;
        acc[category].revenue += Number(set.base_price) || 0;
        return acc;
      }, {});

      const salesByCategoryArray = Object.entries(salesByCategory).map(([category, data]: [string, any]) => ({
        category,
        sales: data.sales,
        revenue: data.revenue,
        percentage: parseFloat(((data.sales / sets.length) * 100).toFixed(1))
      }));

      // Calculate profit analytics
      const profitAnalytics = calculateProfitAnalytics(sets, setComponentCosts);

      // Generate real monthly sales data from actual orders
      const monthlySales = generateRealMonthlySalesData(orders);

      // Calculate real top selling sets from actual order items
      const topSellingSets = await calculateRealTopSellingSets(orders, sets, setComponentCosts);

      // Calculate inventory analytics
      const inventoryAnalytics = calculateInventoryAnalytics(parts);

      // Get provider analytics data
      const providerAnalytics = providerStatsResponse.data || { provider_stats: [], total_providers: 0, total_revenue: 0, total_orders: 0, total_payout_amount: 0 };

      // Get sales management data
      const salesManagement = salesManagementResponse.data || { sales: [], total_orders: 0, total_amount: 0, paid_amount: 0, pending_amount: 0 };

      const analytics: AnalyticsData = {
        overview: {
          totalUsers: users.length,
          totalSets: sets.length,
          totalParts: parts.length,
          totalOrders: orders.length,
          totalRevenue,
          totalInventoryValue,
          activeUsers: users.filter((u: any) => u.last_login && new Date(u.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
          conversionRate: orders.length > 0 ? parseFloat(((orders.length / users.length) * 100).toFixed(1)) : 0
        },
        salesAnalytics: {
          totalSales: topSellingSets.reduce((sum, set) => sum + set.sales, 0),
          monthlySales,
          topSellingSets,
          salesByCategory: salesByCategoryArray
        },
        providerAnalytics,
        salesManagement,
        inventoryAnalytics,
        profitAnalytics,
        userAnalytics: {
          newUsers: users.filter((u: any) => u.created_at && new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
          returningUsers: users.filter((u: any) => u.last_login && new Date(u.last_login) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
          userGrowth: userRolesArray.length > 0 ? 15.5 : 0, // Mock growth rate
          userRoles: userRolesArray
        }
      };

      console.log('✅ Analytics data calculated successfully');
      setAnalyticsData(analytics);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      setError(`Failed to fetch analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateSetComponentCosts = async (sets: any[]) => {
    const componentCosts: { [setId: number]: number } = {};
    
    console.log(`🔍 Calculating component costs for ${sets.length} sets...`);
    
    // Process sets in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < sets.length; i += batchSize) {
      const batch = sets.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sets.length / batchSize)}`);
      
      const batchPromises = batch.map(async (set) => {
        try {
          const { data } = await setPartsApi.getBySetId(set.set_id);
          const partsList = Array.isArray(data) ? data : (data?.parts ?? []);
          const totalCost = partsList.reduce((sum: number, setPart: any) => {
            const partCost = Number(setPart.unit_cost) || 0;
            const quantity = Number(setPart.quantity) || 1;
            return sum + (partCost * quantity);
          }, 0);
          return { set_id: set.set_id, cost: totalCost };
        } catch (error) {
          console.warn(`⚠️ Failed to fetch parts for set ${set.set_id}:`, error);
          return { set_id: set.set_id, cost: 0 };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        componentCosts[result.set_id] = result.cost;
      });
      
      // Small delay between batches to be nice to the server
      if (i + batchSize < sets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Component costs calculated for ${Object.keys(componentCosts).length} sets`);
    return componentCosts;
  };

  const calculateProfitAnalytics = (sets: any[], componentCosts: { [setId: number]: number }) => {
    const profitableSets = sets
      .map((set: any) => {
        const componentCost = componentCosts[set.set_id] || 0;
        const sellingPrice = Number(set.base_price) || 0;
        const profit = sellingPrice - componentCost;
        const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
        
        return {
          name: set.name || 'Unnamed Set',
          sellingPrice,
          componentCost,
          profit,
          margin,
          category: set.category || 'Other'
        };
      })
      .filter(set => set.sellingPrice > 0);

    const totalProfit = profitableSets.reduce((sum, set) => sum + set.profit, 0);
    const averageMargin = profitableSets.length > 0 ? profitableSets.reduce((sum, set) => sum + set.margin, 0) / profitableSets.length : 0;

    const topProfitableSets = [...profitableSets]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    const leastProfitableSets = [...profitableSets]
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 10);

    // Calculate profit by category
    const profitByCategory = profitableSets.reduce((acc: any, set) => {
      const category = set.category;
      if (!acc[category]) {
        acc[category] = { totalProfit: 0, margins: [], setCount: 0 };
      }
      acc[category].totalProfit += set.profit;
      acc[category].margins.push(set.margin);
      acc[category].setCount += 1;
      return acc;
    }, {});

    const profitByCategoryArray = Object.entries(profitByCategory).map(([category, data]: [string, any]) => ({
      category,
      totalProfit: data.totalProfit,
      averageMargin: data.margins.length > 0 ? data.margins.reduce((sum: number, margin: number) => sum + margin, 0) / data.margins.length : 0,
      setCount: data.setCount
    }));

    return {
      totalProfit,
      averageMargin,
      topProfitableSets,
      leastProfitableSets,
      profitByCategory: profitByCategoryArray
    };
  };

  const calculateInventoryAnalytics = (parts: any[]) => {
    const totalInventoryValue = parts.reduce((sum: number, part: any) => sum + ((Number(part.unit_cost) || 0) * (Number(part.stock_quantity) || 0)), 0);
    const lowStockItems = parts.filter((part: any) => (Number(part.stock_quantity) || 0) <= (Number(part.minimum_stock_level) || 1)).length;

    // Calculate category breakdown
    const categoryBreakdown = parts.reduce((acc: any, part: any) => {
      const category = part.category || 'Other';
      const value = (Number(part.unit_cost) || 0) * (Number(part.stock_quantity) || 0);
      
      if (!acc[category]) {
        acc[category] = { value: 0, count: 0 };
      }
      acc[category].value += value;
      acc[category].count += 1;
      return acc;
    }, {});

    const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([category, data]: [string, any]) => ({
      category,
      value: data.value,
      percentage: parseFloat(((data.value / totalInventoryValue) * 100).toFixed(1)),
      count: data.count
    }));

    // Mock fast/slow moving items
    const fastMovingItems = parts
      .filter((part: any) => (Number(part.stock_quantity) || 0) > 0)
      .map((part: any) => ({
        name: part.part_name || 'Unnamed Part',
        quantity: Number(part.stock_quantity) || 0,
        turnover: Math.random() * 100, // Mock turnover rate
        value: (Number(part.unit_cost) || 0) * (Number(part.stock_quantity) || 0)
      }))
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 10);

    const slowMovingItems = parts
      .filter((part: any) => (Number(part.stock_quantity) || 0) > 0)
      .map((part: any) => ({
        name: part.part_name || 'Unnamed Part',
        quantity: Number(part.stock_quantity) || 0,
        lastSold: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: (Number(part.unit_cost) || 0) * (Number(part.stock_quantity) || 0)
      }))
      .sort((a, b) => new Date(a.lastSold).getTime() - new Date(b.lastSold).getTime())
      .slice(0, 10);

    return {
      totalInventoryValue,
      lowStockItems,
      fastMovingItems,
      slowMovingItems,
      categoryBreakdown: categoryBreakdownArray
    };
  };

  const generateRealMonthlySalesData = (orders: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    // Initialize monthly data
    const monthlyData: { [key: string]: { sales: number; orders: number; revenue: number } } = {};
    months.forEach(month => {
      monthlyData[month] = { sales: 0, orders: 0, revenue: 0 };
    });

    // Process real orders
    orders.forEach((order: any) => {
      if (order.created_at) {
        const orderDate = new Date(order.created_at);
        const monthIndex = orderDate.getMonth(); // 0-11
        const monthName = months[monthIndex];
        
        if (monthName && orderDate.getFullYear() === currentYear) {
          monthlyData[monthName].orders += 1;
          monthlyData[monthName].revenue += Number(order.total_amount) || 0;
          
          // Count items in the order as "sales"
          if (order.items && Array.isArray(order.items)) {
            monthlyData[monthName].sales += order.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);
          } else {
            monthlyData[monthName].sales += 1; // Assume 1 sale per order if no items
          }
        }
      }
    });

    return months.map(month => ({
      month,
      sales: monthlyData[month].sales,
      orders: monthlyData[month].orders,
      revenue: monthlyData[month].revenue
    }));
  };

  const calculateRealTopSellingSets = async (orders: any[], sets: any[], setComponentCosts: { [setId: number]: number }) => {
    console.log('🔍 Calculating real top selling sets from order data...');
    
    // Aggregate sales data from real orders
    const setSalesData: { [setId: number]: { sales: number; revenue: number; orders: number } } = {};
    
    // Initialize all sets with zero sales
    sets.forEach((set: any) => {
      setSalesData[set.set_id] = { sales: 0, revenue: 0, orders: 0 };
    });

    // Process real orders to count actual sales
    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const setId = item.set_id || item.id;
          const quantity = Number(item.quantity) || 1;
          const unitPrice = Number(item.unit_price) || Number(item.price) || 0;
          
          if (setId && setSalesData[setId]) {
            setSalesData[setId].sales += quantity;
            setSalesData[setId].revenue += quantity * unitPrice;
            setSalesData[setId].orders += 1;
          }
        });
      } else {
        // If no items array, assume the order is for a single set
        // This is a fallback for orders without detailed item breakdown
        const orderAmount = Number(order.total_amount) || 0;
        if (orderAmount > 0) {
          // Distribute the order amount across sets (this is a simplified approach)
          // In a real system, you'd want to track which sets were actually ordered
          sets.forEach((set: any) => {
            if (setSalesData[set.set_id]) {
              setSalesData[set.set_id].sales += 1;
              setSalesData[set.set_id].revenue += orderAmount / sets.length; // Distribute evenly
              setSalesData[set.set_id].orders += 1;
            }
          });
        }
      }
    });

    // Convert to top selling sets format
    const topSellingSets = sets
      .map((set: any) => {
        const salesData = setSalesData[set.set_id] || { sales: 0, revenue: 0, orders: 0 };
        const componentCost = setComponentCosts[set.set_id] || 0;
        const sellingPrice = Number(set.base_price) || 0;
        const profit = sellingPrice - componentCost;
        const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
        
        return {
          name: set.name || 'Unnamed Set',
          sales: salesData.sales,
          revenue: salesData.revenue,
          profit: salesData.sales * profit,
          margin: margin
        };
      })
      .filter(set => set.sales > 0) // Only include sets that have actual sales
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    console.log('✅ Real top selling sets calculated:', topSellingSets.length, 'sets with sales');
    return topSellingSets;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenPaymentDialog = (order: any) => {
    setSelectedOrder(order);
    setPaymentForm({
      payment_status: order.payment_status || 'pending',
      payment_method: order.payment_method || '',
      payment_reference: order.payment_reference || '',
      payment_amount: order.payment_amount?.toString() || order.total_amount?.toString() || '',
      payment_notes: order.payment_notes || '',
      payment_date: order.payment_date || new Date().toISOString().split('T')[0]
    });
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedOrder(null);
    setPaymentForm({
      payment_status: 'pending',
      payment_method: '',
      payment_reference: '',
      payment_amount: '',
      payment_notes: '',
      payment_date: ''
    });
  };

  const handleUpdatePayment = async () => {
    if (!selectedOrder) return;

    try {
      await ordersApi.updatePaymentStatus(selectedOrder.order_id, {
        payment_status: paymentForm.payment_status,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference,
        payment_amount: parseFloat(paymentForm.payment_amount),
        payment_notes: paymentForm.payment_notes,
        payment_date: paymentForm.payment_date
      });

      // Refresh analytics data
      await fetchAnalyticsData();
      handleClosePaymentDialog();
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status');
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  };

  const handleBankImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBankImportFile(file);
    }
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          const transactions = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const transaction: any = {};
            
            headers.forEach((header, index) => {
              const value = values[index] || '';
              switch (header.toLowerCase()) {
                case 'amount':
                case 'sum':
                case 'value':
                  transaction.amount = value;
                  break;
                case 'date':
                case 'transaction_date':
                case 'payment_date':
                  transaction.date = value;
                  break;
                case 'reference':
                case 'ref':
                case 'payment_reference':
                  transaction.reference = value;
                  break;
                case 'description':
                case 'memo':
                case 'note':
                  transaction.description = value;
                  break;
                default:
                  transaction[header.toLowerCase()] = value;
              }
            });
            
            return transaction;
          }).filter(t => t.amount && t.date);
          
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleBankImport = async () => {
    if (!bankImportFile) return;

    setBankImportLoading(true);
    try {
      const transactions = await parseCSVFile(bankImportFile);
      
      const response = await ordersApi.processBankImport(transactions);
      setBankImportResults(response.data);
      
      // Refresh analytics data
      await fetchAnalyticsData();
    } catch (error) {
      console.error('Error processing bank import:', error);
      setError('Failed to process bank import');
    } finally {
      setBankImportLoading(false);
    }
  };

  const handleCloseBankImportDialog = () => {
    setBankImportDialogOpen(false);
    setBankImportResults(null);
    setBankImportFile(null);
  };

  const renderSalesManagementTab = () => (
    <Box>
      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
        <StatCard
          title="Total Orders"
          value={analyticsData?.salesManagement.total_orders || 0}
          icon={<AssessmentIcon fontSize="large" />}
          color="info"
        />
        <StatCard
          title="Total Amount"
          value={`€${analyticsData?.salesManagement.total_amount?.toLocaleString() || '0'}`}
          icon={<MoneyIcon fontSize="large" />}
          color="primary"
        />
        <StatCard
          title="Paid Amount"
          value={`€${analyticsData?.salesManagement.paid_amount?.toLocaleString() || '0'}`}
          icon={<CheckCircleIcon fontSize="large" />}
          color="success"
        />
        <StatCard
          title="Pending Amount"
          value={`€${analyticsData?.salesManagement.pending_amount?.toLocaleString() || '0'}`}
          icon={<WarningIcon fontSize="large" />}
          color="warning"
        />
      </Box>

      {/* Bank Import Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Bank Import
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Import bank statements to automatically match and mark payments
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<FileUploadIcon />}
              onClick={() => setBankImportDialogOpen(true)}
            >
              Import Bank Statement
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Supported formats:</strong> CSV files with columns for amount, date, reference, and description.
              The system will automatically match transactions to orders based on amount and date proximity.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sales Management - Payment Tracking
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Track and manage bank payments from customers for each provider
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Payment Status</TableCell>
                  <TableCell align="center">Payment Method</TableCell>
                  <TableCell align="center">Payment Reference</TableCell>
                  <TableCell align="center">Payment Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analyticsData?.salesManagement.sales.map((sale) => (
                  <TableRow key={sale.order_id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {sale.order_number}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(sale.order_date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Status: {sale.order_status}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {sale.customer.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {sale.customer.email}
                        </Typography>
                        {sale.customer.company && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {sale.customer.company}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {sale.provider.company || sale.provider.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          @{sale.provider.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        €{sale.total_amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={sale.payment_status} 
                        size="small" 
                        color={getPaymentStatusColor(sale.payment_status) as any}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {sale.payment_method || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {sale.payment_reference || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {sale.payment_date ? new Date(sale.payment_date).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenPaymentDialog(sale)}
                      >
                        Update Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payment Update Dialog */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Update Payment Status - Order {selectedOrder?.order_number}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update payment information for this order. This will track bank payments from customers.
          </DialogContentText>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={paymentForm.payment_status}
                label="Payment Status"
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentForm.payment_method}
                label="Payment Method"
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              >
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Payment Reference"
              value={paymentForm.payment_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
              placeholder="Bank reference number"
            />
            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              value={paymentForm.payment_amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: e.target.value })}
              inputProps={{ step: "0.01", min: "0" }}
            />
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="Payment Notes"
                multiline
                rows={3}
                value={paymentForm.payment_notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_notes: e.target.value })}
                placeholder="Additional notes about the payment"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button onClick={handleUpdatePayment} variant="contained" color="primary">
            Update Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bank Import Dialog */}
      <Dialog open={bankImportDialogOpen} onClose={handleCloseBankImportDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          Import Bank Statement
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload a CSV file with bank transactions to automatically match and mark payments for orders.
          </DialogContentText>
          
          {!bankImportResults ? (
            <Box>
              <Box sx={{ mb: 2 }}>
                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="bank-import-file"
                  type="file"
                  onChange={handleBankImportFileChange}
                />
                <label htmlFor="bank-import-file">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Choose CSV File
                  </Button>
                </label>
                {bankImportFile && (
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Selected: {bankImportFile.name}
                  </Typography>
                )}
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>CSV Format Requirements:</strong><br/>
                  • Amount column (amount, sum, value)<br/>
                  • Date column (date, transaction_date, payment_date)<br/>
                  • Reference column (reference, ref, payment_reference) - optional<br/>
                  • Description column (description, memo, note) - optional<br/><br/>
                  The system will match transactions to orders based on amount (±€0.01) and date (±30 days).
                </Typography>
              </Alert>
            </Box>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Import Complete!
                </Typography>
                <Typography variant="body2">
                  {bankImportResults.message}
                </Typography>
              </Alert>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {bankImportResults.results.processed}
                  </Typography>
                  <Typography variant="body2">Processed</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {bankImportResults.results.matched}
                  </Typography>
                  <Typography variant="body2">Matched</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {bankImportResults.results.unmatched}
                  </Typography>
                  <Typography variant="body2">Unmatched</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {bankImportResults.results.errors}
                  </Typography>
                  <Typography variant="body2">Errors</Typography>
                </Box>
              </Box>

              {bankImportResults.results.matches.length > 0 && (
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      Successfully Matched ({bankImportResults.results.matches.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {bankImportResults.results.matches.map((match: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`Order ${match.order.order_number} - ${match.order.customer_name}`}
                            secondary={`€${match.transaction.amount} - ${match.order.provider_company}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {bankImportResults.results.unmatched_transactions.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      Unmatched Transactions ({bankImportResults.results.unmatched_transactions.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {bankImportResults.results.unmatched_transactions.map((unmatched: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`€${unmatched.transaction.amount} - ${unmatched.transaction.date}`}
                            secondary={`Reason: ${unmatched.reason}`}
                          />
                          {unmatched.matching_orders && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="textSecondary">
                                Possible matches:
                              </Typography>
                              {unmatched.matching_orders.map((order: any, orderIndex: number) => (
                                <Typography key={orderIndex} variant="caption" display="block">
                                  • Order {order.order_number} - €{order.amount} - {order.customer_name}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBankImportDialog}>
            {bankImportResults ? 'Close' : 'Cancel'}
          </Button>
          {!bankImportResults && (
            <Button 
              onClick={handleBankImport} 
              variant="contained" 
              color="primary"
              disabled={!bankImportFile || bankImportLoading}
            >
              {bankImportLoading ? 'Processing...' : 'Import'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    subtitle?: string;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  }> = ({ title, value, icon, trend, subtitle, color = 'primary' }) => (
            <Card>
              <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
                    </Typography>
                    <Typography variant="h4" component="div">
              {typeof value === 'number' ? value.toLocaleString() : value}
                    </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
                    </Typography>
            )}
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(trend)}%
                    </Typography>
                  </Box>
            )}
                </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
                </Box>
              </CardContent>
            </Card>
  );

  const renderOverviewTab = () => (
                  <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        <StatCard
          title="Total Revenue"
          value={`€${analyticsData?.overview.totalRevenue.toLocaleString() || '0'}`}
          icon={<MoneyIcon fontSize="large" />}
          trend={12.5}
          color="success"
        />
        <StatCard
          title="Total Orders"
          value={analyticsData?.overview.totalOrders || 0}
          icon={<CartIcon fontSize="large" />}
          trend={8.2}
          color="primary"
        />
        <StatCard
          title="Active Users"
          value={analyticsData?.overview.activeUsers || 0}
          icon={<PeopleIcon fontSize="large" />}
          trend={15.3}
          color="info"
        />
        <StatCard
          title="Conversion Rate"
          value={`${analyticsData?.overview.conversionRate || 0}%`}
          icon={<AssessmentIcon fontSize="large" />}
          trend={-2.1}
          color="warning"
        />
          </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
      <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
              Inventory Value by Category
                    </Typography>
            <Box>
              {analyticsData?.inventoryAnalytics.categoryBreakdown.map((category, index) => (
                <Box key={category.category} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{category.category}</Typography>
                    <Typography variant="body2">
                      €{category.value.toLocaleString()} ({category.percentage}%)
                      </Typography>
                    </Box>
                          <LinearProgress
                            variant="determinate"
                    value={category.percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                          />
                </Box>
                      ))}
            </Box>
                  </CardContent>
                </Card>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      User Roles Distribution
                    </Typography>
            <Box>
              {analyticsData?.userAnalytics.userRoles.map((role) => (
                <Box key={role.role} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{role.role}</Typography>
                    <Typography variant="body2">
                      {role.count} ({role.percentage}%)
                    </Typography>
                  </Box>
                          <LinearProgress
                            variant="determinate"
                            value={role.percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                          />
                </Box>
                      ))}
            </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
  );

  const renderSalesTab = () => (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Monthly Sales Trend
                    </Typography>
            <Box height={300}>
              {/* Simple bar chart representation */}
              <Box display="flex" alignItems="end" height="100%" gap={1}>
                {analyticsData?.salesAnalytics?.monthlySales?.map((month) => (
                  <Box key={month.month} display="flex" flexDirection="column" alignItems="center" flex={1}>
                    <Box
                      bgcolor="primary.main"
                      width="100%"
                      height={`${(month.revenue / 5000) * 200}px`}
                      minHeight="20px"
                      borderRadius="4px 4px 0 0"
                      mb={1}
                    />
                    <Typography variant="caption">{month.month}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      €{month.revenue.toLocaleString()}
                    </Typography>
                  </Box>
                )) || (
                  <Box display="flex" alignItems="center" justifyContent="center" width="100%" height="100%">
                    <Typography variant="body2" color="textSecondary">
                      No sales data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
                  </CardContent>
                </Card>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Top Selling Sets
                    </Typography>
            <Box>
              {analyticsData?.salesAnalytics?.topSellingSets?.slice(0, 5).map((set, index) => (
                <Box key={set.name} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {set.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {set.sales} sales
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="success.main">
                    €{set.revenue.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
                  </CardContent>
                </Card>
              </Box>

      <Box sx={{ mt: 3 }}>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sales by Category
                    </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Sets</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.salesAnalytics?.salesByCategory?.map((category) => (
                    <TableRow key={category.category}>
                      <TableCell>
                        <Chip label={category.category} size="small" />
                      </TableCell>
                      <TableCell align="right">{category.sales}</TableCell>
                      <TableCell align="right">€{category.revenue.toLocaleString()}</TableCell>
                      <TableCell align="right">{category.percentage}%</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No category data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
                  </CardContent>
                </Card>
              </Box>

      {/* Provider Sales Statistics */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sales Statistics by Providers
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {analyticsData?.providerAnalytics.total_providers || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Providers
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    €{analyticsData?.providerAnalytics.total_revenue?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Revenue
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {analyticsData?.providerAnalytics.total_orders || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Orders
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    €{analyticsData?.providerAnalytics.total_payout_amount?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Payout Amount
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Payout Amount</TableCell>
                    <TableCell align="right">Avg Order Value</TableCell>
                    <TableCell align="right">Units Sold</TableCell>
                    <TableCell align="right">Sets Sold</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.providerAnalytics.provider_stats.map((provider) => (
                    <TableRow key={provider.provider_id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {provider.provider_company || provider.provider_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            @{provider.provider_username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{provider.total_orders}</TableCell>
                      <TableCell align="right">€{provider.total_revenue.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main" fontWeight="medium">
                          €{provider.total_payout_amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">€{provider.average_order_value.toFixed(2)}</TableCell>
                      <TableCell align="right">{provider.total_units_sold}</TableCell>
                      <TableCell align="right">{provider.unique_sets_sold}</TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          {provider.delivered_orders > 0 && (
                            <Chip label={`${provider.delivered_orders} delivered`} size="small" color="success" />
                          )}
                          {provider.pending_orders > 0 && (
                            <Chip label={`${provider.pending_orders} pending`} size="small" color="warning" />
                          )}
                          {provider.processing_orders > 0 && (
                            <Chip label={`${provider.processing_orders} processing`} size="small" color="info" />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Monthly Payout Details */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Payout Details by Provider
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Shows monthly payout amounts for each provider (80% of delivered orders revenue)
            </Typography>
            
            {analyticsData?.providerAnalytics.provider_stats.map((provider) => (
              <Box key={provider.provider_id} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
                  {provider.provider_company || provider.provider_name} (@{provider.provider_username})
                </Typography>
                
                {provider.monthly_payouts.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Month</TableCell>
                          <TableCell align="right">Orders</TableCell>
                          <TableCell align="right">Monthly Revenue</TableCell>
                          <TableCell align="right">Delivered Revenue</TableCell>
                          <TableCell align="right">Payout Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {provider.monthly_payouts.map((payout, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(payout.month).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long' 
                              })}
                            </TableCell>
                            <TableCell align="right">{payout.orders_count}</TableCell>
                            <TableCell align="right">€{payout.monthly_revenue.toLocaleString()}</TableCell>
                            <TableCell align="right">€{payout.delivered_revenue.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" fontWeight="medium">
                                €{payout.monthly_payout.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                    No payout data available for this provider
                  </Typography>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
            </Box>
  );

  const renderProfitTab = () => (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        <StatCard
          title="Total Profit"
          value={`€${analyticsData?.profitAnalytics.totalProfit.toLocaleString() || '0'}`}
          icon={<MoneyIcon fontSize="large" />}
          color="success"
        />
        <StatCard
          title="Average Margin"
          value={`${analyticsData?.profitAnalytics.averageMargin.toFixed(1) || '0'}%`}
          icon={<AssessmentIcon fontSize="large" />}
          color="info"
        />
        <StatCard
          title="Profitable Sets"
          value={analyticsData?.profitAnalytics.topProfitableSets.length || 0}
          icon={<CheckCircleIcon fontSize="large" />}
          color="success"
        />
        <StatCard
          title="Low Margin Sets"
          value={analyticsData?.profitAnalytics.leastProfitableSets.filter(s => s.margin < 20).length || 0}
          icon={<WarningIcon fontSize="large" />}
          color="warning"
        />
              </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
              Most Profitable Sets
                    </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Set Name</TableCell>
                    <TableCell align="right">Selling Price</TableCell>
                    <TableCell align="right">Component Cost</TableCell>
                    <TableCell align="right">Profit</TableCell>
                    <TableCell align="right">Margin</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.profitAnalytics.topProfitableSets.slice(0, 8).map((set) => (
                    <TableRow key={set.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {set.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">€{set.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">€{set.componentCost.toFixed(2)}</TableCell>
                      <TableCell align="right" color="success.main">
                        €{set.profit.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${set.margin.toFixed(1)}%`}
                          size="small"
                          color={set.margin > 50 ? 'success' : set.margin > 20 ? 'warning' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
                  </CardContent>
                </Card>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
              Profit by Category
                    </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Total Profit</TableCell>
                    <TableCell align="right">Avg Margin</TableCell>
                    <TableCell align="right">Sets</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.profitAnalytics.profitByCategory.map((category) => (
                    <TableRow key={category.category}>
                      <TableCell>
                        <Chip label={category.category} size="small" />
                      </TableCell>
                      <TableCell align="right">€{category.totalProfit.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${category.averageMargin.toFixed(1)}%`}
                          size="small"
                          color={category.averageMargin > 50 ? 'success' : category.averageMargin > 20 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right">{category.setCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
                  </CardContent>
                </Card>
              </Box>

      <Box sx={{ mt: 3 }}>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
              Least Profitable Sets (Need Attention)
                    </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Set Name</TableCell>
                    <TableCell align="right">Selling Price</TableCell>
                    <TableCell align="right">Component Cost</TableCell>
                    <TableCell align="right">Profit</TableCell>
                    <TableCell align="right">Margin</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.profitAnalytics.leastProfitableSets.slice(0, 10).map((set) => (
                    <TableRow key={set.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {set.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">€{set.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">€{set.componentCost.toFixed(2)}</TableCell>
                      <TableCell align="right" color={set.profit < 0 ? 'error.main' : 'text.primary'}>
                        €{set.profit.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${set.margin.toFixed(1)}%`}
                          size="small"
                          color={set.margin > 20 ? 'success' : set.margin > 0 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {set.margin < 0 ? (
                          <Chip label="Loss" size="small" color="error" />
                        ) : set.margin < 10 ? (
                          <Chip label="Review Price" size="small" color="warning" />
                        ) : (
                          <Chip label="OK" size="small" color="success" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            </Box>
  );

  const renderInventoryTab = () => (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        <StatCard
          title="Total Inventory Value"
          value={`€${analyticsData?.inventoryAnalytics.totalInventoryValue.toLocaleString() || '0'}`}
          icon={<InventoryIcon fontSize="large" />}
          color="info"
        />
        <StatCard
          title="Low Stock Items"
          value={analyticsData?.inventoryAnalytics.lowStockItems || 0}
          icon={<WarningIcon fontSize="large" />}
          color="warning"
        />
        <StatCard
          title="Fast Moving Items"
          value={analyticsData?.inventoryAnalytics.fastMovingItems.length || 0}
          icon={<TrendingUpIcon fontSize="large" />}
          color="success"
        />
        <StatCard
          title="Slow Moving Items"
          value={analyticsData?.inventoryAnalytics.slowMovingItems.length || 0}
          icon={<TrendingDownIcon fontSize="large" />}
          color="error"
        />
              </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
              Fast Moving Items
                    </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Part Name</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Turnover</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.inventoryAnalytics.fastMovingItems.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${item.turnover.toFixed(1)}%`}
                            size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="right">€{item.value.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
                  </CardContent>
                </Card>
        <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
              Slow Moving Items
                    </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Part Name</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Last Sold</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsData?.inventoryAnalytics.slowMovingItems.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.name}
                      </Typography>
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{item.lastSold}</TableCell>
                      <TableCell align="right">€{item.value.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            </Box>
  );

  const fetchSocialShareStats = async () => {
    setLoadingSocialStats(true);
    try {
      const res = await api.get('/social-shares/admin-stats');
      setSocialShareStats(res.data);
    } catch (error) {
      console.error('Error fetching social share stats:', error);
    } finally {
      setLoadingSocialStats(false);
    }
  };

  const renderSocialSharingTab = () => {
    if (loadingSocialStats) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            📊 Social Sharing Analytics
          </Typography>
          <Typography variant="body2">
            Track how many times your sets are being shared and which platforms are most popular. 
            Customers earn €5 credits when they share 3 different sets!
          </Typography>
        </Alert>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📤 Total Shares
              </Typography>
              <Typography variant="h3" color="primary">
                {socialShareStats?.total_shares || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all sets
              </Typography>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👥 Active Sharers
              </Typography>
              <Typography variant="h3" color="success.main">
                {socialShareStats?.active_sharers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Users who shared sets
              </Typography>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎁 Rewards Claimed
              </Typography>
              <Typography variant="h3" color="warning.main">
                {socialShareStats?.rewards_claimed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                €5 credits given
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Platform Statistics */}
        {socialShareStats?.platform_stats && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📱 Sharing Platform Distribution
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Platform</TableCell>
                      <TableCell align="right">Shares</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(socialShareStats.platform_stats).map(([platform, count]: any) => (
                      <TableRow key={platform}>
                        <TableCell>{platform.charAt(0).toUpperCase() + platform.slice(1)}</TableCell>
                        <TableCell align="right">{count}</TableCell>
                        <TableCell align="right">
                          {((count / socialShareStats.total_shares) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Most Shared Sets */}
        {socialShareStats?.top_shared_sets && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔥 Most Shared Sets
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Set Name</TableCell>
                      <TableCell align="right">Shares</TableCell>
                      <TableCell align="right">Category</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {socialShareStats.top_shared_sets.slice(0, 10).map((set: any) => (
                      <TableRow key={set.set_id}>
                        <TableCell>{set.name}</TableCell>
                        <TableCell align="right">{set.share_count}</TableCell>
                        <TableCell align="right">{set.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
                    </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchAnalyticsData}>
            Retry
          </Button>
        }>
          {renderError(error)}
        </Alert>
                </Box>
    );
  }
              
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
          <Typography variant="h4" gutterBottom>
            Analytics & Reports
                      </Typography>
          <Typography variant="body2" color="textSecondary">
            Real-time insights and performance metrics
            {lastUpdated && ` • Last updated: ${lastUpdated}`}
                      </Typography>
                    </Box>
        <Box display="flex" gap={2}>
          <FormControl size="small">
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAnalyticsData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
                    </Box>
                  </Box>
                  
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<AnalyticsIcon />} label="Overview" />
          <Tab icon={<BarChartIcon />} label="Sales" />
          <Tab icon={<MoneyIcon />} label="Profit Analysis" />
          <Tab icon={<InventoryIcon />} label="Inventory" />
          <Tab icon={<AssessmentIcon />} label="Sales Management" />
          <Tab icon={<ShareIcon />} label="Social Sharing" />
          <Tab icon={<ScheduleIcon />} label="Automated Reporting" />
        </Tabs>
                </Box>

      <Box mt={3}>
        {activeTab === 0 && renderOverviewTab()}
        {activeTab === 1 && renderSalesTab()}
        {activeTab === 2 && renderProfitTab()}
        {activeTab === 3 && renderInventoryTab()}
        {activeTab === 4 && renderSalesManagementTab()}
        {activeTab === 5 && renderSocialSharingTab()}
        {activeTab === 6 && <AutomatedReportingSection />}
      </Box>
    </Box>
  );
};

export default AnalyticsPage;