import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { LanguageProvider } from './contexts/LanguageContext';
import { RoleProvider, useRole } from './contexts/RoleContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrderNotificationProvider } from './contexts/OrderNotificationContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import SystemHealthMonitor from './components/SystemHealthMonitor';
import { stemTheme } from './theme/stemTheme';
import STEMNavigation from './components/STEMNavigation';

// Import pages
import ToolsPage from './pages/ToolsPage';
import PartsPage from './pages/PartsPage';
import SetsPage from './pages/SetsPage';
import ShopPage from './pages/ShopPage';
import OrderManagementPage from './pages/OrderManagementPage';
import SetBuilderPage from './pages/SetBuilderPage';
import STEMDashboard from './pages/STEMDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserProfile from './pages/UserProfile';
import UserManagement from './pages/UserManagement';
import AdminProviderManagement from './pages/AdminProviderManagement';
import AIAssistantPage from './pages/AIAssistantPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminSetVisibilityManager from './components/AdminSetVisibilityManager';
import ProviderDashboard from './pages/ProviderDashboard';
import CustomerAccount from './pages/CustomerAccount';
import ProductionDashboard from './pages/ProductionDashboard';
import ProviderAnalytics from './pages/ProviderAnalytics';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import AboutUsPage from './pages/AboutUsPage';
import SetReviewsPage from './components/SetReviewsPage';
import SettingsPage from './pages/SettingsPage';
import SystemSettingsPage from './pages/SystemSettings';
import api, { setApiBaseUrl } from './services/api';
import LearningOutcomesHelper from './pages/LearningOutcomesHelper';
import ProviderPaymentsPage from './pages/ProviderPaymentsPage';

// Role-aware redirect component
const RoleBasedRedirect: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { currentRole } = useRole();
  
  if (!isAuthenticated) {
    return <Navigate to="/shop" replace />;
  }
  
  if (currentRole === 'production') {
    return <Navigate to="/production-dashboard" replace />;
  } else if (currentRole === 'customer') {
    return <Navigate to="/shop" replace />;
  } else if (currentRole === 'admin') {
    return <Navigate to="/dashboard" replace />;
  } else if (currentRole === 'provider') {
    return <Navigate to="/provider-dashboard" replace />;
  } else {
    return <Navigate to="/shop" replace />;
  }
};

// Route protection component for roles
const RoleProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated } = useAuth();
  const { currentRole } = useRole();
  
  if (!isAuthenticated) {
    return <Navigate to="/shop" replace />;
  }
  
  if (!allowedRoles.includes(currentRole)) {
    // Redirect based on role
    if (currentRole === 'production') {
      return <Navigate to="/production-dashboard" replace />;
    } else if (currentRole === 'customer') {
      return <Navigate to="/shop" replace />;
    } else if (currentRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (currentRole === 'provider') {
      return <Navigate to="/provider-dashboard" replace />;
    } else {
      return <Navigate to="/shop" replace />;
    }
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const [isHealthMonitorVisible] = useState(false);

  useEffect(() => {
    api.get('/system-settings').then((res) => {
      const url = (res.data as any)?.settings?.public_url;
      if (url && typeof url === 'string' && url.trim()) setApiBaseUrl(url.trim());
    }).catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RoleProvider>
          <LanguageProvider>
            <CartProvider>
              <OrderNotificationProvider>
                <SnackbarProvider>
                  <ThemeProvider theme={stemTheme}>
                  <CssBaseline />
                <Router
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true
                  }}
                >
                  <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                    <STEMNavigation />
                    {isHealthMonitorVisible && (
                      <SystemHealthMonitor 
                        position="bottom-right" 
                        variant="compact" 
                      />
                    )}
                    <Box 
                      component="main" 
                      sx={{ 
                        flexGrow: 1, 
                        p: 3,
                        mt: 8, // Account for fixed AppBar
                        ml: { sm: '280px' }, // Account for fixed drawer
                      }}
                    >
                    <Routes>
                      {/* Authentication routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      
                      {/* Dashboard route */}
                      <Route path="/dashboard" element={<ProtectedRoute><STEMDashboard /></ProtectedRoute>} />
                      
                      {/* Protected routes */}
                      <Route path="/" element={<RoleBasedRedirect />} />
                      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                      
                      {/* Public routes */}
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/reviews/:setId" element={<SetReviewsPage />} />
                      
                      {/* Admin and Production routes */}
                      <Route 
                        path="/tools" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin', 'production']}>
                            <ToolsPage />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/parts" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin', 'production']}>
                            <PartsPage />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/sets" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin', 'production']}>
                            <SetsPage />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/orders" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin', 'production']}>
                            <OrderManagementPage />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/set-builder" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <SetBuilderPage />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/user-management" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <UserManagement />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin-provider-management" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <AdminProviderManagement />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/provider-payments" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <ProviderPaymentsPage />
                          </RoleProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ai-assistant" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <AIAssistantPage />
                          </RoleProtectedRoute>
                        }
                      />
                      <Route 
                        path="/system-settings" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <SystemSettingsPage />
                          </RoleProtectedRoute>
                        }
                      />
                      <Route 
                        path="/learning-outcomes-helper" 
                        element={
                          <RoleProtectedRoute allowedRoles={['admin', 'production']}>
                            <LearningOutcomesHelper />
                          </RoleProtectedRoute>
                        }
                      />
                              <Route 
                                path="/reports"
                                element={
                                  <RoleProtectedRoute allowedRoles={['admin']}>
                                    <AnalyticsPage />
                                  </RoleProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/set-visibility"
                                element={
                                  <RoleProtectedRoute allowedRoles={['admin']}>
                                    <AdminSetVisibilityManager />
                                  </RoleProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/provider-dashboard"
                                element={
                                  <RoleProtectedRoute allowedRoles={['provider']}>
                                    <ProviderDashboard />
                                  </RoleProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/account"
                                element={
                                  <RoleProtectedRoute allowedRoles={['customer', 'admin', 'production', 'provider']}>
                                    <CustomerAccount />
                                  </RoleProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/production-dashboard"
                                element={
                                  <RoleProtectedRoute allowedRoles={['production', 'admin']}>
                                    <ProductionDashboard />
                                  </RoleProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/provider-analytics"
                                element={
                                  <RoleProtectedRoute allowedRoles={['provider', 'admin']}>
                                    <ProviderAnalytics />
                                  </RoleProtectedRoute>
                                } 
                              />
                              <Route path="/terms" element={<TermsAndConditionsPage />} />
                              <Route path="/about" element={<AboutUsPage />} />
                    </Routes>
                    </Box>
                  </Box>
                </Router>
                  </ThemeProvider>
                </SnackbarProvider>
              </OrderNotificationProvider>
            </CartProvider>
          </LanguageProvider>
        </RoleProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;