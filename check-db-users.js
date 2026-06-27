const { Client } = require('pg');

async function checkUsers() {
    const client = new Client({
        connectionString: 'postgresql://postgres:YdqhGZHhiWUKygTiwmiIIzanJtCJymjp@zephyr.proxy.rlwy.net:31986/railway',
        connectionTimeoutMillis: 10000
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully to Railway');
        
        // Count users
        const countRes = await client.query('SELECT COUNT(*) FROM users');
        console.log('👤 Total users in database:', countRes.rows[0].count);
        
        // List recent users (emails and names, no password hashes for safety)
        const usersRes = await client.query('SELECT id, email, full_name, user_type, created_at FROM users ORDER BY created_at DESC LIMIT 10');
        console.log('📋 Recent users:');
        usersRes.rows.forEach(u => {
            console.log(`   - ID: ${u.id}, Name: ${u.full_name}, Email: ${u.email}, Type: ${u.user_type}, Created: ${u.created_at}`);
        });

        // Count crop registrations
        const regCountRes = await client.query('SELECT COUNT(*) FROM farmers_registrations');
        console.log('🌾 Total crop registrations in database:', regCountRes.rows[0].count);
        
    } catch (error) {
        console.error('❌ Error querying database:', error.message);
    } finally {
        await client.end();
    }
}

checkUsers();
