// Import necessary modules
import { NestFactory } from '@nestjs/core';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create Nest application
  const app = await NestFactory.create(AppModule);

  // Define CORS options
  const corsOptions: CorsOptions = {
    origin: 'http://localhost:3000', // Allow requests from frontend app running on localhost:3000
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specified methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specified headers
    credentials: true, // Allow sending cookies
  };

  // Apply CORS middleware with specified options
  app.enableCors(corsOptions);

  // Start the application
  await app.listen(4000);
}
bootstrap();
