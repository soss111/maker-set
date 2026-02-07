/**
 * Smart Search and Filter System
 * Provides intelligent search with filters, sorting, and suggestions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Typography,
  Autocomplete,
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
  Collapse
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

export interface SearchFilter {
  query: string;
  category: string;
  difficulty: string;
  ageRange: { min: number; max: number };
  priceRange: { min: number; max: number };
  duration: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showOnlyAvailable: boolean;
  showOnlyFeatured: boolean;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'category' | 'difficulty' | 'set_name' | 'tag';
  count?: number;
}

interface SmartSearchProps {
  onSearch: (filters: SearchFilter) => void;
  onClear: () => void;
  suggestions?: SearchSuggestion[];
  categories?: string[];
  difficulties?: string[];
  isLoading?: boolean;
  resultCount?: number;
  initialFilters?: Partial<SearchFilter>;
}

const SmartSearch: React.FC<SmartSearchProps> = ({
  onSearch,
  onClear,
  suggestions = [],
  categories = [],
  difficulties = [],
  isLoading = false,
  resultCount = 0,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState<SearchFilter>({
    query: '',
    category: 'all',
    difficulty: 'all',
    ageRange: { min: 0, max: 99 },
    priceRange: { min: 0, max: 1000 },
    duration: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    showOnlyAvailable: true,
    showOnlyFeatured: false,
    ...initialFilters
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);

  // Generate search suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    if (!filters.query || filters.query.length < 2) return [];
    
    return suggestions.filter(suggestion =>
      suggestion.text.toLowerCase().includes(filters.query.toLowerCase())
    ).slice(0, 5);
  }, [filters.query, suggestions]);

  // Handle search input change
  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
  };

  // Handle filter change
  const handleFilterChange = (key: keyof SearchFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setFilters(prev => ({ ...prev, query: suggestion.text }));
    setSearchSuggestions([]);
  };

  // Execute search
  const executeSearch = () => {
    onSearch(filters);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      difficulty: 'all',
      ageRange: { min: 0, max: 99 },
      priceRange: { min: 0, max: 1000 },
      duration: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
      showOnlyAvailable: true,
      showOnlyFeatured: false
    });
    onClear();
  };

  // Auto-search when filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.query.length >= 2 || filters.category !== 'all' || filters.difficulty !== 'all') {
        executeSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category !== 'all') count++;
    if (filters.difficulty !== 'all') count++;
    if (filters.ageRange.min > 0 || filters.ageRange.max < 99) count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 1000) count++;
    if (filters.duration !== 'all') count++;
    if (filters.showOnlyAvailable) count++;
    if (filters.showOnlyFeatured) count++;
    return count;
  }, [filters]);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      {/* Main Search Bar */}
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          freeSolo
          options={filteredSuggestions}
          getOptionLabel={(option) => typeof option === 'string' ? option : option.text}
          value={filters.query}
          onInputChange={(event, newValue) => handleQueryChange(newValue || '')}
          onChange={(event, newValue) => {
            if (typeof newValue === 'object' && newValue) {
              handleSuggestionSelect(newValue);
            }
          }}
          loading={isLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search sets by name, category, or description..."
              variant="outlined"
              fullWidth
              InputProps={{
                ...params.InputProps,
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: (
                  <>
                    {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {option.type === 'category' && <CategoryIcon fontSize="small" />}
                {option.type === 'difficulty' && <TrendingUpIcon fontSize="small" />}
                {option.type === 'set_name' && <StarIcon fontSize="small" />}
                <Typography variant="body2">{option.text}</Typography>
                {option.count && (
                  <Chip label={option.count} size="small" variant="outlined" />
                )}
              </Box>
            </Box>
          )}
        />
      </Box>

      {/* Quick Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.category}
            label="Category"
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Difficulty</InputLabel>
          <Select
            value={filters.difficulty}
            label="Difficulty"
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <MenuItem value="all">All Levels</MenuItem>
            {difficulties.map(difficulty => (
              <MenuItem key={difficulty} value={difficulty}>
                {difficulty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort By"
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="price">Price</MenuItem>
            <MenuItem value="difficulty">Difficulty</MenuItem>
            <MenuItem value="duration">Duration</MenuItem>
            <MenuItem value="created_at">Date Added</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="Toggle Advanced Filters">
          <IconButton
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            color={showAdvancedFilters ? 'primary' : 'default'}
          >
            <Badge badgeContent={activeFiltersCount} color="primary">
              <FilterIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={clearFilters}
          disabled={activeFiltersCount === 0}
        >
          Clear All
        </Button>
      </Stack>

      {/* Advanced Filters */}
      <Collapse in={showAdvancedFilters}>
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Advanced Filters
          </Typography>
          
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Min Age</InputLabel>
              <Select
                value={filters.ageRange.min}
                label="Min Age"
                onChange={(e) => handleFilterChange('ageRange', { 
                  ...filters.ageRange, 
                  min: Number(e.target.value) 
                })}
              >
                {[0, 3, 6, 8, 10, 12, 14, 16, 18].map(age => (
                  <MenuItem key={age} value={age}>{age}+</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Max Age</InputLabel>
              <Select
                value={filters.ageRange.max}
                label="Max Age"
                onChange={(e) => handleFilterChange('ageRange', { 
                  ...filters.ageRange, 
                  max: Number(e.target.value) 
                })}
              >
                {[6, 8, 10, 12, 14, 16, 18, 99].map(age => (
                  <MenuItem key={age} value={age}>{age === 99 ? 'Any' : `Up to ${age}`}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Duration</InputLabel>
              <Select
                value={filters.duration}
                label="Duration"
                onChange={(e) => handleFilterChange('duration', e.target.value)}
              >
                <MenuItem value="all">Any Duration</MenuItem>
                <MenuItem value="short">Under 30 min</MenuItem>
                <MenuItem value="medium">30-60 min</MenuItem>
                <MenuItem value="long">Over 60 min</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => handleFilterChange('showOnlyAvailable', !filters.showOnlyAvailable)}
              color={filters.showOnlyAvailable ? 'primary' : 'inherit'}
            >
              Available Only
            </Button>

            <Button
              variant="outlined"
              startIcon={<StarIcon />}
              onClick={() => handleFilterChange('showOnlyFeatured', !filters.showOnlyFeatured)}
              color={filters.showOnlyFeatured ? 'primary' : 'inherit'}
            >
              Featured Only
            </Button>
          </Stack>
        </Box>
      </Collapse>

      {/* Search Results Summary */}
      {resultCount > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Found {resultCount} sets matching your criteria
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SmartSearch;

