const express = require('express');
const router = express.Router();
const db = require('../models/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PhotoProcessor = require('../utils/photoProcessor');

function getBaseUrl(req) {
  return (req && req.app && req.app.get('baseUrl')) || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Upload media file
router.post('/upload', upload.single('media'), async(req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { set_id, part_id, media_category = 'product_photo', description, alt_text } = req.body;

    const photoProcessor = new PhotoProcessor();

    let finalFilePath = req.file.path;
    let finalFileSize = req.file.size;
    let finalMimeType = req.file.mimetype;
    let processingResult = null;

    // Process image files with resizing and watermarking
    if (req.file.mimetype.startsWith('image/')) {
      console.log('Processing image file:', req.file.originalname);
      
      // Validate image
      const isValidImage = await photoProcessor.validateImage(req.file.path);
      if (!isValidImage) {
        throw new Error('Invalid image file');
      }

      // Generate processed filename
      const processedFileName = `processed-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
      const processedFilePath = path.join(path.dirname(req.file.path), processedFileName);

      // Process the image
      try {
        processingResult = await photoProcessor.processPhoto(req.file.path, processedFilePath, {
          maxWidth: 1200, // Optimal width for MakerLab store cards
          maxHeight: 800, // Optimal height maintaining 3:2 aspect ratio
          quality: 92, // High quality for better display
          watermarkText: 'MakerLab Sets',
          watermarkOpacity: 0.15, // Subtle watermark
          format: 'jpeg'
        });
      } catch (watermarkError) {
        console.warn('Watermarking failed, processing without watermark:', watermarkError.message);
        // Try processing without watermark
        processingResult = await photoProcessor.processPhoto(req.file.path, processedFilePath, {
          maxWidth: 1200, // Optimal width for MakerLab store cards
          maxHeight: 800, // Optimal height maintaining 3:2 aspect ratio
          quality: 92, // High quality for better display
          watermarkText: null, // Disable watermark
          watermarkOpacity: 0,
          format: 'jpeg'
        });
      }

      // Generate multiple thumbnail sizes optimized for MakerLab store
      const thumbnailSizes = [
        { name: 'thumb-small', size: 300 }, // For grid view cards
        { name: 'thumb-medium', size: 500 }, // For detailed view
        { name: 'thumb-large', size: 800 }  // For zoom/full view
      ];
      
      const thumbnailResults = {};
      for (const thumb of thumbnailSizes) {
        const thumbnailFileName = `${thumb.name}-${processedFileName}`;
        const thumbnailFilePath = path.join(path.dirname(req.file.path), thumbnailFileName);
        thumbnailResults[thumb.name] = await photoProcessor.generateThumbnail(processedFilePath, thumbnailFilePath, thumb.size);
      }
      
      console.log('Image processing completed:', {
        original: {
          size: req.file.size,
          path: req.file.path
        },
        processed: {
          size: processingResult.processedSize,
          path: processedFilePath,
          compressionRatio: processingResult.compressionRatio
        },
        thumbnails: thumbnailResults
      });

      // Update file references
      finalFilePath = processedFilePath;
      finalFileSize = processingResult.processedSize;
      finalMimeType = 'image/jpeg';

      // Clean up original file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Insert media file record with relative path for web serving
    const mediaQuery = `
      INSERT INTO media_files (file_name, file_path, file_type, mime_type, file_size_bytes, media_category, set_id, part_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Determine file type based on MIME type
    const fileType = finalMimeType.startsWith('image/') ? 'image' : 'document';

    // Convert absolute path to relative path for web serving
    const relativePath = path.relative(path.join(__dirname, '..'), finalFilePath);

    const mediaResult = await db.run(mediaQuery, [
      path.basename(finalFilePath),
      relativePath,
      fileType,
      finalMimeType,
      finalFileSize,
      media_category,
      set_id || null,
      part_id || null
    ]);

    const mediaId = mediaResult.lastID;

    // Link media to set if set_id provided
    if (set_id) {
      const setMediaQuery = `
        INSERT INTO set_media (set_id, media_id, media_category, display_order, is_featured)
        VALUES (?, ?, ?, 1, 1)
      `;

      await db.run(setMediaQuery, [set_id, mediaId, media_category]);
    }

    // Handle master photo replacement if needed
    if (part_id && media_category === 'master_photo') {
      // Check if this is a master photo and if one already exists
      const existingMasterQuery = `
        SELECT media_id FROM media_files 
        WHERE part_id = ? AND media_category = 'master_photo' AND is_featured = 1 AND media_id != ?
      `;
      const existingResult = await db.query(existingMasterQuery, [part_id, mediaId]);
      
      if (existingResult.rows.length > 0) {
        // Delete existing master photo
        const deleteQuery = `
          DELETE FROM media_files 
          WHERE part_id = ? AND media_category = 'master_photo' AND is_featured = 1 AND media_id != ?
        `;
        await db.query(deleteQuery, [part_id, mediaId]);
      }

      // Mark this as the featured master photo
      const updateFeaturedQuery = `
        UPDATE media_files 
        SET is_featured = 1, display_order = 1
        WHERE media_id = ?
      `;
      await db.query(updateFeaturedQuery, [mediaId]);
    }

    const baseUrl = getBaseUrl(req);
    const response = {
      message: 'File uploaded successfully',
      media_id: mediaId,
      file_path: finalFilePath,
      file_url: `${baseUrl}/uploads/${path.basename(relativePath)}`,
      original_filename: req.file.originalname,
      file_size: finalFileSize,
      mime_type: finalMimeType
    };

    // Add processing information for images
    if (processingResult) {
      response.processing = {
        original_size: req.file.size,
        processed_size: processingResult.processedSize,
        compression_ratio: `${processingResult.compressionRatio}%`,
        original_dimensions: processingResult.originalDimensions,
        processed_dimensions: processingResult.processedDimensions,
        watermark_applied: processingResult.watermarkApplied || false,
        thumbnail_generated: true
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get media for a set (uses only columns that exist in base schema; returns [] if tables missing)
router.get('/set/:setId', async(req, res) => {
  try {
    const { setId } = req.params;

    const query = `
      SELECT 
        mf.media_id,
        mf.file_name,
        mf.file_path,
        mf.file_type,
        mf.mime_type,
        mf.file_size_bytes,
        sm.media_category,
        sm.display_order,
        sm.is_featured
      FROM set_media sm
      JOIN media_files mf ON sm.media_id = mf.media_id
      WHERE sm.set_id = ?
      ORDER BY sm.is_featured DESC, sm.display_order, mf.media_id
    `;

    const result = await db.query(query, [setId]);
    const rows = result.rows || [];

    const baseUrl = getBaseUrl(req);
    const media = rows.map(row => ({
      ...row,
      file_url: row.file_path ? `${baseUrl}/uploads/${path.basename(row.file_path)}` : null,
      created_at: row.created_at ?? null,
      description: row.description ?? null,
      alt_text: row.alt_text ?? null
    }));

    res.json(media);
  } catch (error) {
    console.error('Error fetching set media:', error.message || error);
    // Return empty array so client doesn't break when set_media/media_files missing or schema differs
    res.json([]);
  }
});

// Delete media
router.delete('/:mediaId', async(req, res) => {
  try {
    const { mediaId } = req.params;

    // Get media file info before deletion
    const mediaQuery = 'SELECT file_path FROM media_files WHERE media_id = ?';
    const mediaResult = await db.query(mediaQuery, [mediaId]);

    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = mediaResult.rows[0].file_path;
    const fullPath = path.join(__dirname, '..', filePath);

    // Delete from database
    await db.run('DELETE FROM set_media WHERE media_id = ?', [mediaId]);
    await db.run('DELETE FROM media_files WHERE media_id = ?', [mediaId]);

    // Delete physical file
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ message: 'Media deleted successfully' });

  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// Toggle featured status for a media item
router.patch('/:mediaId/featured', async(req, res) => {
  try {
    const { mediaId } = req.params;
    const { is_featured } = req.body;

    const updateQuery = `
      UPDATE set_media 
      SET is_featured = ? 
      WHERE media_id = ?
    `;

    await db.query(updateQuery, [is_featured ? 1 : 0, mediaId]);

    // Get updated info
    const resultQuery = `
      SELECT sm.media_id, sm.set_id, sm.is_featured 
      FROM set_media sm 
      WHERE sm.media_id = ?
    `;
    const result = await db.query(resultQuery, [mediaId]);

    res.json({
      media_id: parseInt(mediaId),
      set_id: result.rows[0].set_id,
      is_featured: result.rows[0].is_featured
    });

  } catch (error) {
    console.error('Error updating featured status:', error);
    res.status(500).json({ error: 'Failed to update featured status' });
  }
});

// Update media translations
router.patch('/:mediaId/translations', async(req, res) => {
  try {
    const { mediaId } = req.params;
    const { description, alt_text } = req.body;

    // Check if translation exists
    const checkQuery = 'SELECT * FROM media_translations WHERE media_id = ? AND language_id = (SELECT language_id FROM languages WHERE language_code = ?)';
    const existing = await db.query(checkQuery, [mediaId, 'en']);

    if (existing.rows.length > 0) {
      // Update existing translation
      const updateQuery = `
        UPDATE media_translations 
        SET description = ?, alt_text = ? 
        WHERE media_id = ? AND language_id = (SELECT language_id FROM languages WHERE language_code = ?)
      `;
      await db.query(updateQuery, [description || '', alt_text || '', mediaId, 'en']);
      res.json({ message: 'Media translations updated successfully' });
    } else {
      // Create new translation
      const languageId = await db.query('SELECT language_id FROM languages WHERE language_code = ?', ['en']);
      const insertQuery = `
        INSERT INTO media_translations (media_id, language_id, description, alt_text)
        VALUES (?, ?, ?, ?)
      `;
      const result = await db.query(insertQuery, [mediaId, languageId.rows[0].language_id, description || '', alt_text || '']);
      res.json({ message: 'Media translations created successfully', translation: result.rows[0] });
    }
  } catch (error) {
    console.error('Error updating media translations:', error);
    res.status(500).json({ error: 'Failed to update media translations' });
  }
});

// Get photos for a specific part
router.get('/part/:partId', async (req, res) => {
  try {
    const { partId } = req.params;
    
    const query = `
      SELECT 
        mf.media_id,
        mf.file_name,
        mf.file_path,
        mf.file_type,
        mf.mime_type,
        mf.file_size_bytes,
        mf.created_at,
        mf.media_category,
        mf.is_featured as is_primary,
        mf.display_order as sort_order,
        mf.description,
        mf.alt_text
      FROM media_files mf
      WHERE mf.part_id = ?
      ORDER BY mf.is_featured DESC, mf.display_order, mf.created_at DESC
    `;
    
    const result = await db.query(query, [partId]);
    
    const photos = result.rows.map(row => ({
      media_id: row.media_id,
      file_name: row.file_name,
      file_path: row.file_path,
      file_type: row.file_type,
      mime_type: row.mime_type,
      file_size_bytes: row.file_size_bytes,
      created_at: row.created_at,
      media_category: row.media_category,
      is_primary: row.is_primary,
      sort_order: row.sort_order,
      file_url: `${getBaseUrl(req)}/uploads/${path.basename(row.file_path)}`,
      description: row.description,
      alt_text: row.alt_text
    }));

    res.json({ photos });
  } catch (error) {
    console.error('Error fetching part photos:', error);
    res.status(500).json({ error: 'Failed to fetch part photos' });
  }
});

module.exports = router;