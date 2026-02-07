import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
} from '@mui/material';
import {
  Share as ShareIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  ContentCopy as CopyIcon,
  VideoLibrary as TikTokIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  difficulty?: string;
  age?: string;
  price?: number;
  variant?: 'button' | 'icon' | 'menu';
  size?: 'small' | 'medium' | 'large';
  shareCount?: number;
  sharesUntilReward?: number;
  hasEarnedReward?: boolean;
  sharesRequired?: number;
  rewardAmount?: number;
  rewardMessage?: string;
  onShare?: (platform: string) => void;
  onClaimReward?: () => void;
}

const SocialShare: React.FC<SocialShareProps> = ({
  url,
  title,
  description = '',
  imageUrl = '',
  category = '',
  difficulty = '',
  age = '',
  price,
  variant = 'icon',
  size = 'medium',
  shareCount = 0,
  sharesUntilReward = 3,
  hasEarnedReward = false,
  sharesRequired = 3,
  rewardAmount = 5,
  rewardMessage,
  onShare,
  onClaimReward,
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { showSnackbar } = useSnackbar();

  // Generate intelligent social media copy based on set details
  const generateSocialMessage = (platform: string): string => {
    let emoji = '🧪';
    if (category?.toLowerCase().includes('robot')) emoji = '🤖';
    else if (category?.toLowerCase().includes('car')) emoji = '🚗';
    else if (category?.toLowerCase().includes('flight')) emoji = '✈️';
    else if (category?.toLowerCase().includes('music')) emoji = '🎵';
    else if (category?.toLowerCase().includes('light')) emoji = '💡';
    else if (category?.toLowerCase().includes('electronic')) emoji = '⚡';
    
    let hashtags = `#STEM #STEAM #Education #Learning`;
    if (category) hashtags += ` #${category.replace(/\s+/g, '')}`;
    if (difficulty) hashtags += ` #${difficulty}`;
    
    const priceText = price ? `💰 Only €${price.toFixed(2)}` : '';
    const ageText = age ? `Perfect for ages ${age}` : '';
    
    // Personal, genuine messages
    const messages = {
      twitter: `${emoji} I found this amazing set to improve my engineering skills!\n\n"${title}"\n\nThere's a huge amount of different sets - dig and find your favorites! 🔍\n\n${ageText} ${priceText}\n\n${hashtags}\n\n${url}`,
      
      facebook: `${emoji} Just discovered an incredible STEM learning set!\n\n"${title}"\n\nI'm excited to improve my engineering skills with this project. The platform has tons of different sets to explore - definitely worth checking out if you're into hands-on learning!\n\n${description || ''}\n${ageText} ${priceText}\n\n${hashtags}`,
      
      whatsapp: `${emoji} Check this out! I found an amazing set to improve my engineering skills:\n\n${title}\n\nThere's a huge amount of different sets - dig and find your favorites! 🔍\n\n${priceText}\n\n${url}`,
      
      tiktok: `${emoji} Amazing STEM learning set! "${title}" - Perfect for ages ${ageText}! ${hashtags} 🔥\n\nCheck out this platform with tons of different sets!\n\n${url}`,
      
      email: `Amazing STEM Learning Set: ${title}\n\nI found this incredible set to improve my engineering skills!\n\n${description || 'A great STEM learning experience'}\n\nThere's a huge amount of different sets on the platform - you should dig and find your favorites!\n\n${ageText} ${priceText}\n\nCheck it out: ${url}`,
    };
    
    return messages[platform as keyof typeof messages] || `${title} - ${url}`;
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(generateSocialMessage('facebook'))}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(generateSocialMessage('twitter'))}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(generateSocialMessage('email'))}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(generateSocialMessage('whatsapp'))}`,
    tiktok: `https://www.tiktok.com/upload?lang=en-US&code=${encodeURIComponent(generateSocialMessage('tiktok'))}`,
    copy: url, // For copy link
    native: url, // For native share
  };

  const handleShare = (platform: keyof typeof shareUrls) => {
    const shareUrl = shareUrls[platform];
    
    // Handle special cases for copy and native
    if (platform === 'copy') {
      handleCopyLink();
      return;
    }
    
    if (platform === 'native') {
      handleNativeShare();
      return;
    }
    
    // For all other platforms, open share URL
    window.open(shareUrl, '_blank', 'width=600,height=400');
    
    // Track share analytics (only if callback provided - for logged in users)
    if (onShare) {
      onShare(platform);
    }
    
    showSnackbar(`Shared to ${platform}! 🎉`, 'success');
    handleCloseDialog();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showSnackbar('Link copied to clipboard!', 'success');
      handleCloseDialog();
      
      // Track copy as share if callback provided
      if (onShare) {
        onShare('copy');
      }
    } catch (error) {
      showSnackbar('Failed to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        
        // Track share if callback provided
        if (onShare) {
          onShare('native');
        }
        
        handleCloseDialog();
      } catch (error) {
        // User cancelled or error occurred
        console.log('Native share cancelled');
      }
    }
  };

  const ShareButton = (
    <Tooltip title={shareCount > 0 ? `Shared ${shareCount} times` : "Share this amazing STEM set"}>
      {variant === 'button' ? (
        <Button
          startIcon={<ShareIcon />}
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          sx={{ position: 'relative' }}
        >
          Share
          {shareCount > 0 && (
            <Typography
              component="span"
              sx={{
                ml: 1,
                bgcolor: 'white',
                color: 'primary.main',
                borderRadius: 1,
                px: 0.5,
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}
            >
              {shareCount}
            </Typography>
          )}
        </Button>
      ) : (
        <IconButton
          onClick={handleOpenDialog}
          size={size}
          sx={{ position: 'relative' }}
        >
          <ShareIcon />
          {shareCount > 0 && (
            <Typography
              component="span"
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: 'error.main',
                color: 'white',
                borderRadius: '50%',
                minWidth: 16,
                height: 16,
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              {shareCount}
            </Typography>
          )}
        </IconButton>
      )}
    </Tooltip>
  );

  return (
    <Box>
      {ShareButton}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 2, textAlign: 'center' }}>
          <ShareIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">Share This Amazing Set!</Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Share this STEM learning experience with friends and family
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <Paper 
                elevation={2}
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
                onClick={() => handleShare('facebook')}
              >
                <FacebookIcon sx={{ fontSize: 40, color: '#1877F2' }} />
                <Typography variant="body2" sx={{ mt: 1 }}>Facebook</Typography>
              </Paper>
            <Paper 
                elevation={2}
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
                onClick={() => handleShare('twitter')}
              >
                <TwitterIcon sx={{ fontSize: 40, color: '#1DA1F2' }} />
          <Typography variant="body2" sx={{ mt: 1 }}>Twitter</Typography>
              </Paper>
            <Paper
                elevation={2}
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
                onClick={() => handleShare('whatsapp')}
              >
                <WhatsAppIcon sx={{ fontSize: 40, color: '#25D366' }} />
                <Typography variant="body2" sx={{ mt: 1 }}>WhatsApp</Typography>
              </Paper>
            <Paper
                elevation={2}
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
                onClick={async () => {
                  // Track email share (doesn't count toward reward)
                  if (onShare) {
                    onShare('email');
                  }
                  // Open email client
                  window.location.href = shareUrls.email;
                  showSnackbar('Email opened! Note: Email shares don\'t count toward the reward', 'info');
                  handleCloseDialog();
                }}
              >
                <EmailIcon sx={{ fontSize: 40 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>Email</Typography>
              </Paper>
            <Paper
                elevation={2}
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
                onClick={() => handleShare('tiktok')}
              >
                <TikTokIcon sx={{ fontSize: 40, color: '#000000' }} />
                <Typography variant="body2" sx={{ mt: 1 }}>TikTok</Typography>
              </Paper>
            <Paper
                elevation={2}
                sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    showSnackbar('Link copied! Note: Copy link doesn\'t count toward the reward', 'info');
                    handleCloseDialog();
                    
                    // Track copy as share (doesn't count toward reward)
                    if (onShare) {
                      onShare('copy');
                    }
                  } catch (error) {
                    showSnackbar('Failed to copy link', 'error');
                  }
                }}
              >
                <CopyIcon sx={{ fontSize: 40 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>Copy Link</Typography>
              </Paper>
          </Box>
          
          {onShare && (
            <Box sx={{ mt: 3 }}>
              {hasEarnedReward ? (
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body1" fontWeight="bold" color="success.dark" sx={{ textAlign: 'center', mb: 1 }}>
                    🎉 You earned €5 credits!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Your credits will be automatically applied at checkout
                  </Typography>
                  {onClaimReward && (
                    <Button 
                      variant="contained" 
                      color="success" 
                      fullWidth 
                      sx={{ mt: 2 }}
                      onClick={onClaimReward}
                    >
                      Claim Your Reward
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body1" fontWeight="bold" sx={{ textAlign: 'center', mb: 1 }}>
                    💰 Share & Earn Rewards!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
                    Share {sharesUntilReward} more {sharesUntilReward === 1 ? 'set' : 'sets'} to get €{rewardAmount.toFixed(2)} in credits
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mb: 2, fontStyle: 'italic' }}>
                    * Only Twitter, Facebook, WhatsApp & TikTok count toward rewards
                  </Typography>
                  <Box sx={{ 
                    width: '100%', 
                    height: 8, 
                    bgcolor: 'grey.300', 
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      width: `${((3 - sharesUntilReward) / 3) * 100}%`, 
                      height: '100%', 
                      bgcolor: 'primary.main',
                      transition: 'width 0.3s ease'
                    }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                    {sharesRequired - sharesUntilReward} of {sharesRequired} shares completed
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SocialShare;

