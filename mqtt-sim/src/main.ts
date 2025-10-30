import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ValidationPipe} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import {RequestIdMiddleware} from "./common/request-id.middleware";
import {LoggingInterceptor} from "./common/logging.interceptor";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  app.use(new RequestIdMiddleware().use);

  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
  }));

  app.useGlobalInterceptors(new LoggingInterceptor());

    // Swagger/OpenAPI
    const swaggerCfg = new DocumentBuilder()
        .setTitle('MQTT Simulator API')
        .setDescription('HTTP API für Geräteverwaltung und Simulation.')
        .setVersion('0.1.0')
        .addApiKey(
            { type: 'apiKey', name: 'x-api-key', in: 'header' },
            'apiKey', // security name
        )
        .addServer('http://localhost:4444')
        .build();
    const doc = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('docs', app, doc, {
        customSiteTitle: 'MQTT Simulator Docs',
    });

  const cfg = app.get(ConfigService);
  await app.listen(cfg.get('PORT') ?? 4444);
}
bootstrap();
