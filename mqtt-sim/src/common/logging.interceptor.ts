import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly log = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const req = ctx.getRequest<Request & { requestId?: string }>();
        const res = ctx.getResponse<any>();

        const started = Date.now();
        const method = (req as any).method;
        const url = (req as any).originalUrl || (req as any).url;
        const reqId = (req as any).requestId || '-';
        const ua = (req as any).headers?.['user-agent'] || '';
        const ip = (req as any).ip || (req as any).socket?.remoteAddress || '-';

        return next.handle().pipe(
            tap(() => {
                const ms = Date.now() - started;
                const status = res.statusCode;
                const length = res.getHeader?.('content-length') || '-';
                this.log.log(
                    `reqId=${reqId} ip=${ip} ${method} ${url} status=${status} length=${length} ua="${ua}" ${ms}ms`,
                );
            }),
            catchError((err) => {
                const ms = Date.now() - started;
                const status = err?.status ?? err?.statusCode ?? 500;
                const message = err?.message ?? String(err);
                this.log.error(
                    `reqId=${reqId} ${method} ${url} status=${status} error="${message}" ${ms}ms`,
                );
                return throwError(() => err);
            }),
        );
    }
}
