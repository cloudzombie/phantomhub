'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scripts', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('callback', 'exfiltration', 'command', 'custom'),
        allowNull: false,
        defaultValue: 'callback'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      endpoint: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      callbackUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lastExecuted: {
        type: Sequelize.DATE,
        allowNull: true
      },
      executionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Adding indexes
    await queryInterface.addIndex('scripts', ['userId']);
    await queryInterface.addIndex('scripts', ['type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('scripts');
  }
}; 