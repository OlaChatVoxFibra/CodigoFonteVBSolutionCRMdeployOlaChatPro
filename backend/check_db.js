
const { Sequelize, DataTypes } = require('sequelize');
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

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const [results, metadata] = await sequelize.query("SELECT * FROM \"Users\"");
    console.log('Users found:', results.length);
    results.forEach(u => console.log(`User: ${u.email}, ID: ${u.id}`));
    
    const [metaResults] = await sequelize.query("SELECT * FROM \"SequelizeMeta\"");
    console.log('Migrations count:', metaResults.length);

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

check();
