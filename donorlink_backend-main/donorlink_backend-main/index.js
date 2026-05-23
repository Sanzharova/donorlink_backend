import { configDotenv } from 'dotenv';
configDotenv({ path: '.env' });
import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import donationsRouter from './routes/donations.js';
import bloodCenterRouter from './routes/bloodcenter.js';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { setupSwagger } from './swagger.js';
import config from './config.js';

const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/blood-centers', bloodCenterRouter);

setupSwagger(app);

const run = async () => {
  try {
    await mongoose.connect(config.mongoose.db);
    console.log('MongoDB connected');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

run();
