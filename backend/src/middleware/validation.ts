import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function validate(schema: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      if (parsed.query) {
        for (const key in req.query) { delete req.query[key]; }
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params) {
        for (const key in req.params) { delete req.params[key]; }
        Object.assign(req.params, parsed.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues.map((err: any) => ({
            field: err.path.slice(1).join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
