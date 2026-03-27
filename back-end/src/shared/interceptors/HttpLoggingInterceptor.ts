import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, finalize, throwError } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      originalUrl?: string;
      ip?: string;
      user?: { sub?: string };
    }>();

    const method = request.method ?? 'UNKNOWN_METHOD';
    const url = request.originalUrl ?? 'UNKNOWN_URL';
    const ip = request.ip ?? 'UNKNOWN_IP';
    const userId = request.user?.sub ?? 'anonymous';
    const startedAt = Date.now();

    return next.handle().pipe(
      catchError((error: unknown) => {
        const elapsed = Date.now() - startedAt;

        if (error instanceof Error) {
          this.logger.error(
            `[${method}] ${url} | status=error | user=${userId} | ip=${ip} | duration=${elapsed}ms | message=${error.message}`,
            error.stack,
          );
        } else {
          this.logger.error(
            `[${method}] ${url} | status=error | user=${userId} | ip=${ip} | duration=${elapsed}ms | message=Unknown error`,
          );
        }

        return throwError(() => error);
      }),
      finalize(() => {
        const statusCode = http.getResponse<{ statusCode?: number }>()?.statusCode;
        const elapsed = Date.now() - startedAt;

        this.logger.log(
          `[${method}] ${url} | status=${statusCode ?? 'unknown'} | user=${userId} | ip=${ip} | duration=${elapsed}ms`,
        );
      }),
    );
  }
}
