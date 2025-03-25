const { Sequelize } = require('sequelize');

// Database configuration (from backend/src/config/database.ts)
const sequelize = new Sequelize('phantomhub', 'joshuafisher', '', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function updateUserRole() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Update the user role
    const result = await sequelize.query(
      `UPDATE "Users" SET role = 'operator' WHERE email = 'zombie.hunter.patriot@gmail.com'`
    );
    
    console.log('Update result:', result);
    console.log('User role updated successfully');
    
    await sequelize.close();
  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

updateUserRole(); 