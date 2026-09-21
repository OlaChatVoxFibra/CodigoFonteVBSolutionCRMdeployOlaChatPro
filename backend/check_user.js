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

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco remoto.');

    const [users] = await sequelize.query(`
      SELECT id, name, email, profile, "companyId" 
      FROM "Users" 
      WHERE email = 'suporte@wwti.com.br'
    `);

    if (users.length > 0) {
        console.log('Usuário encontrado:', users[0]);
    } else {
        console.log('Usuário suporte@wwti.com.br NÃO encontrado.');
    }

    const [companies] = await sequelize.query(`SELECT * FROM "Companies"`);
    console.log('Empresas encontradas:', companies.length);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await sequelize.close();
  }
}

checkUser();