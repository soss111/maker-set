const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create database file path
const dbPath = path.join(__dirname, '../database/makerset.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

function setupDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Setting up MakerLab Sets Management Database with SQLite...');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('Creating tables and indexes...');
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error creating schema:', err);
        reject(err);
        return;
      }

      // Read seed file
      const seedPath = path.join(__dirname, '../database/seed-sqlite.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');

      // Execute seed data
      console.log('Inserting seed data...');
      db.exec(seed, (err) => {
        if (err) {
          console.error('Error inserting seed data:', err);
          reject(err);
          return;
        }

        // Try to read views file (optional)
        const viewsPath = path.join(__dirname, '../database/views.sql');
        if (fs.existsSync(viewsPath)) {
          const views = fs.readFileSync(viewsPath, 'utf8');
          
          // Execute views and functions
          console.log('Creating views and functions...');
          db.exec(views, (err) => {
            if (err) {
              console.error('Error creating views:', err);
              reject(err);
              return;
            }

            console.log('Database setup completed successfully!');
            db.close();
            resolve();
          });
        } else {
          console.log('No views file found, skipping...');
          console.log('Database setup completed successfully!');
          db.close();
          resolve();
        }
      });
    });
  });
}

setupDatabase().catch((error) => {
  console.error('Error setting up database:', error);
  process.exit(1);
});
