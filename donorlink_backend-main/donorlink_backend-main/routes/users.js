import express from 'express';
import { configDotenv } from 'dotenv';
import User from '../models/User.js';
import auth from '../middleware/Auth.js';
import permit from '../middleware/Permit.js';
import { Types } from 'mongoose';

configDotenv();

const usersRouter = express.Router();

usersRouter.get('/:id', auth, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).send({ error: 'Invalid ID format' });
      return;
    }
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      res.status(404).send({ error: 'User not found' });
      return;
    }

    if (
      !req.user ||
      (!req.user.roles.includes('admin') &&
        String(req.user._id) !== String(user._id))
    ) {
      res.status(403).send({ error: 'Forbidden' });
      return;
    }

    res.status(200).send(user);
  } catch (e) {
    next(e);
  }
});

usersRouter.get('/', auth, permit(['admin']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.status(200).send({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (e) {
    next(e);
  }
});

usersRouter.patch(
  '/toggle-ban/:id',
  auth,
  permit(['admin']),
  async (req, res, next) => {
    try {
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).send({ error: 'Invalid ID format' });
        return;
      }
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).send({ error: 'User not found' });
        return;
      }
      const updatedUser = await user.toggleBan();
      res.status(200).send({
        message: `User ${
          updatedUser.status === 'banned' ? 'banned' : 'unbanned'
        } successfully`,
        user: updatedUser,
      });
    } catch (e) {
      res.status(400).send({ error: e.message });
      next(e);
    }
  }
);

usersRouter.put('/:id', auth, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).send({ error: 'Invalid ID format' });
      return;
    }
    const allowed = [
      'email',
      'fullName',
      'phone',
      'gender',
      'dateOfBirth',
      'bloodType',
      'address',
      'medicalHistory',
    ];

    if (
      !req.user ||
      (!req.user.roles.includes('admin') &&
        String(req.user._id) !== String(req.params.id))
    ) {
      res.status(403).send({ error: 'Forbidden' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).send({ error: 'User not found' });
      return;
    }

    if (req.body.email && req.body.email !== user.email) {
      const exists = await User.findOne({ email: req.body.email });
      if (exists) {
        res.status(400).send({ error: 'Email is already taken' });
        return;
      }
    }

    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    const sanitized = user.toObject ? user.toObject() : user;
    if (sanitized.password) delete sanitized.password;

    res.status(200).send(sanitized);
  } catch (e) {
    if (e instanceof Error.ValidationError) {
      res.status(422).send({ error: e });
      return;
    }
    next(e);
  }
});

usersRouter.patch(
  '/toggle-admin/:id',
  auth,
  permit(['admin']),
  async (req, res, next) => {
    try {
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).send({ error: 'Invalid ID format' });
        return;
      }
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).send({ error: 'User not found' });
        return;
      }
      const updatedUser = await user.toggleAdmin();
      res.status(200).send({
        message: `User admin role ${
          updatedUser.roles.includes('admin') ? 'granted' : 'revoked'
        } successfully`,
        user: updatedUser,
      });
    } catch (e) {
      res.status(400).send({ error: e.message });
      next(e);
    }
  }
);

usersRouter.patch('/reset-password/:id', auth, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res
        .status(400)
        .send({ error: 'Old password and new password are required' });
      return;
    }

    if (oldPassword === newPassword) {
      res
        .status(400)
        .send({ error: 'New password must be different from old password' });
      return;
    }

    if (!req.user || String(req.user._id) !== String(req.params.id)) {
      res.status(403).send({ error: 'Forbidden' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).send({ error: 'User not found' });
      return;
    }

    const isPasswordValid = await user.checkPassword(oldPassword);
    if (!isPasswordValid) {
      res.status(401).send({ error: 'Old password is incorrect' });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.status(200).send({ message: 'Password reset successfully' });
  } catch (e) {
    res.status(400).send({ error: e.message });
    next(e);
  }
});

export default usersRouter;

/**
 * @swagger
 * /api/users/reset-password/{id}:
 *   patch:
 *     summary: Reset user password (self)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 description: New password (must be different from old)
 *             required:
 *               - oldPassword
 *               - newPassword
 *           example:
 *             oldPassword: currentPassword123
 *             newPassword: newPassword456
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid ID format, missing fields, or same password
 *       401:
 *         description: Old password is incorrect
 *       403:
 *         description: Forbidden — only self can reset
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid ID format
 *       403:
 *         description: Forbidden — only self or admin can access
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *     responses:
 *       200:
 *         description: List of users with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/users/toggle-ban/{id}:
 *   patch:
 *     summary: Toggle ban/unban for a user (admin only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User ban status toggled
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/users/toggle-admin/{id}:
 *   patch:
 *     summary: Grant or revoke admin role for a user (admin only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User admin role toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid ID format or request error
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update profile (self or admin)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               bloodType:
 *                 type: string
 *               address:
 *                 type: string
 *               medicalHistory:
 *                 type: string
 *           examples:
 *             fullUpdateExample:
 *               summary: Full profile update
 *               value:
 *                 email: john.doe@example.com
 *                 fullName: John Doe
 *                 phone: '1234567890'
 *                 gender: male
 *                 dateOfBirth: '1990-05-15'
 *                 bloodType: O+
 *                 address: 123 Main St, City, Country
 *                 medicalHistory: No major illnesses
 *             partialUpdateExample:
 *               summary: Partial profile update
 *               value:
 *                 fullName: Jane Smith
 *                 phone: '0987654321'
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Email already taken or invalid ID format
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
