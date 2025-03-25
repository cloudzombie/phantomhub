'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to users table
    await queryInterface.addColumn('users', 'failedLoginAttempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('users', 'lastFailedLogin', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'passwordLastChanged', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'passwordHistory', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'mfaEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('users', 'mfaSecret', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'sessionTimeout', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 3600, // 1 hour in seconds
    });

    await queryInterface.addColumn('users', 'requirePasswordChange', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Update role enum to include operator
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'operator';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove columns in reverse order
    await queryInterface.removeColumn('users', 'requirePasswordChange');
    await queryInterface.removeColumn('users', 'sessionTimeout');
    await queryInterface.removeColumn('users', 'mfaSecret');
    await queryInterface.removeColumn('users', 'mfaEnabled');
    await queryInterface.removeColumn('users', 'passwordHistory');
    await queryInterface.removeColumn('users', 'passwordLastChanged');
    await queryInterface.removeColumn('users', 'lastFailedLogin');
    await queryInterface.removeColumn('users', 'failedLoginAttempts');

    // Note: Cannot remove enum values in PostgreSQL, would need to recreate the type
  }
}; 