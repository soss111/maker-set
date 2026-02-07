import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Engineering as EngineeringIcon } from '@mui/icons-material';
import { stemColors } from '../theme/stemTheme';

const TermsAndConditionsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <EngineeringIcon sx={{ fontSize: 40, color: stemColors.primary[500] }} />
          <Typography variant="h3" component="h1" fontWeight={600}>
            Terms & Conditions
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Last updated: {new Date().toLocaleDateString()}
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            1. Acceptance of Terms
          </Typography>
          <Typography variant="body1" paragraph>
            By accessing and using the MakerLab platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            2. Use License
          </Typography>
          <Typography variant="body1" paragraph>
            Permission is granted to temporarily use the MakerLab platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Modify or copy the materials" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Use the materials for any commercial purpose or for any public display" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Attempt to reverse engineer any software contained on the platform" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Remove any copyright or other proprietary notations from the materials" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            3. Educational Use
          </Typography>
          <Typography variant="body1" paragraph>
            The MakerLab platform is designed for educational purposes. Users are encouraged to:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Use the platform to enhance STEM learning experiences" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Share knowledge and collaborate with other educators" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Respect intellectual property rights of content creators" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Follow safety guidelines when using tools and materials" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            4. Safety and Liability
          </Typography>
          <Typography variant="body1" paragraph>
            Users acknowledge that working with tools and materials involves inherent risks. By using this platform, you agree to:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Follow all safety instructions provided with tools and materials" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Use appropriate safety equipment when working with tools" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Supervise minors when they are using tools or materials" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Hold MakerLab harmless from any injuries or damages resulting from tool use" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            5. Privacy Policy
          </Typography>
          <Typography variant="body1" paragraph>
            Your privacy is important to us. We collect and use information in accordance with our Privacy Policy, which includes:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Collection of user account information for platform functionality" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Usage analytics to improve the platform" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Protection of personal information according to applicable laws" />
            </ListItem>
            <ListItem>
              <ListItemText primary="No sharing of personal data with third parties without consent" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            6. Intellectual Property
          </Typography>
          <Typography variant="body1" paragraph>
            The MakerLab platform and its original content, features, and functionality are owned by Merkuur and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            7. Termination
          </Typography>
          <Typography variant="body1" paragraph>
            We may terminate or suspend your account and bar access to the platform immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            8. Changes to Terms
          </Typography>
          <Typography variant="body1" paragraph>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            9. Contact Information
          </Typography>
          <Typography variant="body1" paragraph>
            If you have any questions about these Terms & Conditions, please contact us at:
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>Email:</strong> info@merkuur.eu
            </Typography>
            <Typography variant="body1">
              <strong>Phone:</strong> +372 5185404
            </Typography>
            <Typography variant="body1">
              <strong>Address:</strong> Prii tee 13, Estonia
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Divider sx={{ my: 4 }} />
      
      <Box textAlign="center">
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Merkuur. All rights reserved.
        </Typography>
      </Box>
    </Container>
  );
};

export default TermsAndConditionsPage;
