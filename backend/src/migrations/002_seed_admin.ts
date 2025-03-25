import { QueryInterface } from 'sequelize';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminId = uuidv4();

  // Create admin user
  await queryInterface.bulkInsert('users', [{
    id: adminId,
    name: 'Admin User',
    email: 'admin@phantomhub.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  // Create default settings for admin
  await queryInterface.bulkInsert('user_settings', [{
    id: uuidv4(),
    userId: adminId,
    theme: 'dark',
    notificationSettings: JSON.stringify({
      deviceStatus: true,
      deploymentAlerts: true,
      systemUpdates: true,
      securityAlerts: true,
    }),
    apiSettings: JSON.stringify({
      endpoint: 'http://localhost:5001/api',
      pollingInterval: 60,
      timeout: 30,
    }),
    displaySettings: JSON.stringify({
      compactView: false,
      showAdvancedOptions: true,
      dateFormat: 'MM/DD/YYYY',
    }),
    securitySettings: JSON.stringify({
      autoLogout: 30,
      requireConfirmation: true,
    }),
    createdAt: new Date(),
    updatedAt: new Date()
  }]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('user_settings', {});
  await queryInterface.bulkDelete('users', {});
} 