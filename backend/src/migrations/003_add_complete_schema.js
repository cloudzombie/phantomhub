/**
 * Comprehensive migration to add all missing tables and fields
 * 
 * This migration will:
 * 1. Add missing columns to existing tables (users, etc.)
 * 2. Create all missing tables (activities, commands, scripts, payload_scripts)
 * 3. Ensure all relationships between tables are properly established
 */

const { DataTypes } = require('sequelize');

exports.up = async (queryInterface) => {
  try {
    // First, let's check what columns exist in the users table
    const userTableInfo = await queryInterface.describeTable('users');
    
    // 1. Add missing columns to users table
    const userColumnsToAdd = {};
    
    if (!userTableInfo.role) {
      userColumnsToAdd.role = {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user'
      };
    }
    
    if (!userTableInfo.is_active) {
      userColumnsToAdd.is_active = {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      };
    }
    
    if (!userTableInfo.last_login) {
      userColumnsToAdd.last_login = {
        type: DataTypes.DATE,
        allowNull: true
      };
    }
    
    if (!userTableInfo.failed_login_attempts) {
      userColumnsToAdd.failed_login_attempts = {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      };
    }
    
    if (!userTableInfo.last_failed_login) {
      userColumnsToAdd.last_failed_login = {
        type: DataTypes.DATE,
        allowNull: true
      };
    }
    
    if (!userTableInfo.password_last_changed) {
      userColumnsToAdd.password_last_changed = {
        type: DataTypes.DATE,
        allowNull: true
      };
    }
    
    if (!userTableInfo.password_history) {
      userColumnsToAdd.password_history = {
        type: DataTypes.JSONB,
        allowNull: true
      };
    }
    
    if (!userTableInfo.mfa_enabled) {
      userColumnsToAdd.mfa_enabled = {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      };
    }
    
    if (!userTableInfo.mfa_secret) {
      userColumnsToAdd.mfa_secret = {
        type: DataTypes.STRING,
        allowNull: true
      };
    }
    
    if (!userTableInfo.session_timeout) {
      userColumnsToAdd.session_timeout = {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3600 // 1 hour in seconds
      };
    }
    
    if (!userTableInfo.require_password_change) {
      userColumnsToAdd.require_password_change = {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      };
    }
    
    // Add all missing columns to users table
    for (const [columnName, columnDefinition] of Object.entries(userColumnsToAdd)) {
      await queryInterface.addColumn('users', columnName, columnDefinition);
    }
    
    // 2. Create the activities table
    await queryInterface.createTable('activities', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
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
    
    // 3. Create the commands table
    await queryInterface.createTable('commands', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      result: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
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
    
    // 4. Create the scripts table
    await queryInterface.createTable('scripts', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
        defaultValue: 'callback',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      is_public: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      endpoint: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      callback_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      last_executed: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      execution_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    
    // 5. Create the payload_scripts junction table
    await queryInterface.createTable('payload_scripts', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      script_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'scripts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      execution_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    
    // 6. Create audit_logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      ip_address: {
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
    
    console.log('Successfully added all missing tables and columns');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

exports.down = async (queryInterface) => {
  try {
    // Drop tables in reverse order (to handle foreign key constraints)
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('payload_scripts');
    await queryInterface.dropTable('scripts');
    await queryInterface.dropTable('commands');
    await queryInterface.dropTable('activities');
    
    // Remove columns from users table
    await queryInterface.removeColumn('users', 'require_password_change');
    await queryInterface.removeColumn('users', 'session_timeout');
    await queryInterface.removeColumn('users', 'mfa_secret');
    await queryInterface.removeColumn('users', 'mfa_enabled');
    await queryInterface.removeColumn('users', 'password_history');
    await queryInterface.removeColumn('users', 'password_last_changed');
    await queryInterface.removeColumn('users', 'last_failed_login');
    await queryInterface.removeColumn('users', 'failed_login_attempts');
    await queryInterface.removeColumn('users', 'last_login');
    await queryInterface.removeColumn('users', 'is_active');
    await queryInterface.removeColumn('users', 'role');
    
    console.log('Successfully rolled back all changes');
  } catch (error) {
    console.error('Rollback error:', error);
    throw error;
  }
};
