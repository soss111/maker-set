import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Button, Grid } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import SystemSettingsDialog from '../components/SystemSettingsDialog';
import { stemColors } from '../theme/stemTheme';

const SettingsPage: React.FC = () => {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const handleCloseSettingsDialog = () => {
    setSettingsDialogOpen(false);
  };

  const handleOpenSettingsDialog = () => {
    setSettingsDialogOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${stemColors.primary[50]} 0%, ${stemColors.secondary[50]} 100%)`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            pb: 2,
            borderBottom: `2px solid ${stemColors.primary[200]}`,
          }}
        >
          <SettingsIcon
            sx={{
              fontSize: 32,
              color: stemColors.primary[600],
              mr: 2,
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: stemColors.primary[800],
              background: `linear-gradient(45deg, ${stemColors.primary[600]}, ${stemColors.secondary[600]})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            System Settings
          </Typography>
        </Box>

        <Typography
          variant="body1"
          sx={{
            color: stemColors.text.secondary,
            mb: 3,
            fontSize: '1.1rem',
            lineHeight: 1.6,
          }}
        >
          Configure your MakerLab system settings, accessibility options, manage backups, and monitor system health.
        </Typography>

        {/* Settings Options */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Paper
            elevation={2}
            sx={{
              p: 4,
              borderRadius: 2,
              border: `2px solid ${stemColors.primary[200]}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: stemColors.primary[400],
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
              maxWidth: 400,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <SettingsIcon
                sx={{
                  fontSize: 64,
                  color: stemColors.primary[600],
                  mb: 2,
                }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: stemColors.primary[800],
                  mb: 1,
                }}
              >
                System Settings
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: stemColors.text.secondary,
                  mb: 3,
                }}
              >
                Manage system configuration, accessibility options, backups, and health monitoring
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleOpenSettingsDialog}
                sx={{
                  backgroundColor: stemColors.primary[600],
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: stemColors.primary[700],
                  },
                }}
              >
                Open System Settings
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* System Settings Dialog */}
        <SystemSettingsDialog
          open={settingsDialogOpen}
          onClose={handleCloseSettingsDialog}
        />
      </Paper>
    </Container>
  );
};

export default SettingsPage;
