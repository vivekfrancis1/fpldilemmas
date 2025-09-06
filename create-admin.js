const bcrypt = require('bcrypt');
const { Pool } = require('@neondatabase/serverless');

async function createAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node create-admin.js <password>');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert or update admin user
    const query = `
      INSERT INTO users (id, email, password, role, "firstName", "lastName", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'fpldilemmas@gmail.com', $1, 'admin', 'FPL', 'Admin', NOW(), NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = $1,
        role = 'admin',
        "updatedAt" = NOW()
      RETURNING id, email, role;
    `;
    
    const result = await pool.query(query, [hashedPassword]);
    
    console.log('✅ Admin user created/updated successfully:');
    console.log('Email:', result.rows[0].email);
    console.log('Role:', result.rows[0].role);
    console.log('ID:', result.rows[0].id);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();