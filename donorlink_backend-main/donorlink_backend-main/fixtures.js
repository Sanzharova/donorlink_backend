import mongoose from 'mongoose';
import config from './config.js';
import User from './models/User.js';
import BloodCenter from './models/BloodCenter.js';
import Donation from './models/Donation.js';

const dropCollection = async (db, collectionName) => {
  try {
    await db.dropCollection(collectionName);
  } catch (_e) {
    console.log(`Collection ${collectionName} was missing, skipping drop....`);
  }
};

const collections = ['users', 'bloodcenters', 'donations'];

const run = async () => {
  try {
    await mongoose.connect(config.mongoose.db);
    const db = mongoose.connection;

    for (const collectionName of collections) {
      await dropCollection(db, collectionName);
    }

    const [user1, user2] = await User.create([
      {
        username: 'adminuser',
        email: 'admin@gmail.com',
        password: 'adminpass',
        roles: ['admin'],
        fullName: 'John Doe',
        phone: '555-1234',
        gender: 'male',
        dateOfBirth: new Date('1990-01-01'),
        bloodType: 'A+',
        medicalHistory: 'No known conditions.',
        lastDonationDate: new Date('2025-11-25'),
        address: '123 Main St, Anytown',
      },
      {
        username: 'regularuser',
        email: 'regular@gmail.com',
        password: 'regularpass',
        roles: ['user'],
        fullName: 'Jane Smith',
        phone: '555-5678',
        gender: 'female',
        dateOfBirth: new Date('1985-05-15'),
        bloodType: 'O-',
        medicalHistory: 'Allergic to penicillin.',
        address: '456 Oak Ave, Sometown',
      },
    ]);

    const [bloodCenter1, bloodCenter2] = await BloodCenter.create([
      {
        name: 'Family medicine center #15',
        address: '1 Sukhe - Baatar St, Bishkek',
        phone: '0312426962',
        coordinates: {
          latitude: 42.82597153514856,
          longitude: 74.62418921818426,
        },
        operatingHours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '10:00', close: '15:00' },
          sunday: { open: 'Closed', close: 'Closed' },
        },
      },
      {
        name: 'Family Medicine Center No. 7',
        address: '3 Тоголок Молдо, Bishkek',
        phone: '0312301067',
        coordinates: {
          latitude: 42.87110975014566,
          longitude: 74.5960968795279,
        },
        operatingHours: {
          monday: { open: '08:00', close: '17:00' },
          tuesday: { open: '08:00', close: '17:00' },
          wednesday: { open: '08:00', close: '17:00' },
          thursday: { open: '08:00', close: '17:00' },
          friday: { open: '08:00', close: '17:00' },
          saturday: { open: 'Closed', close: 'Closed' },
          sunday: { open: 'Closed', close: 'Closed' },
        },
      },
    ]);

    await Donation.create([
      {
        userId: user1._id,
        status: 'completed',
        scheduledFor: new Date('2025-11-25T10:00:00Z'),
        completedAt: new Date('2025-11-25T10:30:00Z'),
        centerId: bloodCenter1._id,
        notes: 'First donation, went well.',
      },
      {
        userId: user2._id,
        status: 'requested',
        scheduledFor: new Date('2025-11-26T10:00:00Z'),
        centerId: bloodCenter2._id,
      },
    ]);

    console.log('Fixture data has been successfully set up.');

    await db.close();
  } catch (e) {
    console.error('Error during fixture setup:', e);
  }
};

void run();
