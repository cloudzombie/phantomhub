  /**
 * User Model
 * 
 * Represents a user in the system with proper field mapping
 */

import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

export interface UserAttributes {
  id?: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'operator' | 'user';
  lastLogin?: Date | null;
  isActive: boolean;
  failedLoginAttempts: number;
  lastFailedLogin?: Date | null;
  passwordLastChanged?: Date | null;
  passwordHistory?: string[];
  mfaEnabled: boolean;
  mfaSecret?: string | null;
  sessionTimeout: number;
  requirePasswordChange: boolean;
  sessionToken?: string | null; // Add sessionToken for persistence
  createdAt?: Date;
  updatedAt?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public role!: 'admin' | 'operator' | 'user';
  public lastLogin!: Date | null;
  public isActive!: boolean;
  public failedLoginAttempts!: number;
  public lastFailedLogin!: Date | null;
  public passwordLastChanged!: Date | null;
  public passwordHistory!: string[];
  public mfaEnabled!: boolean;
  public mfaSecret!: string | null;
  public sessionTimeout!: number;
  public requirePasswordChange!: boolean;
  public sessionToken!: string | null; // Add sessionToken for persistence
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to compare password
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Instance method to check password history
  public async isPasswordReused(newPassword: string): Promise<boolean> {
    if (!this.passwordHistory) return false;
    
    for (const oldHash of this.passwordHistory) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return true;
      }
    }
    return false;
  }

  // Instance method to update password
  public async updatePassword(newPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    // Keep last 5 passwords in history
    const history = this.passwordHistory || [];
    history.unshift(this.password);
    if (history.length > 5) history.pop();
    
    this.password = hash;
    this.passwordHistory = history;
    this.passwordLastChanged = new Date();
    this.requirePasswordChange = false;
    
    await this.save();
  }

  // Instance method to handle failed login
  public async handleFailedLogin(): Promise<void> {
    this.failedLoginAttempts += 1;
    this.lastFailedLogin = new Date();
    
    // Lock account after 5 failed attempts
    if (this.failedLoginAttempts >= 5) {
      this.isActive = false;
    }
    
    await this.save();
  }

  // Instance method to reset failed login attempts
  public async resetFailedLogins(): Promise<void> {
    this.failedLoginAttempts = 0;
    this.lastFailedLogin = null;
    await this.save();
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'operator', 'user'),
      allowNull: false,
      defaultValue: 'user',
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'failed_login_attempts',
    },
    lastFailedLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_failed_login',
    },
    passwordLastChanged: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_last_changed',
    },
    passwordHistory: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'password_history',
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'mfa_enabled',
    },
    mfaSecret: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mfa_secret',
    },
    sessionTimeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3600, // 1 hour in seconds
      field: 'session_timeout',
    },
    requirePasswordChange: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'require_password_change',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    // Use underscored instead of camelcase
    underscored: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          user.passwordLastChanged = new Date();
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          user.passwordLastChanged = new Date();
        }
      },
    },
  }
);

export default User; 