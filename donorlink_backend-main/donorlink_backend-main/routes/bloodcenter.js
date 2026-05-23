import express from 'express';
import auth from '../middleware/Auth.js';
import permit from '../middleware/Permit.js';
import BloodCenter from '../models/BloodCenter.js';
import { Types, Error } from 'mongoose';

const bloodCenterRouter = express.Router();

bloodCenterRouter.post('/', auth, permit(['admin']), async (req, res, next) => {
  try {
    const { name, address, phone, coordinates, operatingHours } =
      req.body || {};

    if (
      coordinates &&
      (typeof coordinates.latitude !== 'number' ||
        typeof coordinates.longitude !== 'number')
    ) {
      res.status(400).send({ error: 'Invalid coordinates format' });
      return;
    }

    if (operatingHours) {
      const validDays = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      const isValid = validDays.every((day) => {
        const dayHours = operatingHours[day];
        return (
          !dayHours ||
          (typeof dayHours.open === 'string' &&
            typeof dayHours.close === 'string')
        );
      });

      if (!isValid) {
        res.status(400).send({ error: 'Invalid operating hours format' });
        return;
      }
    }

    const bloodCenter = new BloodCenter({
      name,
      address,
      phone,
      coordinates,
      operatingHours,
    });

    await bloodCenter.save();
    res.status(201).send(bloodCenter);
  } catch (e) {
    if (e instanceof Error.ValidationError) {
      res.status(422).send({ error: e });
      return;
    }
    next(e);
  }
});

bloodCenterRouter.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bloodCenters = await BloodCenter.find()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await BloodCenter.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.status(200).send({
      bloodCenters,
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

bloodCenterRouter.get('/:id', async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).send({ error: 'Invalid ID format' });
      return;
    }

    const bloodCenter = await BloodCenter.findById(req.params.id);

    if (!bloodCenter) {
      res.status(404).send({ error: 'Blood center not found' });
      return;
    }

    res.status(200).send(bloodCenter);
  } catch (e) {
    next(e);
  }
});

bloodCenterRouter.put(
  '/:id',
  auth,
  permit(['admin']),
  async (req, res, next) => {
    try {
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).send({ error: 'Invalid ID format' });
        return;
      }

      if (Object.keys(req.body).length === 0) {
        res.status(400).send({ error: 'No fields to update' });
        return;
      }

      const {
        name,
        address,
        phone,
        coordinates,
        operatingHours,
        currentDonorCount,
      } = req.body;
      const updateData = {};

      if (
        coordinates &&
        (typeof coordinates.latitude !== 'number' ||
          typeof coordinates.longitude !== 'number')
      ) {
        res.status(400).send({ error: 'Invalid coordinates format' });
        return;
      }

      if (operatingHours) {
        const validDays = [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ];
        const isValid = validDays.every((day) => {
          const dayHours = operatingHours[day];
          return (
            !dayHours ||
            (typeof dayHours.open === 'string' &&
              typeof dayHours.close === 'string')
          );
        });

        if (!isValid) {
          res.status(400).send({ error: 'Invalid operating hours format' });
          return;
        }
      }

      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (phone !== undefined) updateData.phone = phone;
      if (currentDonorCount !== undefined)
        updateData.currentDonorCount = currentDonorCount;

      const bloodCenter = await BloodCenter.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!bloodCenter) {
        res.status(404).send({ error: 'Blood center not found' });
        return;
      }

      res.status(200).send(bloodCenter);
    } catch (e) {
      if (e instanceof Error.ValidationError) {
        res.status(422).send({ error: e });
        return;
      }
      next(e);
    }
  }
);

