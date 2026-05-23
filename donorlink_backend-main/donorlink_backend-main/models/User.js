import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { BLOOD_TYPES, USER_ROLES, USER_STATUS } from '../constants.js';

const SALT_WORK_FACTOR = 10;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [5, 'Password must be at least 5 characters long'],
    },
    roles: {
      type: [String],
      enum: USER_ROLES,
      default: ['user'],
      validate: {
        validator: (v) => Array.isArray(v) && new Set(v).size === v.length,
        message: 'Roles must be unique',
      },
    },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    dateOfBirth: { type: Date, required: true },
    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUS,
      default: 'active',
    },
    medicalHistory: { type: String },
    donationCount: { type: Number, default: 0 },
    lastDonationDate: { type: Date },
    address: { type: String, required: true },
  },
  { versionKey: false, timestamps: true }
);

UserSchema.methods.checkPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.toggleBan = function () {
  if (this.roles.includes('admin')) throw new Error('Cannot ban an admin');
  this.status = this.status === 'banned' ? 'active' : 'banned';
  return this.save();
};

UserSchema.methods.toggleAdmin = function () {
  if (this.status === 'banned' && !this.roles.includes('admin')) {
    throw new Error('Cannot grant admin role to a banned user');
  }
  if (this.roles.includes('admin')) {
    this.roles = this.roles.filter((role) => role !== 'admin');
  } else {
    this.roles.push('admin');
  }
  return this.save();
};

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = model('User', UserSchema);

export default User;
