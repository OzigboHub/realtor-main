import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responsePayload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorMessage =
      typeof responsePayload === 'string'
        ? responsePayload
        : (responsePayload as any)?.message ?? 'Unexpected error';

    if (status >= 500 && status !== 503) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status} — ${JSON.stringify(exception instanceof Error ? exception.message : exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} → ${status} — ${errorMessage}`);
    }

    const jsonResponse = {
      statusCode: status,
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (typeof responsePayload === 'object' && responsePayload !== null) {
      Object.assign(jsonResponse, responsePayload);
    }

    response.status(status).json(jsonResponse);
  }
}
