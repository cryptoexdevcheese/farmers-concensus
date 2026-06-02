const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        connectionString: 'postgresql://postgres:YdqhGZHhiWUKygTiwmiIIzanJtCJymjp@zephyr.proxy.rlwy.net:31986/railway',
        connectionTimeoutMillis: 10000
    });

    try {
        console.log('🔄 Testing connection to Railway PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully');
        
        const result = await client.query('SELECT NOW()');
        console.log('📅 Database time:', result.rows[0].now);
        
        // Check existing tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('📊 Existing tables:', tables.rows.length);
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Connection closed');
    }
}

testConnection().catch(console.error);
