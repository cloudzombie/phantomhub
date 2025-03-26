const { DataTypes } = require('sequelize');

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
const up = async (queryInterface) => {
  await queryInterface.createTable('SequelizeMeta', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true
    }
  });
};

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 */
const down = async (queryInterface) => {
  await queryInterface.dropTable('SequelizeMeta');
};

module.exports = { up, down }; 