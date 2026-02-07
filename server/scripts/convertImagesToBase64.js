const fs = require('fs');
const path = require('path');
const db = require('../models/database');

async function convertExistingImagesToBase64() {
  try {
    console.log('🔄 Starting conversion of existing images to base64...');
    
    // Initialize database connection
    await db.getConnection();
    console.log('✅ Database connected');
    
    // Get all media files that don't have base64 data yet
    const query = `
      SELECT media_id, file_name, file_path, mime_type 
      FROM media_files 
      WHERE file_type = 'image' AND base64_image IS NULL
    `;
    
    const result = await db.query(query);
    console.log(`📸 Found ${result.rows.length} images to convert`);
    
    for (const media of result.rows) {
      try {
        const fullPath = path.join(__dirname, media.file_path);
        
        if (fs.existsSync(fullPath)) {
          console.log(`🔄 Converting: ${media.file_name}`);
          
          // Read the image file
          const imageBuffer = fs.readFileSync(fullPath);
          const base64Image = `data:${media.mime_type};base64,${imageBuffer.toString('base64')}`;
          
          // Update the database
          const updateQuery = `
            UPDATE media_files 
            SET base64_image = $1 
            WHERE media_id = $2
          `;
          
          await db.query(updateQuery, [base64Image, media.media_id]);
          
          console.log(`✅ Converted: ${media.file_name} (${base64Image.length} chars)`);
        } else {
          console.log(`⚠️  File not found: ${fullPath}`);
        }
      } catch (error) {
        console.error(`❌ Error converting ${media.file_name}:`, error.message);
      }
    }
    
    console.log('🎉 Conversion completed!');
    
    // Verify the conversion
    const verifyQuery = `
      SELECT COUNT(*) as total_images,
             COUNT(base64_image) as images_with_base64
      FROM media_files 
      WHERE file_type = 'image'
    `;
    
    const verifyResult = await db.query(verifyQuery);
    console.log('📊 Conversion results:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
  } finally {
    process.exit(0);
  }
}

convertExistingImagesToBase64();
