-- Update Admin User Credentials
-- Run this SQL script to change admin credentials

-- First, generate a new password hash for your new password
-- You can use online bcrypt generators or Node.js to create the hash
-- Example: For password "YourNewSecurePassword123!"

-- Update admin email and password
UPDATE users 
SET 
    email = 'your-new-admin@yourcompany.com',
    password_hash = '$2b$10$YourNewBcryptHashHere',
    first_name = 'Your',
    last_name = 'Name',
    company_name = 'Your Company',
    updated_at = NOW()
WHERE email = 'admin@makerset.com';

-- Verify the update
SELECT user_id, email, first_name, last_name, company_name, role 
FROM users 
WHERE role = 'admin';
