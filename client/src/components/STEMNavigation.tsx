/**
 * STEM/MakerLab Navigation Component
 * 
 * Modern navigation with engineering elements:
 * - Circuit board patterns
 * - Technical icons
 * - Hover animations
 * - Status indicators
 */

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Collapse,
  Select,
  FormControl,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Build as BuildIcon,
  Science as ScienceIcon,
  Engineering as EngineeringIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Person as PersonIcon,
  ExpandLess,
  ExpandMore,
  Inventory as InventoryIcon,
  ShoppingCart as CartIcon,
  People as PeopleIcon,
  Assessment as ReportsIcon,
  AutoAwesome as AIIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  Language as LanguageIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useOrderNotification } from '../contexts/OrderNotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { stemColors } from '../theme/stemTheme';
import { generateShopName } from '../utils/shopNameGenerator';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  path: string;
  badge?: number;
  children?: NavigationItem[];
  roles?: string[];
}

interface STEMNavigationProps {
  onNavigate?: (path: string) => void;
}

const STEMNavigation: React.FC<STEMNavigationProps> = ({ 
  onNavigate
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { activeOrderCount, newOrderCount, markOrdersAsSeen } = useOrderNotification();
  const { logout, isAuthenticated, user } = useAuth();
  const { currentRole, changeRole, isAdmin } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Navigation items organized by category for better UX
  const allNavigationItems: NavigationItem[] = [
    // === DASHBOARDS ===
    {
      id: 'dashboards',
      label: 'Dashboards',
      icon: DashboardIcon,
      path: '',
      roles: ['admin', 'production'],
      children: [
        {
          id: 'dashboard',
          label: 'Admin Dashboard',
          icon: DashboardIcon,
          path: '/dashboard',
          roles: ['admin'],
        },
        {
          id: 'production-dashboard',
          label: 'Production Dashboard',
          icon: EngineeringIcon,
          path: '/production-dashboard',
          roles: ['production', 'admin'],
        },
      ],
    },
    
    // === PROVIDER AREA ===
    {
      id: 'provider-dashboard',
      label: 'Provider Dashboard',
      icon: DashboardIcon,
      path: '/provider-dashboard',
      roles: ['provider'],
    },
    
    // === PUBLIC SHOP ===
    {
      id: 'shop',
      label: 'Public Shop',
      icon: CartIcon,
      path: '/shop',
      roles: ['customer'],
    },
    
    // === INVENTORY & PRODUCTS ===
    {
      id: 'inventory-products',
      label: 'Inventory & Products',
      icon: InventoryIcon,
      path: '',
      roles: ['admin', 'production'],
      children: [
        {
          id: 'sets',
          label: 'MakerSets',
          icon: ScienceIcon,
          path: '/sets',
          roles: ['admin', 'production'],
        },
        {
          id: 'parts',
          label: 'Parts Inventory',
          icon: InventoryIcon,
          path: '/parts',
          roles: ['admin', 'production'],
        },
        {
          id: 'tools',
          label: 'Tools',
          icon: BuildIcon,
          path: '/tools',
          roles: ['admin', 'production'],
        },
      ],
    },
    
    // === SALES & ORDERS ===
    {
      id: 'sales-orders',
      label: 'Sales & Orders',
      icon: CartIcon,
      path: '',
      roles: ['admin', 'production'],
      children: [
        {
          id: 'orders',
          label: 'Order Management',
          icon: EngineeringIcon,
          path: '/orders',
          badge: activeOrderCount > 0 ? activeOrderCount : undefined,
          roles: ['admin', 'production'],
        },
        {
          id: 'reports',
          label: 'Analytics & Reports',
          icon: ReportsIcon,
          path: '/reports',
          roles: ['admin'],
        },
      ],
    },
    
    // === ADMINISTRATION ===
    {
      id: 'administration',
      label: 'Administration',
      icon: SettingsIcon,
      path: '',
      roles: ['admin'],
      children: [
        {
          id: 'users',
          label: 'User Management',
          icon: PeopleIcon,
          path: '/user-management',
          roles: ['admin'],
        },
        {
          id: 'provider-management',
          label: 'Providers',
          icon: BusinessIcon,
          path: '/admin-provider-management',
          roles: ['admin'],
        },
        {
          id: 'provider-payments',
          label: 'Provider Payments',
          icon: ReportsIcon,
          path: '/provider-payments',
          roles: ['admin'],
        },
        {
          id: 'system-settings',
          label: 'Platform Configuration',
          icon: SettingsIcon,
          path: '/system-settings',
          roles: ['admin'],
        },
      ],
    },
    
    // === AI TOOLS ===
    {
      id: 'ai',
      label: 'AI Tools',
      icon: AIIcon,
      path: '',
      roles: ['admin'],
      children: [
        {
          id: 'ai-assistant',
          label: 'AI Assistant',
          icon: AIIcon,
          path: '/ai-assistant',
          roles: ['admin'],
        },
        {
          id: 'ai-motivation',
          label: 'AI Motivation',
          icon: AIIcon,
          path: '/ai-assistant',
          roles: ['admin'],
        },
        {
          id: 'learning-outcomes-helper',
          label: 'Learning Outcomes',
          icon: ScienceIcon,
          path: '/learning-outcomes-helper',
          roles: ['admin', 'production'],
        },
        {
          id: 'ai-translation',
          label: 'AI Translation',
          icon: LanguageIcon,
          path: '/ai-assistant',
          roles: ['admin', 'production'],
        },
        {
          id: 'ai-inventory',
          label: 'AI Inventory',
          icon: InventoryIcon,
          path: '/ai-assistant',
          roles: ['admin'],
        },
        {
          id: 'ai-set-builder',
          label: 'AI Set Builder',
          icon: EngineeringIcon,
          path: '/ai-assistant',
          roles: ['admin'],
        },
      ],
    },
    
    // === ACCOUNT & INFO ===
    {
      id: 'account',
      label: 'My Account',
      icon: PersonIcon,
      path: '/account',
      roles: ['admin', 'production', 'provider'],
    },
    {
      id: 'terms',
      label: 'Terms & Conditions',
      icon: DescriptionIcon,
      path: '/terms',
      roles: ['admin', 'production', 'customer', 'provider'],
    },
    {
      id: 'about',
      label: 'About Us',
      icon: InfoIcon,
      path: '/about',
      roles: ['admin', 'production', 'customer', 'provider'],
    },
  ];

  // Filter navigation items based on current role
  const navigationItems = allNavigationItems.filter(item => 
    !item.roles || item.roles.includes(currentRole || 'public')
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.children) {
      setExpandedItems(prev => 
        prev.includes(item.id) 
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else {
      navigate(item.path);
      setMobileOpen(false);
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleProfileMenuClose();
    markOrdersAsSeen(); // Mark orders as seen when accessing account
    navigate('/account');
  };

  const handleSettingsClick = () => {
    handleProfileMenuClose();
    // Navigate to settings page
    navigate('/settings');
  };

  const handleOrdersClick = () => {
    handleProfileMenuClose();
    markOrdersAsSeen();
    navigate('/orders');
  };

  const handleLogoutClick = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const drawer = (
    <Box sx={{ width: 280, height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <EngineeringIcon sx={{ fontSize: 32, mr: 1 }} />
          <Typography variant="h5" fontWeight={700}>
            MakerLab
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          STEM Engineering Platform
        </Typography>
      </Box>

      {/* Navigation Items */}
      <List sx={{ px: 2, py: 1 }}>
        {navigationItems.map((item) => (
          <React.Fragment key={item.id}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleItemClick(item)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  background: isActive(item.path) 
                    ? `linear-gradient(135deg, ${stemColors.primary[50]} 0%, ${stemColors.primary[100]} 100%)`
                    : 'transparent',
                  color: isActive(item.path) ? stemColors.primary[700] : 'inherit',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${stemColors.primary[50]} 0%, ${stemColors.primary[100]} 100%)`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? stemColors.primary[700] : 'inherit',
                    minWidth: 40,
                  }}
                >
                  {item.badge ? (
                    <Badge
                      badgeContent={item.badge}
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          background: stemColors.accent.red,
                        },
                      }}
                    >
                      <item.icon />
                    </Badge>
                  ) : (
                    <item.icon />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
                {item.children && (
                  expandedItems.includes(item.id) ? <ExpandLess /> : <ExpandMore />
                )}
              </ListItemButton>
            </ListItem>
            
            {item.children && (
              <Collapse in={expandedItems.includes(item.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleItemClick(child)}
                        sx={{
                          pl: 6,
                          borderRadius: 2,
                          mb: 0.5,
                          background: isActive(child.path) 
                            ? `linear-gradient(135deg, ${stemColors.primary[50]} 0%, ${stemColors.primary[100]} 100%)`
                            : 'transparent',
                          color: isActive(child.path) ? stemColors.primary[700] : 'inherit',
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isActive(child.path) ? stemColors.primary[700] : 'inherit',
                            minWidth: 32,
                          }}
                        >
                          <child.icon />
                        </ListItemIcon>
                        <ListItemText 
                          primary={child.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isActive(child.path) ? 600 : 400,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>

      <Divider sx={{ mx: 2, my: 2 }} />

      {/* Language Selector */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Language
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {['en', 'et', 'ru', 'fi'].map((lang) => (
            <Chip
              key={lang}
              label={lang.toUpperCase()}
              size="small"
              clickable
              onClick={() => changeLanguage(lang)}
              sx={{
                background: currentLanguage === lang 
                  ? `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[600]} 100%)`
                  : stemColors.secondary[200],
                color: currentLanguage === lang ? '#ffffff' : 'inherit',
                fontWeight: currentLanguage === lang ? 600 : 400,
                '&:hover': {
                  background: currentLanguage === lang 
                    ? `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`
                    : stemColors.secondary[300],
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* User Section */}
      <Divider sx={{ mx: 2, my: 2 }} />
      <Box sx={{ px: 2, py: 1 }}>
        {isAuthenticated ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Account
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                navigate('/profile');
                setMobileOpen(false);
              }}
              fullWidth
              sx={{ mb: 1 }}
            >
              My Profile
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                logout();
                navigate('/login');
                setMobileOpen(false);
              }}
              fullWidth
            >
              Logout
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Authentication
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                navigate('/login');
                setMobileOpen(false);
              }}
              fullWidth
              sx={{ mb: 1 }}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                navigate('/register');
                setMobileOpen(false);
              }}
              fullWidth
            >
              Register
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
            <EngineeringIcon sx={{ mr: 1 }} />
            {/* Show provider shop name for providers, platform name for others */}
            {(() => {
              // Debug logging
              if (user?.role === 'provider') {
                console.log('🔍 PROVIDER DETECTED - User:', { 
                  role: user.role, 
                  user_id: user.user_id,
                  email: user.email 
                });
              }
              
              if (user?.role === 'provider' && user?.user_id) {
                const shopName = generateShopName({ userId: user.user_id });
                console.log('🏪 SHOWING SHOP NAME:', shopName);
                return (
                  <Typography variant="h6" component="div" fontWeight={700}>
                    🏪 {shopName}
                  </Typography>
                );
              } else {
                return (
                  <Typography variant="h6" component="div" fontWeight={700}>
                    STEM Engineering Platform
                  </Typography>
                );
              }
            })()}
            {/* Current Role Indicator */}
            <Chip 
              label={currentRole?.toUpperCase() || 'PUBLIC'} 
              size="small" 
              sx={{ 
                ml: 2, 
                bgcolor: currentRole === 'admin' ? 'error.main' : 
                        currentRole === 'production' ? 'secondary.main' :
                        currentRole === 'provider' ? 'primary.main' : 'grey.500',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem'
              }} 
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {/* Language Selector */}
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                id="language-selector"
                name="language-selector"
                value={currentLanguage}
                onChange={(e) => changeLanguage(e.target.value)}
                displayEmpty
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'background.paper',
                      '& .MuiMenuItem-root': {
                        px: 2,
                        py: 1,
                      },
                    },
                  },
                }}
              >
                <MenuItem value="en">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LanguageIcon fontSize="small" />
                    <Typography variant="body2">EN</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="et">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LanguageIcon fontSize="small" />
                    <Typography variant="body2">ET</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="ru">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LanguageIcon fontSize="small" />
                    <Typography variant="body2">RU</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="fi">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LanguageIcon fontSize="small" />
                    <Typography variant="body2">FI</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Role Switcher - Only visible for admin users */}
            {isAdmin && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  id="role-switcher"
                  name="role-switcher"
                  value={currentRole}
                  onChange={(e) => changeRole(e.target.value as any)}
                  displayEmpty
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'white',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: 'background.paper',
                        '& .MuiMenuItem-root': {
                          px: 2,
                          py: 1,
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="admin">
                    <Chip label="Admin" color="error" size="small" />
                  </MenuItem>
                  <MenuItem value="production">
                    <Chip label="Production" color="secondary" size="small" />
                  </MenuItem>
                  <MenuItem value="provider">
                    <Chip label="Provider" color="primary" size="small" />
                  </MenuItem>
                  <MenuItem value="customer">
                    <Chip label="Customer" color="default" size="small" />
                  </MenuItem>
                  <MenuItem value="public">
                    <Chip label="Public" color="default" size="small" />
                  </MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Profile or Login Button */}
            {isAuthenticated ? (
              <IconButton
                id="profile-menu-button"
                color="inherit"
                onClick={handleProfileMenuOpen}
                aria-label="Open profile menu"
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl)}
              >
                <Badge
                  badgeContent={activeOrderCount > 0 ? activeOrderCount : undefined}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: newOrderCount > 0 ? '#ff1744' : '#f44336',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '9px',
                      border: '2px solid white',
                      animation: newOrderCount > 0 ? 'pulse 1s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': {
                          transform: 'scale(1)',
                        },
                        '50%': {
                          transform: 'scale(1.1)',
                        },
                        '100%': {
                          transform: 'scale(1)',
                        },
                      },
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      background: `linear-gradient(135deg, ${stemColors.accent.orange} 0%, ${stemColors.accent.orange}dd 100%)`,
                    }}
                  >
                    <AccountCircleIcon />
                  </Avatar>
                </Badge>
              </IconButton>
            ) : (
              <Button
                color="inherit"
                onClick={handleLoginClick}
                sx={{
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                  }
                }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        disableAutoFocusItem={false}
        MenuListProps={{
          'aria-labelledby': 'profile-menu-button',
          role: 'menu'
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        }}
        slotProps={{
          backdrop: {
            'aria-hidden': 'false'
          }
        }}
      >
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <Badge
              badgeContent={activeOrderCount > 0 ? activeOrderCount : undefined}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: newOrderCount > 0 ? '#ff1744' : '#f44336',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.6rem',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                },
              }}
            >
              <AccountCircleIcon />
            </Badge>
          </ListItemIcon>
          <ListItemText>My Account</ListItemText>
        </MenuItem>
        {/* Only show Settings for admin and production roles */}
        {(currentRole === 'admin' || currentRole === 'production') && (
          <MenuItem onClick={handleSettingsClick}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogoutClick}>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
          disableAutoFocus: false,
          disableEnforceFocus: false,
          disableRestoreFocus: false,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            background: stemColors.background.primary,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            background: stemColors.background.primary,
            borderRight: `1px solid ${stemColors.secondary[200]}`,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default STEMNavigation;
