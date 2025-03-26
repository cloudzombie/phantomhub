require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Admin user credentials - CHANGE THESE before running!
const ADMIN_EMAIL = 'admin@phantomhub.com';
const ADMIN_PASSWORD = 'securePassword123!'; // Change to a strong password
const ADMIN_NAME = 'System Administrator';

async function createAdminUser() {
  console.log('Connecting to database...');
  
  // Connect to the database using Heroku's DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in environment variables');
    process.exit(1);
  }
  
  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
  
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Define the User model to match your actual database schema with the new columns
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true  // Match the schema in index.js
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
      }
    }, {
      tableName: 'users',
      timestamps: false,  // We're manually handling created_at and updated_at
      underscored: true   // Column names are underscored
    });
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: {
        email: ADMIN_EMAIL
      }
    });
    
    if (existingAdmin) {
      console.log(`Admin user with email ${ADMIN_EMAIL} already exists!`);
      process.exit(0);
    }
    
    // Hash the admin password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    // Create the admin user
    const adminUser = await User.create({
      id: uuidv4(),
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: 'admin',  // Set the role to admin
      is_active: true,
      last_login: null,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log(`Admin user created successfully: ${adminUser.email}`);
    console.log('IMPORTANT: Save these credentials in a secure location!');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

createAdminUser();
