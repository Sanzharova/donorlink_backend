import express from 'express';
import { configDotenv } from 'dotenv';
import User from '../models/User.js';
import { Error } from 'mongoose';
import verifyRefreshToken from '../middleware/VerifyRefreshToken.js';
import jwt from 'jsonwebtoken';
import config from '../config.js';

configDotenv();

const authRouter = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS, {
    expiresIn: `${config.JwtAccessExpiresAt}m`,
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH, {
    expiresIn: `${config.JwtRefreshExpiresAt}h`,
  });

  return { accessToken, refreshToken };
};

authRouter.post('/register', async (req, res, next) => {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      gender,
      dateOfBirth,
      bloodType,
      address,
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).send({ error: 'This email is already taken.' });
      return;
    }

    const user = new User({
      email,
      password,
      fullName,
      phone,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      bloodType,
      address,
    });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: config.JwtRefreshExpiresAt * 60 * 60 * 1000, // Convert hours to milliseconds
    });

    res.status(201).send({ accessToken, user });
  } catch (e) {
    if (e instanceof Error.ValidationError) {
      res.status(422).send({ error: e });
      return;
    }
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).send({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.checkPassword(password))) {
      res.status(401).send({ error: 'Invalid email or password' });
      return;
    }
    const { accessToken, refreshToken } = generateTokens(user._id);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: config.JwtRefreshExpiresAt * 60 * 60 * 1000, // Convert hours to milliseconds
    });

    res.status(200).send({ accessToken, user });
  } catch (e) {
    if (e instanceof Error.ValidationError) {
      res.status(422).send({ error: e });
      return;
    }
    next(e);
  }
});

authRouter.post('/refresh', verifyRefreshToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(401).send({ error: 'User not found' });
      return;
    }
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: config.JwtRefreshExpiresAt * 60 * 60 * 1000, // Convert hours to milliseconds
    });
    res.status(200).send({ accessToken, user });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', verifyRefreshToken, async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
    });
    res.status(200).send({ message: 'Logged out successfully' });
  } catch (e) {
    next(e);
  }
});

export default authRouter;

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phone
 *               - gender
 *               - dateOfBirth
 *               - bloodType
 *               - address
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: "+996555123123"
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1995-05-12"
 *               bloodType:
 *                 type: string
 *                 example: "A+"
 *               address:
 *                 type: string
 *                 example: "Bishkek, Kyrgyzstan"
 *               medicalHistory:
 *                 type: string
 *                 example: "No chronic diseases"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5..."
 *                 user:
 *                   $ref: "#/components/schemas/User"
 *       400:
 *         description: Email already exists
 *       422:
 *         description: Validation error
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   $ref: "#/components/schemas/User"
 *       401:
 *         description: Invalid email or password
 */

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   $ref: "#/components/schemas/User"
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
