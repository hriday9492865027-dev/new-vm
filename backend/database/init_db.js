const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initializeDatabase() {
    console.log('🔄 Initializing PostgreSQL database "vm"...');
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf-8');

        // Execute SQL script
        await pool.query(sql);

        console.log('✅ Database Schema successfully executed!');

        // Verify tables
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log('\n📊 Created Tables in "vm" database:');
        res.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. 📁 ${row.table_name}`);
        });

        console.log('\n✨ Database is ready to use!');
    } catch (err) {
        console.error('❌ Error initializing database:', err.message);
        console.log('\n💡 Tip: Please make sure PostgreSQL service is running and credentials in .env are correct.');
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
