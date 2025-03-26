// Migration index file - this combines all migrations in proper order
// This approach avoids TypeScript declaration conflicts between migration files

const { DataTypes } = require('sequelize');

exports.migrations = [
  // 000_create_migration_table.js
  {
    name: '000_create_migration_table.js',
    up: async (queryInterface) => {
      await queryInterface.createTable('SequelizeMeta', {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          primaryKey: true
        }
      });
    },
    down: async (queryInterface) => {
      await queryInterface.dropTable('SequelizeMeta');
    }
  },
  
  // 001_initial_schema.js
  {
    name: '001_initial_schema.js',
    up: async (queryInterface) => {
      // Create Users table
      await queryInterface.createTable('users', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      // Create Devices table
      await queryInterface.createTable('devices', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('online', 'offline', 'error'),
          allowNull: false,
          defaultValue: 'offline',
        },
        last_seen: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      // Create Payloads table
      await queryInterface.createTable('payloads', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      // Create Deployments table
      await queryInterface.createTable('deployments', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        device_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'devices',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        payload_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'payloads',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        status: {
          type: DataTypes.ENUM('pending', 'running', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'pending',
        },
        result: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      // Create UserSettings table
      await queryInterface.createTable('user_settings', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        settings: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
    },

    down: async (queryInterface) => {
      await queryInterface.dropTable('user_settings');
      await queryInterface.dropTable('deployments');
      await queryInterface.dropTable('payloads');
      await queryInterface.dropTable('devices');
      await queryInterface.dropTable('users');
    }
  },
  
  // 002_add_missing_tables.js
  {
    name: '002_add_missing_tables.js',
    up: require('./002_add_missing_tables').up,
    down: require('./002_add_missing_tables').down
  },
  
  // 003_add_complete_schema.js
  {
    name: '003_add_complete_schema.js',
    up: require('./003_add_complete_schema').up,
    down: require('./003_add_complete_schema').down
  }
  
  // Add any new migrations here...
];
