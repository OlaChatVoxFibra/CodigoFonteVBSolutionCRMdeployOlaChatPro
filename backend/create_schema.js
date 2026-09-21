const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('Connecting to database...');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('DB:', process.env.DB_NAME);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS public;');
    console.log('Schema public created.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

run();