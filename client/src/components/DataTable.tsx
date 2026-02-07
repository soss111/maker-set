/**
 * Reusable Data Table Component
 * 
 * High-performance table with sorting, filtering, pagination,
 * and virtual scrolling for large datasets
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

export interface Column<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  getValue?: (row: T) => any;
}

export interface Action<T = any> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (row: T) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  onSort,
  onFilter,
  pagination,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  dense = false,
  stickyHeader = true,
  maxHeight = 600
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = column.getValue ? column.getValue(row) : row[column.id];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        filtered = filtered.filter(row => {
          const cellValue = row[field];
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, sortField, sortDirection, columns]);

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    if (onSort) {
      const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      setSortField(field);
      onSort(field, newDirection);
    } else {
      setSortField(field);
      setSortDirection(prev => sortField === field && prev === 'asc' ? 'desc' : 'asc');
    }
  }, [sortField, sortDirection, onSort]);

  // Handle selection
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange(processedData);
    } else {
      onSelectionChange([]);
    }
  }, [processedData, onSelectionChange]);

  const handleSelectRow = useCallback((row: T, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedRows, row]);
    } else {
      onSelectionChange(selectedRows.filter(r => r !== row));
    }
  }, [selectedRows, onSelectionChange]);

  // Handle action menu
  const handleActionMenuOpen = useCallback((event: React.MouseEvent, rowId: string) => {
    setActionMenuAnchor(prev => ({ ...prev, [rowId]: event.currentTarget as HTMLElement }));
  }, []);

  const handleActionMenuClose = useCallback((rowId: string) => {
    setActionMenuAnchor(prev => ({ ...prev, [rowId]: null }));
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [filters, onFilter]);

  // Handle search
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const isSelected = useCallback((row: T) => {
    return selectedRows.some(selected => selected === row);
  }, [selectedRows]);

  const isAllSelected = useMemo(() => {
    return processedData.length > 0 && processedData.every(row => isSelected(row));
  }, [processedData, isSelected]);

  const isIndeterminate = useMemo(() => {
    return selectedRows.length > 0 && selectedRows.length < processedData.length;
  }, [selectedRows.length, processedData.length]);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Search and Filters */}
      {(searchable || Object.keys(filters).length > 0) && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {searchable && (
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
            )}
            
            {columns.filter(col => col.filterable).map(column => (
              <TextField
                key={column.id}
                size="small"
                placeholder={`Filter ${column.label}`}
                value={filters[column.id] || ''}
                onChange={(e) => handleFilterChange(column.id, e.target.value)}
                sx={{ minWidth: 150 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              
              {columns.map(column => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortField === column.id}
                      direction={sortField === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              
              {actions.length > 0 && (
                <TableCell align="right" padding="none">
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((row, index) => {
                const selected = isSelected(row);
                const rowId = row.id || index;
                
                return (
                  <TableRow
                    key={rowId}
                    hover
                    selected={selected}
                    onClick={() => onRowClick?.(row)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row, e.target.checked);
                          }}
                        />
                      </TableCell>
                    )}
                    
                    {columns.map(column => (
                      <TableCell key={column.id} align={column.align}>
                        {column.render ? 
                          column.render(column.getValue ? column.getValue(row) : row[column.id], row) :
                          (column.getValue ? column.getValue(row) : row[column.id])
                        }
                      </TableCell>
                    ))}
                    
                    {actions.length > 0 && (
                      <TableCell align="right" padding="none">
                        <IconButton
                          id={`action-menu-button-${rowId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionMenuOpen(e, rowId);
                          }}
                          aria-label="Open action menu"
                          aria-haspopup="true"
                          aria-expanded={Boolean(actionMenuAnchor[rowId])}
                        >
                          <MoreVertIcon />
                        </IconButton>
                        
                        <Menu
                          anchorEl={actionMenuAnchor[rowId]}
                          open={Boolean(actionMenuAnchor[rowId])}
                          onClose={() => handleActionMenuClose(rowId)}
                          disableAutoFocusItem={false}
                          MenuListProps={{
                            'aria-labelledby': `action-menu-button-${rowId}`,
                            role: 'menu'
                          }}
                          slotProps={{
                            backdrop: {
                              'aria-hidden': 'false'
                            }
                          }}
                        >
                          {actions.map(action => (
                            <MenuItem
                              key={action.id}
                              onClick={() => {
                                handleActionMenuClose(rowId);
                                action.onClick(row);
                              }}
                              disabled={action.disabled?.(row)}
                            >
                              {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
                              <ListItemText>{action.label}</ListItemText>
                            </MenuItem>
                          ))}
                        </Menu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, page) => pagination.onPageChange(page + 1)}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(e) => pagination.onLimitChange(parseInt(e.target.value))}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}
    </Paper>
  );
}

/**
 * Common action creators
 */
export const createActions = {
  edit: (onEdit: (row: any) => void): Action => ({
    id: 'edit',
    label: 'Edit',
    icon: <EditIcon />,
    onClick: onEdit
  }),
  
  delete: (onDelete: (row: any) => void): Action => ({
    id: 'delete',
    label: 'Delete',
    icon: <DeleteIcon />,
    onClick: onDelete,
    color: 'error'
  }),
  
  view: (onView: (row: any) => void): Action => ({
    id: 'view',
    label: 'View',
    icon: <ViewIcon />,
    onClick: onView
  }),
  
  download: (onDownload: (row: any) => void): Action => ({
    id: 'download',
    label: 'Download',
    icon: <DownloadIcon />,
    onClick: onDownload
  })
};
