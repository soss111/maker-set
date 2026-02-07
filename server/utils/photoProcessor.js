const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Photo processing utility for MakerLab Sets
 * Handles resizing, watermarking, and format optimization
 */

class PhotoProcessor {
  constructor() {
    this.maxWidth = 1200;
    this.maxHeight = 800;
    this.quality = 85;
    this.watermarkText = 'MakerLab Sets';
    this.watermarkOpacity = 0.3;
  }

  /**
   * Process uploaded photo with resizing and watermarking
   * @param {string} inputPath - Path to the original image
   * @param {string} outputPath - Path where processed image will be saved
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result with metadata
   */
  async processPhoto(inputPath, outputPath, options = {}) {
    try {
      const {
        maxWidth = this.maxWidth,
        maxHeight = this.maxHeight,
        quality = this.quality,
        watermarkText = this.watermarkText,
        watermarkOpacity = this.watermarkOpacity,
        format = 'jpeg'
      } = options;

      // Get original image metadata
      const originalMetadata = await sharp(inputPath).metadata();
      console.log('Original image metadata:', {
        width: originalMetadata.width,
        height: originalMetadata.height,
        format: originalMetadata.format,
        size: originalMetadata.size
      });

      // Create the base image processor
      let processor = sharp(inputPath);

      // Auto-rotate based on EXIF data to prevent unwanted rotation
      processor = processor.rotate();

      // Resize image while maintaining aspect ratio and ensuring optimal dimensions for MakerLab store
      processor = processor.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for better display
      });

      // Add watermark BEFORE format conversion to avoid dimension issues (if watermark text provided)
      if (watermarkText && watermarkText.trim() !== '') {
        processor = await this.addWatermark(processor, watermarkText, watermarkOpacity);
      }

      // Apply format conversion and quality settings AFTER watermarking
      if (format === 'jpeg') {
        processor = processor.jpeg({ 
          quality: quality,
          progressive: true,
          mozjpeg: true
        });
      } else if (format === 'png') {
        processor = processor.png({ 
          quality: quality,
          progressive: true
        });
      } else if (format === 'webp') {
        processor = processor.webp({ 
          quality: quality
        });
      }

      // Process and save the image
      await processor.toFile(outputPath);

      // Get processed image metadata
      const processedMetadata = await sharp(outputPath).metadata();
      const processedFileSize = fs.statSync(outputPath).size;
      
      console.log('Processed image metadata:', {
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format,
        size: processedFileSize
      });

