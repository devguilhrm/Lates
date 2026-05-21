import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (
    process.env.FRONTEND_URLS ??
    process.env.FRONTEND_URL ??
    'http://localhost:4200,http://localhost:8081,http://localhost:8082,http://localhost:19006,http://127.0.0.1:4200,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:19006'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Requests from native apps/tools can arrive without Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());

  const port = process.env.PORT ?? 3000;
  const swaggerConfig = new DocumentBuilder()
    .setTitle('LatesOS API')
    .setDescription(
      'API de gestao para clinicas de Pilates e Fisioterapia com agenda, financeiro, relatorios e orcamentos.',
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'Ambiente local')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Informe o token JWT no formato: Bearer <token>',
    })
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      displayRequestDuration: true,
    },
  });

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
