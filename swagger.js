const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Attendance System API',
      version: '1.0.0',
      description: 'API untuk sistem absensi dengan face recognition dan validasi lokasi GPS',
      contact: {
        name: 'API Support',
        email: 'support@attendance.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.attendance.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        Face: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Face ID'
            },
            box: {
              type: 'object',
              properties: {
                xMin: {
                  type: 'integer',
                  description: 'X coordinate of top-left corner'
                },
                yMin: {
                  type: 'integer',
                  description: 'Y coordinate of top-left corner'
                },
                xMax: {
                  type: 'integer',
                  description: 'X coordinate of bottom-right corner'
                },
                yMax: {
                  type: 'integer',
                  description: 'Y coordinate of bottom-right corner'
                },
                width: {
                  type: 'integer',
                  description: 'Width of face bounding box'
                },
                height: {
                  type: 'integer',
                  description: 'Height of face bounding box'
                }
              }
            },
            confidence: {
              type: 'number',
              description: 'Face detection confidence score',
              minimum: 0,
              maximum: 1
            }
          }
        },
        MatchResult: {
          type: 'object',
          properties: {
            faceIndex: {
              type: 'integer',
              description: 'Index of detected face'
            },
            isMatch: {
              type: 'boolean',
              description: 'Whether face matches reference'
            },
            similarity: {
              type: 'number',
              description: 'Similarity score',
              minimum: 0,
              maximum: 1
            },
            confidence: {
              type: 'string',
              enum: ['Tinggi', 'Sedang', 'Rendah'],
              description: 'Confidence level'
            },
            threshold: {
              type: 'number',
              description: 'Threshold used for matching'
            }
          }
        },
        WorkSchedule: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            name: {
              type: 'string',
              example: 'Regular Office Hours'
            },
            start_time: {
              type: 'string',
              format: 'time',
              example: '09:00:00'
            },
            end_time: {
              type: 'string',
              format: 'time',
              example: '17:00:00'
            },
            clock_in_start: {
              type: 'string',
              format: 'time',
              example: '08:30:00'
            },
            clock_in_end: {
              type: 'string',
              format: 'time',
              example: '09:30:00'
            },
            clock_out_start: {
              type: 'string',
              format: 'time',
              example: '16:30:00'
            },
            clock_out_end: {
              type: 'string',
              format: 'time',
              example: '18:00:00'
            },
            work_days: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
              },
              example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Invalid or expired token',
                code: 'TOKEN_INVALID'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Access denied',
                code: 'ACCESS_DENIED'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                code: 'VALIDATION_ERROR'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error',
                code: 'SERVER_ERROR'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'API untuk autentikasi karyawan'
      },
      {
        name: 'Activation',
        description: 'API untuk aktivasi akun karyawan'
      },
      {
        name: 'Attendance',
        description: 'API untuk absensi (clock in/out)'
      },
      {
        name: 'Validation',
        description: 'API untuk validasi lokasi dan wajah'
      },
      {
        name: 'Settings',
        description: 'API untuk pengaturan sistem'
      },
      {
        name: 'Admin Testing',
        description: 'API untuk testing face recognition (Admin only)'
      }
    ]
  },
  apis: ['./routes/api.js'], // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Attendance System API Documentation'
  })
};