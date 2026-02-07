import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Build as BuildIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

interface SetStatsProps {
  totalSets: number;
  activeSets: number;
  inactiveSets: number;
  categories: string[];
  averagePrice: number;
  totalValue: number;
  loading?: boolean;
}

const SetStats: React.FC<SetStatsProps> = ({
  totalSets,
  activeSets,
  inactiveSets,
  categories,
  averagePrice,
  totalValue,
  loading = false,
}) => {
  const activePercentage = totalSets > 0 ? (activeSets / totalSets) * 100 : 0;

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Loading statistics...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          Set Statistics
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {totalSets}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sets
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                {activeSets}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Sets
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={activePercentage} 
                sx={{ mt: 1, height: 4, borderRadius: 2 }}
                color="success"
              />
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {inactiveSets}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive Sets
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                {categories.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categories
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BuildIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Average Price:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  €{averagePrice.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Total Value:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  €{totalValue.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Categories:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  size="small"
                  variant="outlined"
                  icon={<CategoryIcon />}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SetStats;
