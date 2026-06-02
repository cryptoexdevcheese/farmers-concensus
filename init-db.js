const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    const client = new Client({
        connectionString: 'postgresql://postgres:YdqhGZHhiWUKygTiwmiIIzanJtCJymjp@zephyr.proxy.rlwy.net:31986/railway'
    });

    try {
        console.log('🔄 Connecting to Railway PostgreSQL...');
        await client.connect();
        console.log('✅ Connected to database');

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
        
        console.log('📊 Tables created:');
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

initializeDatabase().catch(console.error);