      return {
        success: true,
        originalSize: originalMetadata.size || fs.statSync(inputPath).size,
        processedSize: processedFileSize,
        originalDimensions: {
          width: originalMetadata.width,
          height: originalMetadata.height
        },
        processedDimensions: {
          width: processedMetadata.width,
          height: processedMetadata.height
        },
        compressionRatio: (((originalMetadata.size || fs.statSync(inputPath).size) - processedFileSize) / (originalMetadata.size || fs.statSync(inputPath).size) * 100).toFixed(2),
        watermarkApplied: watermarkText && watermarkText.trim() !== '',
        outputPath: outputPath
      };

    } catch (error) {
      console.error('Error processing photo:', error);
      throw new Error(`Photo processing failed: ${error.message}`);
    }
  }

  /**
   * Add watermark to image using Sharp's text overlay
   * @param {Object} processor - Sharp processor instance
   * @param {string} text - Watermark text
   * @param {number} opacity - Watermark opacity (0-1)
   * @returns {Promise<Object>} Processor with watermark
   */
  async addWatermark(processor, text, opacity) {
    try {
      // Get image dimensions from the processor
      const metadata = await processor.metadata();
      const { width, height } = metadata;

      console.log('Adding watermark to image:', { width, height });

      // Calculate watermark size based on image dimensions
      const fontSize = Math.max(24, Math.min(width, height) * 0.05);
      const padding = fontSize * 0.5;

      // Create a simple text overlay using Sharp's built-in capabilities
      // We'll create a temporary SVG with just the text
      const textSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.4"/>
            </filter>
          </defs>
          <text 
            x="350" 
            y="80" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="white" 
            text-anchor="end" 
            dominant-baseline="baseline"
            opacity="${opacity}"
            filter="url(#shadow)"
            stroke="rgba(0,0,0,0.3)"
            stroke-width="1"
          >
            ${text}
          </text>
        </svg>
      `;

      // Convert SVG to buffer
      const watermarkBuffer = Buffer.from(textSvg);
      
      // Apply watermark positioned at bottom-right
      return processor.composite([
        {
          input: watermarkBuffer,
          top: height - 100, // Position at bottom
          left: width - 400, // Position at right
          blend: 'over'
        }
      ]);

    } catch (error) {
      console.error('Error adding watermark:', error);
      // Return original processor if watermarking fails
      return processor;
    }
  }

  /**
   * Generate thumbnail for image
   * @param {string} inputPath - Path to the original image
   * @param {string} outputPath - Path where thumbnail will be saved
   * @param {number} size - Thumbnail size (square)
   * @returns {Promise<Object>} Thumbnail result
   */
  async generateThumbnail(inputPath, outputPath, size = 300) {
    try {
      // Get original image metadata to calculate proper aspect ratio
      const metadata = await sharp(inputPath).metadata();
      
      // Calculate thumbnail dimensions maintaining aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      let thumbWidth, thumbHeight;
      
      if (aspectRatio > 1) {
        // Landscape - use width as base
        thumbWidth = size;
        thumbHeight = Math.round(size / aspectRatio);
      } else {
        // Portrait or square - use height as base
        thumbHeight = size;
        thumbWidth = Math.round(size * aspectRatio);
      }

      await sharp(inputPath)
        .rotate() // Auto-rotate based on EXIF data to prevent unwanted rotation
        .resize(thumbWidth, thumbHeight, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ 
          quality: 90,
          progressive: true,
          mozjpeg: true
        })
        .toFile(outputPath);

      const thumbnailMetadata = await sharp(outputPath).metadata();
      
      return {
        success: true,
        size: thumbnailMetadata.size,
        dimensions: {
          width: thumbnailMetadata.width,
          height: thumbnailMetadata.height
        },
        outputPath: outputPath
      };

    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Validate image for MakerLab store requirements
   * @param {string} inputPath - Path to the image file
   * @returns {Promise<Object>} Validation result
   */
  async validateImageForMakerLab(inputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      const validation = {
        isValid: true,
        issues: [],
        recommendations: []
      };

      // Check minimum dimensions
      if (metadata.width < 400 || metadata.height < 300) {
        validation.issues.push('Image too small - minimum 400x300px recommended');
        validation.recommendations.push('Use higher resolution images for better quality');
      }

      // Check aspect ratio (prefer 3:2 or 4:3)
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio < 1.2 || aspectRatio > 2.0) {
        validation.recommendations.push('Consider cropping to 3:2 or 4:3 aspect ratio for best display');
      }

      // Check file size
      const stats = await fs.promises.stat(inputPath);
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        validation.issues.push('File too large - will be compressed');
        validation.recommendations.push('Consider reducing file size before upload');
      }

      // Check format
      if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
        validation.issues.push('Unsupported format - will be converted to JPEG');
      }

      validation.isValid = validation.issues.length === 0;
      
      return validation;
    } catch (error) {
      return {
        isValid: false,
        issues: ['Invalid image file'],
        recommendations: ['Please upload a valid image file (JPEG, PNG, WebP)']
      };
    }
  }

  /**
   * Get optimal format for image
   * @param {string} inputPath - Path to the image
   * @returns {Promise<string>} Recommended format
   */
  async getOptimalFormat(inputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      // For photos, prefer JPEG
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        return 'jpeg';
      }
      
      // For images with transparency, use PNG
      if (metadata.hasAlpha) {
        return 'png';
      }
      
      // For modern browsers, WebP is great
      return 'webp';
      
    } catch (error) {
      console.error('Error determining optimal format:', error);
      return 'jpeg'; // Default fallback
    }
  }

  /**
   * Validate image file
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} Is valid image
   */
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.width > 0 && metadata.height > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = PhotoProcessor;
