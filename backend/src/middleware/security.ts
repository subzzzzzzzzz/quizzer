import { Request, Response, NextFunction } from 'express';

// Recursive function to remove any keys starting with '$' or containing '.' to prevent NoSQL injection
function sanitize(obj: any): void {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  }
}

export function mongoSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) sanitize(req.body);
  if (req.query) {
    const q = { ...req.query };
    sanitize(q);
    Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true, enumerable: true });
  }
  if (req.params) {
    const p = { ...req.params };
    sanitize(p);
    Object.defineProperty(req, 'params', { value: p, writable: true, configurable: true, enumerable: true });
  }
  next();
}
