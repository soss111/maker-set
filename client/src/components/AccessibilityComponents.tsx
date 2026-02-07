/**
 * Accessibility Components
 * Provides reusable accessibility-enhanced components
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Link,
  Paper,
  Grid,
  Container,
  Stack
} from '@mui/material';
import {
  Accessibility as AccessibilityIcon,
  Keyboard as KeyboardIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Contrast as ContrastIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';

// Accessibility Context
interface AccessibilityContextType {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  setHighContrast: (value: boolean) => void;
  setFontSize: (value: 'small' | 'medium' | 'large') => void;
  setReducedMotion: (value: boolean) => void;
  setScreenReader: (value: boolean) => void;
  setKeyboardNavigation: (value: boolean) => void;
}

const AccessibilityContext = React.createContext<AccessibilityContextType | null>(null);

export const useAccessibility = () => {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Accessibility Provider
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${fontSize}`);

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Screen reader
    if (screenReader) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }

    // Keyboard navigation
    if (keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }, [highContrast, fontSize, reducedMotion, screenReader, keyboardNavigation]);

  const value: AccessibilityContextType = {
    highContrast,
    fontSize,
    reducedMotion,
    screenReader,
    keyboardNavigation,
    setHighContrast,
    setFontSize,
    setReducedMotion,
    setScreenReader,
    setKeyboardNavigation
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Accessible Button Component
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tooltip?: string;
  className?: string;
  sx?: any;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  endIcon,
  ariaLabel,
  ariaDescribedBy,
  tooltip,
  className,
  sx
}) => {
  const button = (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      color={color}
      size={size}
      startIcon={startIcon}
      endIcon={endIcon}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={className}
      sx={sx}
    >
      {children}
    </Button>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {disabled ? <span>{button}</span> : button}
    </Tooltip>
  ) : button;
};

// Accessible TextField Component
interface AccessibleTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  sx?: any;
}

export const AccessibleTextField: React.FC<AccessibleTextFieldProps> = ({
  label,
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  disabled = false,
  multiline = false,
  rows = 1,
  type = 'text',
  placeholder,
  id,
  name,
  ariaLabel,
  ariaDescribedBy,
  sx
}) => {
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <TextField
      id={fieldId}
      name={name || fieldId}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      multiline={multiline}
      rows={rows}
      type={type}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy || (error ? errorId : helperId)}
      aria-invalid={error}
      aria-required={required}
      InputLabelProps={{
        htmlFor: fieldId,
        id: `${fieldId}-label`
      }}
      FormHelperTextProps={{
        id: helperId,
        role: error ? 'alert' : 'note'
      }}
      sx={sx}
    />
  );
};

// Accessible Select Component
interface AccessibleSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  sx?: any;
}

export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  label,
  value,
  onChange,
  options,
  error = false,
  helperText,
  required = false,
  disabled = false,
  id,
  name,
  ariaLabel,
  ariaDescribedBy,
  sx
}) => {
  const fieldId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <FormControl
      fullWidth
      error={error}
      disabled={disabled}
      required={required}
      sx={sx}
    >
      <InputLabel id={`${fieldId}-label`} htmlFor={fieldId}>
        {label}
      </InputLabel>
      <Select
        id={fieldId}
        name={name || fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy || (error ? errorId : helperId)}
        aria-invalid={error}
        aria-required={required}
        labelId={`${fieldId}-label`}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helperText && (
        <Typography
          id={helperId}
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          sx={{ mt: 0.5, ml: 1.5 }}
          role={error ? 'alert' : 'note'}
        >
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

// Accessibility Settings Panel
export const AccessibilitySettings: React.FC = () => {
  const {
    highContrast,
    fontSize,
    reducedMotion,
    screenReader,
    keyboardNavigation,
    setHighContrast,
    setFontSize,
    setReducedMotion,
    setScreenReader,
    setKeyboardNavigation
  } = useAccessibility();

  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Accessibility Settings">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="Open accessibility settings"
          color="primary"
        >
          <AccessibilityIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="accessibility-settings-title"
      >
        <DialogTitle id="accessibility-settings-title">
          Accessibility Settings
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* High Contrast */}
            <FormControlLabel
              control={
                <Switch
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  aria-describedby="high-contrast-description"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">High Contrast Mode</Typography>
                  <Typography
                    id="high-contrast-description"
                    variant="caption"
                    color="text.secondary"
                  >
                    Increases color contrast for better visibility
                  </Typography>
                </Box>
              }
            />

            {/* Font Size */}
            <Box>
              <Typography variant="body1" gutterBottom>
                Font Size
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={fontSize === size ? 'contained' : 'outlined'}
                    onClick={() => setFontSize(size)}
                    aria-pressed={fontSize === size}
                    size="small"
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Reduced Motion */}
            <FormControlLabel
              control={
                <Switch
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  aria-describedby="reduced-motion-description"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Reduce Motion</Typography>
                  <Typography
                    id="reduced-motion-description"
                    variant="caption"
                    color="text.secondary"
                  >
                    Minimizes animations and transitions
                  </Typography>
                </Box>
              }
            />

            {/* Screen Reader Mode */}
            <FormControlLabel
              control={
                <Switch
                  checked={screenReader}
                  onChange={(e) => setScreenReader(e.target.checked)}
                  aria-describedby="screen-reader-description"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Screen Reader Mode</Typography>
                  <Typography
                    id="screen-reader-description"
                    variant="caption"
                    color="text.secondary"
                  >
                    Optimizes interface for screen readers
                  </Typography>
                </Box>
              }
            />

            {/* Keyboard Navigation */}
            <FormControlLabel
              control={
                <Switch
                  checked={keyboardNavigation}
                  onChange={(e) => setKeyboardNavigation(e.target.checked)}
                  aria-describedby="keyboard-navigation-description"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Keyboard Navigation</Typography>
                  <Typography
                    id="keyboard-navigation-description"
                    variant="caption"
                    color="text.secondary"
                  >
                    Enhances keyboard navigation support
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Skip Navigation Link
export const SkipNavigation: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !show) {
        setShow(true);
      }
    };

    const handleClick = () => {
      setShow(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [show]);

  if (!show) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        p: 1
      }}
    >
      <Link
        href="#main-content"
        color="inherit"
        underline="none"
        sx={{
          display: 'block',
          px: 2,
          py: 1,
          '&:focus': {
            outline: '2px solid',
            outlineColor: 'secondary.main'
          }
        }}
      >
        Skip to main content
      </Link>
    </Box>
  );
};

