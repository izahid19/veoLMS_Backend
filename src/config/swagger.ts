import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VeoLMS API Documentation',
      version: '1.0.0',
      description: 'API documentation for VeoLMS Backend',
    },
    servers: [
      {
        url: 'http://localhost:4001',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Scan route files for JSDoc annotations
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
