// Migration to add missing tables and columns

const { DataTypes } = require('sequelize');

exports.up = async (queryInterface) => {
  // 1. Add role column to users table
  await queryInterface.addColumn('users', 'role', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  });

  // 2. Add isActive column to users table
  await queryInterface.addColumn('users', 'is_active', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  });

  // 3. Add lastLogin column to users table
  await queryInterface.addColumn('users', 'last_login', {
    type: DataTypes.DATE,
    allowNull: true
  });

  // 4. Create audit_logs table
  await queryInterface.createTable('audit_logs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  // 5. Create scripts table
  await queryInterface.createTable('scripts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'duckyscript'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });
};

exports.down = async (queryInterface) => {
  // Remove scripts table
  await queryInterface.dropTable('scripts');
  
  // Remove audit_logs table
  await queryInterface.dropTable('audit_logs');
  
  // Remove columns from users table
  await queryInterface.removeColumn('users', 'last_login');
  await queryInterface.removeColumn('users', 'is_active');
  await queryInterface.removeColumn('users', 'role');
};
