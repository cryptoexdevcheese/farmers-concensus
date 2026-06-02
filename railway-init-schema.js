const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 30000
    });

    try {
        console.log('🔄 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');

        // Check if tables already exist
        const existingTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log(`📊 Existing tables: ${existingTables.rows.length}`);
        if (existingTables.rows.length > 0) {
            console.log('Tables already exist, skipping schema creation');
            existingTables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
            return;
        }

        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔄 Executing schema...');
        await client.query(schema);
        console.log('✅ Schema executed successfully');
        
        // Verify tables were created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('📊 Tables created:', result.rows.length);
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        console.log('✅ Database initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
