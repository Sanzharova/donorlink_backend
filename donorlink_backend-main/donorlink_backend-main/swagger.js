import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { bloodCenterSchemas } from './routes/bloodcenter.js';

export const setupSwagger = (app) => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'DonorLink API',
        version: '1.0.0',
        description: 'API documentation for the DonorLink application',
      },
      servers: [
        {
          url: 'http://localhost:8000',
          description: 'Local server',
        },
        {
          url: process.env.PRODUCTION_URL || '',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '6740b1a4f1c8c2d9b7a12345' },
              email: { type: 'string', example: 'user@example.com' },
              roles: {
                type: 'array',
                items: { type: 'string' },
                example: ['user'],
              },
              fullName: { type: 'string', example: 'John Doe' },
              phone: { type: 'string', example: '+996555123123' },
              gender: {
                type: 'string',
                enum: ['male', 'female'],
                example: 'male',
              },
              dateOfBirth: {
                type: 'string',
                format: 'date',
                example: '1995-04-13',
              },
              bloodType: { type: 'string', example: 'A+' },
              status: {
                type: 'string',
                enum: ['active', 'banned'],
                example: 'active',
              },
              medicalHistory: {
                type: 'string',
                nullable: true,
                example: 'No known allergies',
              },
              donationCount: { type: 'number', example: 3 },
              lastDonationDate: {
                type: 'string',
                format: 'date',
                nullable: true,
                example: '2024-05-20',
              },
              address: { type: 'string', example: 'Bishkek, Kyrgyzstan' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-10T12:00:00.000Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-12T09:30:00.000Z',
              },
            },
          },
          UserUpdate: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
              },
              fullName: {
                type: 'string',
              },
              phone: {
                type: 'string',
              },
              gender: {
                type: 'string',
                enum: ['male', 'female'],
              },
              dateOfBirth: {
                type: 'string',
                format: 'date',
              },
              bloodType: {
                type: 'string',
              },
              address: {
                type: 'string',
              },
              medicalHistory: {
                type: 'string',
              },
            },
          },
          Donation: {
            type: 'object',
            properties: {
              _id: {
                type: 'string',
                example: '6740d9f2c28a9f0012a45678',
              },
              userId: {
                type: 'string',
                description: 'ID of the user making the donation',
                example: '673fe7a2a56d8c8a9c123456',
              },
              status: {
                type: 'string',
                enum: ['requested', 'scheduled', 'completed', 'cancelled'],
                example: 'requested',
              },
              scheduledFor: {
                type: 'string',
                format: 'date-time',
                example: '2025-01-20T10:30:00.000Z',
              },
              completedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: '2025-01-21T12:45:00.000Z',
              },
              centerId: {
                type: 'string',
                description: 'Blood center where donation is scheduled',
                example: '6740e12321cc9b0012efabcd',
              },
              notes: {
                type: 'string',
                maxLength: 1000,
                example: 'Feeling healthy. No recent medications.',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-12-01T08:15:00.000Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-12-02T09:20:00.000Z',
              },
            },
          },
          ...bloodCenterSchemas,
        },
      },
    },
    apis: ['./routes/*.js'], // Route files with @openapi comments
  };

  const swaggerSpec = swaggerJSDoc(options);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