// Loading Indicator with Accessibility
interface AccessibleLoadingProps {
  loading: boolean;
  message?: string;
  progress?: number;
  variant?: 'circular' | 'linear';
}

export const AccessibleLoading: React.FC<AccessibleLoadingProps> = ({
  loading,
  message = 'Loading...',
  progress,
  variant = 'circular'
}) => {
  if (!loading) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3
      }}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {variant === 'circular' ? (
        <CircularProgress aria-hidden="true" />
      ) : (
        <LinearProgress
          variant={progress !== undefined ? 'determinate' : 'indeterminate'}
          value={progress}
          sx={{ width: '100%', maxWidth: 300 }}
          aria-hidden="true"
        />
      )}
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
      {progress !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {Math.round(progress)}% complete
        </Typography>
      )}
    </Box>
  );
};

// Status Messages with Accessibility
interface AccessibleStatusProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  open: boolean;
  onClose: () => void;
  autoHideDuration?: number;
}

export const AccessibleStatus: React.FC<AccessibleStatusProps> = ({
  type,
  message,
  open,
  onClose,
  autoHideDuration = 6000
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircleIcon />;
      case 'error': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      case 'info': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Snackbar
      open={open}
      onClose={onClose}
      autoHideDuration={autoHideDuration}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      role="alert"
      aria-live="assertive"
    >
      <Alert
        onClose={onClose}
        severity={type}
        icon={getIcon()}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

// Breadcrumb Navigation
interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface AccessibleBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (item: BreadcrumbItem) => void;
}

export const AccessibleBreadcrumbs: React.FC<AccessibleBreadcrumbsProps> = ({
  items,
  onNavigate
}) => {
  return (
    <Breadcrumbs
      aria-label="Breadcrumb navigation"
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ mb: 2 }}
    >
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(item);
            }
          }}
          color={item.current ? 'text.primary' : 'text.secondary'}
          underline="hover"
          aria-current={item.current ? 'page' : undefined}
        >
          {index === 0 && <HomeIcon sx={{ mr: 0.5, verticalAlign: 'middle' }} />}
          {item.label}
        </Link>
      ))}
    </Breadcrumbs>
  );
};

export default {
  AccessibilityProvider,
  useAccessibility,
  AccessibleButton,
  AccessibleTextField,
  AccessibleSelect,
  AccessibilitySettings,
  SkipNavigation,
  AccessibleLoading,
  AccessibleStatus,
  AccessibleBreadcrumbs
};
