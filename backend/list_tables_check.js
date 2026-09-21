
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: process.env.DB_DIALECT,
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function listTables() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const [results1] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    const [results2] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log('Tables information_schema:', results1.map(r => r.table_name));
    console.log('Tables pg_tables:', results2.map(r => r.tablename));
    
    // Drop SequelizeMeta if it exists and no other tables exist, or just drop it to force migration
    // But if other tables exist, migration might fail if it tries to create them.
    // So if tables exist, we might need to drop them too if we want a fresh migration.
    // The user said "migrate all tables", implying they want the system set up.
    
    if (results1.length > 0 || results2.length > 0) {
        console.log("Database is not empty.");
    } else {
        console.log("Database is empty.");
    }

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

listTables();
