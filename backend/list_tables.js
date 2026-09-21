const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
  }
);

async function listTables() {
  console.log('Starting connection test...');
  try {
    console.log('Authenticating...');
    await sequelize.authenticate();
    console.log('Authenticated! Querying tables...');
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables found:', results.length);
    console.log('Table list:', results.map(r => r.table_name).join(', '));
    
    // Check SequelizeMeta
    const [meta] = await sequelize.query('SELECT * FROM "SequelizeMeta"');
    console.log('Migrations executed:', meta.length);
    
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await sequelize.close();
    console.log('Connection closed.');
  }
}

listTables();