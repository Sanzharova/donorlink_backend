import express from 'express';
import auth from '../middleware/Auth.js';
import permit from '../middleware/Permit.js';
import Donation from '../models/Donation.js';
import { DONATION_STATUS } from '../constants.js';
import { Error, Types } from 'mongoose';

const donationsRouter = express.Router();

donationsRouter.post('/', auth, async (req, res, next) => {
  try {
    const { scheduledFor, centerId, notes } = req.body;

    if (!Types.ObjectId.isValid(centerId)) {
      res.status(400).send({ error: 'Invalid blood center id' });
      return;
    }

    const BloodCenter = (await import('../models/BloodCenter.js')).default;
    const center = await BloodCenter.findById(centerId);
    if (!center) {
      res.status(400).send({ error: 'Invalid blood center id' });
      return;
    }
    if (center.archived) {
      res.status(400).send({ error: 'Blood center is not available' });
      return;
    }

    const donation = new Donation({
      userId: req.user._id,
      status: 'requested',
      scheduledFor,
      centerId,
      notes,
    });

    await donation.save();
    res.status(201).send(donation);
  } catch (e) {
    if (e instanceof Error.ValidationError) {
      res.status(422).send({ error: e });
      return;
    }
    next(e);
  }
});

donationsRouter.get('/my-donations', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const donations = await Donation.find({ userId: req.user._id })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments({ userId: req.user._id });
    const totalPages = Math.ceil(total / limit);

    res.status(200).send({
      donations,
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

donationsRouter.get('/:id', auth, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const donation = await Donation.findById(req.params.id)
      .populate('userId', 'fullName bloodType')
      .populate('centerId', 'name address');

    if (!donation) {
      res.status(404).send({ error: 'Donation not found' });
      return;
    }

    if (
      req.user.roles.includes('admin') ||
      donation.userId._id.toString() === req.user._id.toString()
    ) {
      res.status(200).send(donation);
    } else {
      res
        .status(403)
        .send({ error: 'You do not have permission to view this donation' });
    }
  } catch (error) {
    next(error);
  }
});

donationsRouter.get('/', auth, permit(['admin']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const donations = await Donation.find()
      .populate('userId', 'fullName bloodType')
      .populate('centerId', 'name address')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.status(200).send({
      donations,
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

donationsRouter.put('/:id', auth, permit(['admin']), async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).send({ error: 'Invalid ID format' });
      return;
    }
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      res.status(404).send({ error: 'Donation not found' });
      return;
    }

    if (donation.status === 'completed') {
      res.status(400).send({ error: 'Completed donation cannot be modified' });
      return;
    }

    const { status, scheduledFor, notes, centerId } = req.body;
    const updateData = {};

    const BloodCenter = (await import('../models/BloodCenter.js')).default;
    const center = await BloodCenter.findById(centerId);
    if (!center) {
      res.status(400).send({ error: 'Invalid blood center id' });
      return;
    }
    if (center.archived) {
      res.status(400).send({ error: 'Blood center is not available' });
      return;
    }

    if (status !== undefined) {
      if (!DONATION_STATUS.includes(status)) {
        res.status(400).send({
          error:
            'Invalid status. Must be one of: requested, confirmed, completed, canceled',
        });
        return;
      }
      updateData.status = status;

      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (centerId !== undefined) {
      updateData.centerId = centerId;
    }

    donation.set(updateData);
    await donation.save();

    if (status === 'completed') {
      const User = (await import('../models/User.js')).default;
      await User.findByIdAndUpdate(donation.userId.toString(), {
        $inc: { donationCount: 1 },
        $set: { lastDonationDate: new Date() },
      });
    }

    res.status(200).send(donation);
  } catch (e) {
    if (e instanceof Error.ValidationError) {
      res.status(422).send({ error: e });
      return;
    }
    next(e);
  }
});

export default donationsRouter;

/**
 * @openapi
 * /api/donations:
 *   post:
 *     summary: Create a new blood donation request
 *     tags: [Donations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledFor
 *               - centerId
 *             properties:
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-20T10:30:00.000Z"
 *               centerId:
 *                 type: string
 *                 example: "6740e12321cc9b0012efabcd"
 *               notes:
 *                 type: string
 *                 example: "Feeling well."
 *     responses:
 *       201:
 *         description: Donation created successfully (status will be set to "requested")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Donation"
 *       400:
 *         description: Invalid blood center id or blood center is not available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid blood center id"
 *       401:
 *         description: Unauthorized — authentication required
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 */

/**
 * @openapi
 * /api/donations/my-donations:
 *   get:
 *     summary: Get authenticated user's donation records
 *     tags: [Donations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of user's donations with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 donations:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Donation"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 */

/**
 * @openapi
 * /api/donations/{id}:
 *   get:
 *     summary: Get a donation by ID
 *     tags: [Donations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Donation ID
 *     responses:
 *       200:
 *         description: Donation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Donation"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid ID format
 *       403:
 *         description: You do not have permission to view this donation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: You do not have permission to view this donation
 *       404:
 *         description: Donation not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Donation not found
 */

/**
 * @openapi
 * /api/donations:
 *   get:
 *     summary: Get all donations (admin only)
 *     tags: [Donations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of donations with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 donations:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Donation"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       403:
 *         description: Forbidden — Admin only
 */

/**
 * @openapi
 * /api/donations/{id}:
 *   put:
 *     summary: Update a donation (admin only)
 *     tags: [Donations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Donation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["requested", "confirmed", "completed", "canceled"]
 *                 example: "confirmed"
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-04-10T09:00:00.000Z"
 *               notes:
 *                 type: string
 *                 example: "Rescheduled due to donor request."
 *               centerId:
 *                 type: string
 *                 example: "6740e12321cc9b0012efabcd"
 *     responses:
 *       200:
 *         description: Donation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Donation"
 *       400:
 *         description: Invalid status or donation already completed or invalid ID format or invalid blood center id or blood center is not available
 *       404:
 *         description: Donation not found
 *       422:
 *         description: Validation error
 */
