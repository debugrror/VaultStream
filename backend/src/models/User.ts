import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@config/env';

/**
 * User document interface
 */
export interface IUser extends Document {
  userId: string;
  email: string;
  passwordHash: string;
  username: string;
  channelId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): SafeUser;
}

/**
 * Safe user object (without sensitive data)
 */
export interface SafeUser {
  userId: string;
  email: string;
  username: string;
  channelId: string;
  createdAt: Date;
}

/**
 * User schema
 */
const UserSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Don't include by default in queries
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'],
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
      default: function() {
        // Channel ID is username-based for cleaner URLs
        return `${(this as IUser).username}-${uuidv4().split('-')[0]}`;
      },
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

/**
 * Pre-save hook to hash password
 */
UserSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(config.security.bcryptSaltRounds);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Method to compare password
 */
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Method to get safe user object (without sensitive data)
 */
UserSchema.methods.toSafeObject = function(): SafeUser {
  return {
    userId: this.userId,
    email: this.email,
    username: this.username,
    channelId: this.channelId,
    createdAt: this.createdAt,
  };
};

/**
 * Indexes for performance
 */
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ channelId: 1 });
UserSchema.index({ createdAt: -1 });

/**
 * User model
 */
export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
