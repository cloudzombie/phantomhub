import { initializeDatabase } from '../config/database';
import User from '../models/User';

async function updateUserRole() {
  try {
    // Get email and role from command line arguments
    const email = process.argv[2];
    const role = process.argv[3];
    
    if (!email || !role) {
      console.error('Usage: node update-user-role.js <email> <role>');
      console.error('Roles: admin, operator, user');
      process.exit(1);
    }
    
    // Validate role
    if (!['admin', 'operator', 'user'].includes(role)) {
      console.error('Invalid role. Use admin, operator, or user');
      process.exit(1);
    }
    
    // Connect to database
    await initializeDatabase();
    console.log(`Updating user ${email} to role ${role}...`);
    
    // Find the user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }
    
    // Update the role
    user.role = role as 'admin' | 'operator' | 'user';
    await user.save();
    
    console.log(`User role updated successfully. User ${email} is now ${role}`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  }
}

updateUserRole(); 