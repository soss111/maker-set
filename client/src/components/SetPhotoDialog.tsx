import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { mediaApi, Set as SetType, Media } from '../services/api';

interface SetPhotoDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSet: SetType | null;
  onSetUpdated?: () => void;
}

const SetPhotoDialog: React.FC<SetPhotoDialogProps> = ({
  open,
  onClose,
  selectedSet,
  onSetUpdated,
}) => {
  const [setMedia, setSetMedia] = useState<Media[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fetchSetMedia = async (setId: number) => {
    try {
      console.log('Fetching media for set ID:', setId);
      const response = await mediaApi.getBySetId(setId);
      console.log('Media API response:', response.data);
      
      // Filter out PDFs and only keep images for photo dialog
      const imageMedia = response.data.filter((media: any) => 
        media.file_type === 'image' || 
        media.mime_type?.startsWith('image/') ||
        (media.file_name && media.file_name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/))
      );
      
      setSetMedia(imageMedia);
      console.log('setMedia state updated with filtered images:', imageMedia);
    } catch (err) {
      console.error('Error fetching set media:', err);
    }
  };

  useEffect(() => {
    if (open && selectedSet) {
      fetchSetMedia(selectedSet.set_id);
    }
  }, [open, selectedSet]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      setUploadError('Please select a valid image file');
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile || !selectedSet) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const uploadResponse = await mediaApi.upload(
        selectedFile,
        selectedSet.set_id,
        undefined, // partId
        'photo', // mediaCategory
        `Photo for ${selectedSet.name}`, // description
        'Set photo' // altText
      );

      console.log('Upload successful:', uploadResponse.data);
      setUploadSuccess('Photo uploaded successfully!');
      setSelectedFile(null);
      
      // Refresh the media list
      await fetchSetMedia(selectedSet.set_id);
      
      // Notify parent component to refresh set data
      if (onSetUpdated) {
        onSetUpdated();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setUploadError(`Failed to upload photo: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (mediaId: number) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await mediaApi.delete(mediaId);
        setUploadSuccess('Photo deleted successfully!');
        
        if (selectedSet) {
          await fetchSetMedia(selectedSet.set_id);
          
          // Notify parent component to refresh set data
          if (onSetUpdated) {
            onSetUpdated();
          }
        }
        
        setTimeout(() => setUploadSuccess(null), 3000);
      } catch (err: any) {
        console.error('Error deleting photo:', err);
        setUploadError(`Failed to delete photo: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
      }
    }
  };

  const handleEditPhoto = async (mediaId: number) => {
    const media = setMedia.find(m => m.media_id === mediaId);
    if (!media) return;

    const newDescription = window.prompt('Edit photo description:', media.description || '');
    if (newDescription === null) return;

    const newAltText = window.prompt('Edit alt text:', media.alt_text || '');
    if (newAltText === null) return;

    try {
      // Update media translations
      await mediaApi.updateTranslations(mediaId, {
        description: newDescription,
        alt_text: newAltText
      });

      setUploadSuccess('Photo updated successfully!');
      
      if (selectedSet) {
        await fetchSetMedia(selectedSet.set_id);
      }
      
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating photo:', err);
      setUploadError(`Failed to update photo: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    }
  };

  const handleToggleMasterPhoto = async (mediaId: number, isFeatured: boolean) => {
    try {
      await mediaApi.setFeatured(mediaId, isFeatured);
      
      if (selectedSet) {
        await fetchSetMedia(selectedSet.set_id);
      }
      
      setUploadSuccess(isFeatured ? 'Photo marked as master photo!' : 'Master photo status removed!');
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating master photo status:', err);
      setUploadError(`Failed to update master photo: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    }
  };

  const handleClose = () => {
    // Clean up object URL if it exists
    if (selectedFile) {
      URL.revokeObjectURL(URL.createObjectURL(selectedFile));
    }
    onClose();
    setSetMedia([]);
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Manage Photos for {selectedSet?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="photo-upload-input"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="photo-upload-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{ mb: 2 }}
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </label>

          {selectedFile && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Selected: {selectedFile.name}
              </Typography>
              <Button
                variant="contained"
                onClick={handleUploadPhoto}
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : undefined}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
            </Box>
          )}

          {uploadSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUploadSuccess(null)}>
              {uploadSuccess}
            </Alert>
          )}

          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}

          {setMedia.length > 0 ? (
            <ImageList cols={3} gap={16}>
              {setMedia.map((media, index) => (
                <ImageListItem key={media.media_id}>
                  <Box sx={{ position: 'relative' }}>
                    {media.file_type === 'image' || media.mime_type?.startsWith('image/') ? (
                      <img
                        src={media.file_url}
                        alt={media.alt_text || media.file_name}
                        style={{
                          width: '100%',
                          height: '250px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          backgroundColor: '#f5f5f5'
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          console.error('Image error:', media.file_url);
                          const img = e.currentTarget;
                          img.style.display = 'none';
                          
                          // Create a more robust fallback
                          const container = img.parentNode as HTMLElement;
                          if (container && !container.querySelector('.image-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'image-fallback';
                            fallback.style.cssText = `
                              width: 100%;
                              height: 250px;
                              background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                              border: 2px dashed #ccc;
                              border-radius: 8px;
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              justify-content: center;
                              color: #666;
                              font-size: 14px;
                              text-align: center;
                              padding: 20px;
                              box-sizing: border-box;
                            `;
                            fallback.innerHTML = `
                              <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                              <div style="font-size: 14px; margin-bottom: 4px;">Image failed to load</div>
                              <div style="font-size: 12px; margin-top: 4px; color: #888;">${media.file_name}</div>
                              <div style="font-size: 10px; margin-top: 8px; color: #666;">URL: ${media.file_url}</div>
                            `;
                            container.appendChild(fallback);
                          }
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', media.file_url);
                        }}
                      />
                    ) : (
                      // Document/PDF display
                      <Box sx={{ 
                        position: 'relative',
                        width: '100%',
                        height: '250px',
                        border: '2px dashed #ccc',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: '#e8f4fd',
                          borderColor: '#1976d2'
                        }
                      }}
                      onClick={() => window.open(media.file_url, '_blank')}
                    >
                      <Box sx={{ fontSize: '48px', marginBottom: '16px', opacity: 0.7 }}>
                        {media.mime_type === 'application/pdf' ? '📄' : '📁'}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                        {media.file_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        {media.media_category || 'Document'}
                      </Typography>
                    </Box>
                    )}
                    
                    <ImageListItemBar
                      title={media.description || media.file_name}
                      subtitle={media.alt_text}
                      actionIcon={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            sx={{ 
                              backgroundColor: media.is_featured ? 'rgba(255, 215, 0, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                              color: media.is_featured ? 'white' : 'rgba(255, 255, 255, 0.8)',
                              '&:hover': {
                                backgroundColor: media.is_featured ? 'rgba(255, 100, 100, 0.9)' : 'rgba(255, 215, 0, 0.9)',
                                color: 'white'
                              }
                            }}
                            onClick={() => handleToggleMasterPhoto(media.media_id, !media.is_featured)}
                            aria-label={media.is_featured ? `Remove master photo status` : `Mark as master photo`}
                          >
                            {media.is_featured ? <StarIcon /> : <StarBorderIcon />}
                          </IconButton>
                          <IconButton
                            sx={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: 'rgba(255, 255, 255, 0.8)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 100, 100, 0.9)',
                                color: 'white'
                              }
                            }}
                            onClick={() => handleEditPhoto(media.media_id)}
                            aria-label="Edit photo"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            sx={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: 'rgba(255, 255, 255, 0.8)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 100, 100, 0.9)',
                                color: 'white'
                              }
                            }}
                            onClick={() => handleDeletePhoto(media.media_id)}
                            aria-label="Delete photo"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    />
                  </Box>
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No photos found for this set.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetPhotoDialog;
