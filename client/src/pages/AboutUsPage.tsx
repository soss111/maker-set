import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Container,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import {
  Engineering as EngineeringIcon,
  School as SchoolIcon,
  Science as ScienceIcon,
  Build as BuildIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { stemColors } from '../theme/stemTheme';

const AboutUsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={3}>
          <EngineeringIcon sx={{ fontSize: 60, color: stemColors.primary[500] }} />
          <Typography variant="h2" component="h1" fontWeight={600}>
            About MakerLab
          </Typography>
        </Box>
        <Typography variant="h5" color="text.secondary" maxWidth="800px" mx="auto">
          Empowering STEM Education Through Innovation and Technology
        </Typography>
      </Box>

      {/* Mission Statement */}
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center">
            Our Mission
          </Typography>
          <Typography variant="h6" paragraph textAlign="center" color="text.secondary">
            To revolutionize STEM education by providing educators and students with comprehensive tools, 
            resources, and platforms that make science, technology, engineering, and mathematics 
            accessible, engaging, and practical.
          </Typography>
        </CardContent>
      </Card>

      {/* What We Do */}
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center" mb={4}>
            What We Do
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
            <Box>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Avatar sx={{ bgcolor: stemColors.primary[500], mt: 1 }}>
                  <ScienceIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    STEM Education Solutions
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    We provide comprehensive STEM education platforms that integrate hands-on learning 
                    with digital tools, making complex concepts accessible to learners of all ages.
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Avatar sx={{ bgcolor: stemColors.secondary[500], mt: 1 }}>
                  <BuildIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Tool & Resource Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Our platform helps educators manage tools, materials, and resources efficiently, 
                    ensuring students have access to everything they need for hands-on learning.
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Avatar sx={{ bgcolor: stemColors.accent.green, mt: 1 }}>
                  <SchoolIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Educational Project Sets
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    We curate and create educational project sets that combine theory with practice, 
                    providing structured learning experiences that build real-world skills.
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Avatar sx={{ bgcolor: stemColors.accent.yellow, mt: 1 }}>
                  <EngineeringIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Order & Inventory Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Our system streamlines the ordering process and manages inventory, making it easy 
                    for educational institutions to maintain their STEM programs.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Our Values */}
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center" mb={4}>
            Our Values
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
            <Box textAlign="center">
              <Chip 
                label="Innovation" 
                color="primary" 
                sx={{ mb: 2, fontSize: '1rem', height: 40 }}
              />
              <Typography variant="body2" color="text.secondary">
                We constantly innovate to provide cutting-edge educational solutions
              </Typography>
            </Box>
            <Box textAlign="center">
              <Chip 
                label="Accessibility" 
                color="secondary" 
                sx={{ mb: 2, fontSize: '1rem', height: 40 }}
              />
              <Typography variant="body2" color="text.secondary">
                Making STEM education accessible to everyone, regardless of background
              </Typography>
            </Box>
            <Box textAlign="center">
              <Chip 
                label="Quality" 
                color="success" 
                sx={{ mb: 2, fontSize: '1rem', height: 40 }}
              />
              <Typography variant="body2" color="text.secondary">
                Committed to delivering high-quality tools and educational content
              </Typography>
            </Box>
            <Box textAlign="center">
              <Chip 
                label="Collaboration" 
                color="warning" 
                sx={{ mb: 2, fontSize: '1rem', height: 40 }}
              />
              <Typography variant="body2" color="text.secondary">
                Building partnerships with educators and institutions worldwide
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center" mb={4}>
            About Merkuur
          </Typography>
          <Typography variant="body1" paragraph>
            Merkuur is a leading provider of STEM education solutions, dedicated to transforming 
            how students learn science, technology, engineering, and mathematics. Based in Estonia, 
            we serve educational institutions worldwide with innovative tools and platforms.
          </Typography>
          <Typography variant="body1" paragraph>
            Our team consists of educators, engineers, and technology experts who understand the 
            challenges of modern STEM education. We combine this expertise with cutting-edge 
            technology to create solutions that truly make a difference in the classroom.
          </Typography>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card sx={{ mb: 6 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center" mb={4}>
            Get In Touch
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 4 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <EmailIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Email
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  info@merkuur.eu
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <PhoneIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Phone
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  +372 5185404
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <LocationIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Address
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prii tee 13<br />
                  Estonia
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Divider sx={{ my: 4 }} />
      
      <Box textAlign="center">
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Merkuur. Empowering STEM Education Worldwide.
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutUsPage;
