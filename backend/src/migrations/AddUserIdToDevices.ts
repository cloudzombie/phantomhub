import { QueryInterface, DataTypes } from 'sequelize';

interface User {
  id: number;
  role: string;
}

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // First add the column without NOT NULL constraint
    await queryInterface.addColumn('devices', 'userId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Find the first admin user to assign as default owner
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role = 'Administrator' LIMIT 1;`
    );
    
    const adminUsers = users[0] as User[];
    
    if (adminUsers.length > 0) {
      // Assign all existing devices to the admin user
      await queryInterface.sequelize.query(
        `UPDATE devices SET "userId" = ${adminUsers[0].id} WHERE "userId" IS NULL;`
      );
    } else {
      // If no admin is found, find any user
      const anyUserResult = await queryInterface.sequelize.query(
        `SELECT id FROM users LIMIT 1;`
      );
      
      const anyUsers = anyUserResult[0] as User[];
      
      if (anyUsers.length > 0) {
        await queryInterface.sequelize.query(
          `UPDATE devices SET "userId" = ${anyUsers[0].id} WHERE "userId" IS NULL;`
        );
      } else {
        console.warn('No users found to associate with existing devices. Devices will need manual association.');
      }
    }

    // Then change the column to NOT NULL
    await queryInterface.changeColumn('devices', 'userId', {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('devices', 'userId');
  }
}; 