import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Switch,
  LinearProgress,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Build as BuildIcon,
  Description as DescriptionIcon,
  Engineering as EngineeringIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { ordersApi, PackingListItem, PackingListResponse } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface PackingListProps {
  orderId: number;
  open: boolean;
  onClose: () => void;
}

const PackingList: React.FC<PackingListProps> = ({ orderId, open, onClose }) => {
  const { currentLanguage } = useLanguage();
  const [packingData, setPackingData] = useState<PackingListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [showOptional, setShowOptional] = useState(true);

  useEffect(() => {
    if (open && orderId) {
      fetchPackingList();
    }
  }, [open, orderId, currentLanguage]);

  const fetchPackingList = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching packing list for order ID:', orderId);
      const response = await ordersApi.getPackingList(orderId, currentLanguage);
      console.log('Packing list response:', response.data);
      setPackingData(response.data);
    } catch (err: any) {
      console.error('Error fetching packing list:', err);
      console.error('Error details:', err?.response?.data);
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch packing list');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleItemCheck = (itemId: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleCheckAll = () => {
    if (checkedItems.size === filteredPackingList.length) {
      setCheckedItems(new Set());
    } else {
      const allItemIds = new Set(filteredPackingList.map(item => 
        item.type === 'part' ? item.part_id : item.tool_id
      ));
      setCheckedItems(allItemIds);
    }
  };

  const getStockStatus = (item: PackingListItem) => {
    if (item.type === 'tool') {
      return {
        icon: <CheckCircleIcon />,
        text: item.condition_status || 'Unknown',
        color: item.condition_status === 'good' ? 'success' : 'warning'
      };
    }

    // For parts: Since the order was already placed and stock was deducted,
    // these parts are guaranteed to be available for this order
    const stock = item.stock_quantity;
    const needed = item.total_quantity_needed;

    // Since this order was successfully placed, the parts are available
    // The stock_quantity shown is what's left after this order's allocation
    return {
      icon: <CheckCircleIcon />,
      text: 'Available for Order',
      color: 'success'
    };
  };

  if (!packingData) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Packing List</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const { order, packingList } = packingData;
  const filteredPackingList = packingList.filter(item => 
    showOptional || !((item as any).is_optional || (item as any).is_required === false)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Packing List - Order #{order.order_number}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Order Information */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Order #{order.order_number}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {order.status}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Amount:</strong> €{Number(order.total_amount).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Customer:</strong> {order.customer_first_name} {order.customer_last_name}
                </Typography>
                {order.customer_company_name && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Company:</strong> {order.customer_company_name}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Email:</strong> {order.customer_email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Phone:</strong> {order.customer_phone}
                </Typography>
                {order.shipping_address && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Shipping Address:</strong> {order.shipping_address}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Packing List ({filteredPackingList.length} items)
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={showOptional}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowOptional(e.target.checked)}
                />
              }
              label="Show Optional Items"
            />
            <Button
              variant="outlined"
              onClick={handleCheckAll}
            >
              {checkedItems.size === filteredPackingList.length ? 'Uncheck All' : 'Check All'}
            </Button>
          </Box>
        </Box>

        {/* Progress Summary */}
        <Card sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Packing Progress
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {checkedItems.size} of {filteredPackingList.length} items packed
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(checkedItems.size / filteredPackingList.length) * 100} 
                sx={{ width: 200 }}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`${packingList.filter(item => item.type === 'part').length} Parts`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`${packingList.filter(item => item.type === 'tool').length} Tools`} 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              label={`${packingList.filter(item => (item as any).is_optional || (item as any).is_required === false).length} Optional`} 
              color="warning" 
              variant="outlined"
            />
            <Chip 
              label={`${packingList.filter(item => !(item as any).is_optional && (item as any).is_required !== false).length} Required`} 
              color="success" 
              variant="outlined"
            />
          </Box>
        </Card>

        {/* Compact Checklist */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredPackingList.map((item) => {
            const itemId = item.type === 'part' ? item.part_id : item.tool_id;
            const stockStatus = getStockStatus(item);
            const isChecked = checkedItems.has(itemId);

            return (
              <Card 
                key={`${item.type}-${itemId}`}
                sx={{ 
                  p: 2,
                  opacity: isChecked ? 0.6 : 1,
                  backgroundColor: isChecked ? 'success.light' : 'background.paper',
                  border: isChecked ? '2px solid' : '1px solid',
                  borderColor: isChecked ? 'success.main' : 'divider'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    checked={isChecked}
                    onChange={() => handleItemCheck(itemId)}
                    color="success"
                    sx={{ '&.Mui-checked': { color: 'success.main' } }}
                  />
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        icon={item.type === 'part' ? <BuildIcon /> : <EngineeringIcon />}
                        label={item.type === 'part' ? 'Part' : 'Tool'}
                        color={item.type === 'part' ? 'primary' : 'secondary'}
                        size="small"
                      />
                      <Typography variant="h6" fontWeight="bold">
                        {item.type === 'part' ? item.part_number : item.tool_number}
                      </Typography>
                      <Typography variant="body1" sx={{ flex: 1 }}>
                        {item.type === 'part' ? item.part_name : item.tool_name}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        Qty: {item.total_quantity_needed}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Category: {item.type === 'part' ? item.part_category : item.tool_category}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.type === 'part' ? `Unit: ${item.unit_of_measure}` : `Location: ${item.location}`}
                      </Typography>
                      <Chip
                        icon={stockStatus.icon}
                        label={stockStatus.text}
                        color={stockStatus.color as any}
                        size="small"
                      />
                      {item.type === 'part' && (
                        <Typography variant="caption" color="text.secondary">
                          Stock: {item.stock_quantity}
                        </Typography>
                      )}
                    </Box>

                    {/* Used In Sets - Compact */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {item.used_in_sets.map((set, index) => (
                        <Chip
                          key={index}
                          label={`${set.set_name || `Set ${set.set_id}`}: ${set.total_for_set}`}
                          size="small"
                          color={(set as any).is_optional || (set as any).is_required === false ? 'warning' : 'success'}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {item.type === 'part' && item.instruction_pdf && (
                      <IconButton
                        size="small"
                        onClick={() => window.open(item.instruction_pdf, '_blank')}
                        title="View Instructions"
                      >
                        <DescriptionIcon />
                      </IconButton>
                    )}
                    {item.type === 'part' && item.drawing_pdf && (
                      <IconButton
                        size="small"
                        onClick={() => window.open(item.drawing_pdf, '_blank')}
                        title="View Drawing"
                      >
                        <BuildIcon />
                      </IconButton>
                    )}
                    {item.type === 'tool' && item.safety_instructions && (
                      <IconButton
                        size="small"
                        onClick={() => alert(item.safety_instructions)}
                        title="Safety Instructions"
                      >
                        <SecurityIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>

        {/* Empty State */}
        {packingList.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Items to Pack
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This order doesn't have any sets added yet. Add sets to the order to generate a packing list.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button 
          variant="contained" 
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PackingList;