bloodCenterRouter.patch(
  '/:id/archive',
  auth,
  permit(['admin']),
  async (req, res, next) => {
    try {
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).send({ error: 'Invalid ID format' });
        return;
      }

      const bloodCenter = await BloodCenter.findById(req.params.id);
      if (!bloodCenter) {
        res.status(404).send({ error: 'Blood center not found' });
        return;
      }

      const updated = await BloodCenter.findByIdAndUpdate(
        req.params.id,
        { archived: !bloodCenter.archived },
        { new: true }
      );

      res.status(200).send({
        message: updated.archived
          ? 'Blood center archived successfully'
          : 'Blood center unarchived successfully',
        bloodCenter: updated,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default bloodCenterRouter;

const bloodCenterSchemas = {
  Coordinates: {
    type: 'object',
    properties: {
      latitude: { type: 'number' },
      longitude: { type: 'number' },
    },
    example: {
      latitude: 40.712776,
      longitude: -74.005974,
    },
  },

  OperatingHours: {
    type: 'object',
    description: 'Opening hours by day (optional structure)',
    additionalProperties: {
      monday: { open: 'string', close: 'string' },
      tuesday: { open: 'string', close: 'string' },
      wednesday: { open: 'string', close: 'string' },
      thursday: { open: 'string', close: 'string' },
      friday: { open: 'string', close: 'string' },
      saturday: { open: 'string', close: 'string' },
      sunday: { open: 'string', close: 'string' },
    },
    example: {
      monday: { open: '08:00', close: '16:00' },
      tuesday: { open: '08:00', close: '16:00' },
      wednesday: { open: '08:00', close: '16:00' },
      thursday: { open: '10:00', close: '18:00' },
      friday: { open: '08:00', close: '14:00' },
    },
  },

  BloodCenter: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string' },
      coordinates: { $ref: '#/components/schemas/Coordinates' },
      operatingHours: { $ref: '#/components/schemas/OperatingHours' },
      archived: { type: 'boolean' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
    example: {
      _id: '64b7f9cfd3a4f12b34567890',
      name: 'Central Blood Donation Center',
      address: '123 Main St, Springfield',
      phone: '+1-555-123-4567',
      coordinates: { latitude: 40.712776, longitude: -74.005974 },
      operatingHours: {
        monday: { open: '08:00', close: '16:00' },
        tuesday: { open: '08:00', close: '16:00' },
        wednesday: { open: '08:00', close: '16:00' },
      },
      archived: false,
      createdAt: '2024-01-15T09:30:00.000Z',
      updatedAt: '2024-06-01T12:00:00.000Z',
    },
  },

  BloodCenterCreate: {
    type: 'object',
    required: ['name', 'address', 'phone', 'coordinates'],
    properties: {
      name: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string' },
      coordinates: { $ref: '#/components/schemas/Coordinates' },
      operatingHours: { $ref: '#/components/schemas/OperatingHours' },
    },
    example: {
      name: 'Central Blood Donation Center',
      address: '123 Main St, Springfield',
      phone: '+1-555-123-4567',
      coordinates: { latitude: 40.712776, longitude: -74.005974 },
      operatingHours: {
        monday: { open: '08:00', close: '16:00' },
        tuesday: { open: '08:00', close: '16:00' },
      },
    },
  },

  BloodCenterUpdate: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string' },
      coordinates: { $ref: '#/components/schemas/Coordinates' },
      operatingHours: { $ref: '#/components/schemas/OperatingHours' },
      currentDonorCount: { type: 'number' },
    },
    example: {
      name: 'Central Blood Donation Center - West Wing',
      phone: '+1-555-987-6543',
      currentDonorCount: 12,
      operatingHours: {
        thursday: { open: '10:00', close: '18:00' },
        friday: { open: '08:00', close: '14:00' },
      },
    },
  },
};
export { bloodCenterSchemas };

/**
 * @swagger
 * /api/blood-centers:
 *   post:
 *     summary: Create a new blood center (admin only)
 *     security:
 *       - BearerAuth: []
 *     tags: [Blood Centers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BloodCenterCreate'
 *     responses:
 *       201:
 *         description: Blood center created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BloodCenter'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/blood-centers:
 *   get:
 *     summary: Get paginated list of blood centers
 *     security:
 *       - BearerAuth: []
 *     tags: [Blood Centers]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of blood centers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bloodCenters:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BloodCenter'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 */

/**
 * @swagger
 * /api/blood-centers/{id}:
 *   get:
 *     summary: Get blood center by ID
 *     security:
 *       - BearerAuth: []
 *     tags: [Blood Centers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BloodCenter'
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Blood center not found
 */

/**
 * @swagger
 * /api/blood-centers/{id}:
 *   put:
 *     summary: Update blood center by ID (admin only)
 *     security:
 *       - BearerAuth: []
 *     tags: [Blood Centers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BloodCenterUpdate'
 *     responses:
 *       200:
 *         description: Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BloodCenter'
 *       400:
 *         description: Invalid request or ID
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Blood center not found
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/blood-centers/{id}/archive:
 *   patch:
 *     summary: Archive or unarchive blood center (admin only)
 *     security:
 *       - BearerAuth: []
 *     tags: [Blood Centers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archive status toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bloodCenter:
 *                   $ref: '#/components/schemas/BloodCenter'
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Blood center not found
 */
