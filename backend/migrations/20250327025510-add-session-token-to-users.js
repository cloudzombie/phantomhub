'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add session_token column to users table
     * This allows persistent token storage on the server side
     */
    await queryInterface.addColumn('users', 'session_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Remove session_token column from users table
     */
    await queryInterface.removeColumn('users', 'session_token');
  }
};
