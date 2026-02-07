import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Typography,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Sort as SortIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

interface SetFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  showInactiveSets: boolean;
  onShowInactiveSetsChange: (show: boolean) => void;
  isAdmin: boolean;
  onToggleVisibilityManager: () => void;
}

const SetFilters: React.FC<SetFiltersProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
  showInactiveSets,
  onShowInactiveSetsChange,
  isAdmin,
  onToggleVisibilityManager,
}) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search Field */}
      <TextField
        fullWidth
        placeholder="Search sets by name, category, or description..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {/* Sorting Controls */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            label="Sort by"
            startAdornment={<SortIcon sx={{ mr: 1 }} />}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="category">Category</MenuItem>
            <MenuItem value="difficulty_level">Difficulty</MenuItem>
            <MenuItem value="base_price">Price</MenuItem>
            <MenuItem value="created_at">Date Created</MenuItem>
            <MenuItem value="updated_at">Last Updated</MenuItem>
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={sortOrder}
          exclusive
          onChange={(e, newOrder) => newOrder && onSortOrderChange(newOrder)}
          size="small"
        >
          <ToggleButton value="asc">↑ Asc</ToggleButton>
          <ToggleButton value="desc">↓ Desc</ToggleButton>
        </ToggleButtonGroup>

        {/* View Mode Toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && onViewModeChange(newMode)}
          size="small"
        >
          <ToggleButton value="grid">Grid</ToggleButton>
          <ToggleButton value="list">List</ToggleButton>
        </ToggleButtonGroup>

        {/* Show Inactive Sets Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={showInactiveSets}
              onChange={(e) => onShowInactiveSetsChange(e.target.checked)}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {showInactiveSets ? <VisibilityIcon /> : <VisibilityOffIcon />}
              <Typography variant="body2">
                Show Inactive Sets
              </Typography>
            </Box>
          }
        />

        {/* Show Visibility Manager Button - Admin Only */}
        {isAdmin && (
          <Box sx={{ ml: 'auto' }}>
            <ToggleButton
              value="visibility-manager"
              selected={false}
              onChange={onToggleVisibilityManager}
              size="small"
              sx={{ 
                border: '1px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                }
              }}
            >
              Manage Visibility
            </ToggleButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SetFilters;
