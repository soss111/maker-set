const fs = require('fs');
const path = require('path');
const db = require('./models/database');

async function fixMediaFilePaths() {
  console.log('🔧 Fixing media file paths...');
  
  try {
    const client = await db.getConnection().connect();
    
    // Get all media files with absolute paths
    const result = await client.query(`
      SELECT media_id, file_path, file_name 
      FROM media_files 
      WHERE file_path LIKE '/%' OR file_path LIKE 'C:%'
    `);
    
    console.log(`Found ${result.rows.length} files with absolute paths to fix`);
    
    for (const row of result.rows) {
      try {
        // Convert absolute path to relative path
        const absolutePath = row.file_path;
        const fileName = path.basename(absolutePath);
        const relativePath = `uploads/${fileName}`;
        
        // Check if file exists
        const fullPath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(fullPath)) {
          // Update the database with relative path
          await client.query(
            'UPDATE media_files SET file_path = $1 WHERE media_id = $2',
            [relativePath, row.media_id]
          );
          
          console.log(`✅ Fixed: ${row.file_name} -> ${relativePath}`);
        } else {
          console.log(`❌ File not found: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Error fixing ${row.file_name}:`, error.message);
      }
    }
    
    await client.release();
    console.log('✅ Media file paths fixed!');
    
  } catch (error) {
    console.error('Error fixing media file paths:', error);
  }
}

// Run the fix
fixMediaFilePaths().then(() => {
  console.log('🎉 Fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('Fix failed:', error);
  process.exit(1);
});
