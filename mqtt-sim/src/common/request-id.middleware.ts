import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

declare global {
    // augment Express' Request to carry our id
    // (alternativ separat als d.ts Datei, aber inline ist okay)
    namespace Express {
        interface Request { requestId?: string }
    }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const headerName = 'x-request-id';
        const existing = (req.header(headerName) || req.header(headerName.toUpperCase()) || '').trim();
        const id = existing || uuidv4();
        req.requestId = id;
        res.setHeader('X-Request-ID', id);
        next();
    }
}
