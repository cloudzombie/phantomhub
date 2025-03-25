'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Add indexes to payloads table
      await queryInterface.addIndex('payloads', ['userId'], {
        name: 'payloads_userId_idx'
      });
    } catch (error) {
      console.log('payloads_userId_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('payloads', ['name'], {
        name: 'payloads_name_idx'
      });
    } catch (error) {
      console.log('payloads_name_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('payloads', ['createdAt'], {
        name: 'payloads_createdAt_idx'
      });
    } catch (error) {
      console.log('payloads_createdAt_idx may already exist:', error.message);
    }

    // Add indexes to deployments table
    try {
      await queryInterface.addIndex('deployments', ['userId'], {
        name: 'deployments_userId_idx'
      });
    } catch (error) {
      console.log('deployments_userId_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('deployments', ['deviceId'], {
        name: 'deployments_deviceId_idx'
      });
    } catch (error) {
      console.log('deployments_deviceId_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('deployments', ['payloadId'], {
        name: 'deployments_payloadId_idx'
      });
    } catch (error) {
      console.log('deployments_payloadId_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('deployments', ['status'], {
        name: 'deployments_status_idx'
      });
    } catch (error) {
      console.log('deployments_status_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('deployments', ['createdAt'], {
        name: 'deployments_createdAt_idx'
      });
    } catch (error) {
      console.log('deployments_createdAt_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('deployments', ['userId', 'status'], {
        name: 'deployments_userId_status_idx'
      });
    } catch (error) {
      console.log('deployments_userId_status_idx may already exist:', error.message);
    }

    // Add index to user_settings table if it doesn't already have one
    try {
      await queryInterface.addIndex('user_settings', ['userId'], {
        name: 'user_settings_userId_idx',
        unique: true
      });
    } catch (error) {
      console.log('user_settings_userId_idx may already exist:', error.message);
    }

    // Add additional indexes to scripts table
    try {
      await queryInterface.addIndex('scripts', ['name'], {
        name: 'scripts_name_idx'
      });
    } catch (error) {
      console.log('scripts_name_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('scripts', ['isPublic'], {
        name: 'scripts_isPublic_idx'
      });
    } catch (error) {
      console.log('scripts_isPublic_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('scripts', ['createdAt'], {
        name: 'scripts_createdAt_idx'
      });
    } catch (error) {
      console.log('scripts_createdAt_idx may already exist:', error.message);
    }
    
    try {
      await queryInterface.addIndex('scripts', ['isPublic', 'userId'], {
        name: 'scripts_access_pattern_idx'
      });
    } catch (error) {
      console.log('scripts_access_pattern_idx may already exist:', error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes from payloads table
    try {
      await queryInterface.removeIndex('payloads', 'payloads_userId_idx');
    } catch (error) {
      console.log('Error removing payloads_userId_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('payloads', 'payloads_name_idx');
    } catch (error) {
      console.log('Error removing payloads_name_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('payloads', 'payloads_createdAt_idx');
    } catch (error) {
      console.log('Error removing payloads_createdAt_idx:', error.message);
    }
    
    // Remove indexes from deployments table
    try {
      await queryInterface.removeIndex('deployments', 'deployments_userId_idx');
    } catch (error) {
      console.log('Error removing deployments_userId_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('deployments', 'deployments_deviceId_idx');
    } catch (error) {
      console.log('Error removing deployments_deviceId_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('deployments', 'deployments_payloadId_idx');
    } catch (error) {
      console.log('Error removing deployments_payloadId_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('deployments', 'deployments_status_idx');
    } catch (error) {
      console.log('Error removing deployments_status_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('deployments', 'deployments_createdAt_idx');
    } catch (error) {
      console.log('Error removing deployments_createdAt_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('deployments', 'deployments_userId_status_idx');
    } catch (error) {
      console.log('Error removing deployments_userId_status_idx:', error.message);
    }
    
    // Remove index from user_settings table
    try {
      await queryInterface.removeIndex('user_settings', 'user_settings_userId_idx');
    } catch (error) {
      console.log('Error removing user_settings_userId_idx:', error.message);
    }
    
    // Remove additional indexes from scripts table
    try {
      await queryInterface.removeIndex('scripts', 'scripts_name_idx');
    } catch (error) {
      console.log('Error removing scripts_name_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('scripts', 'scripts_isPublic_idx');
    } catch (error) {
      console.log('Error removing scripts_isPublic_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('scripts', 'scripts_createdAt_idx');
    } catch (error) {
      console.log('Error removing scripts_createdAt_idx:', error.message);
    }
    
    try {
      await queryInterface.removeIndex('scripts', 'scripts_access_pattern_idx');
    } catch (error) {
      console.log('Error removing scripts_access_pattern_idx:', error.message);
    }
  }
};
