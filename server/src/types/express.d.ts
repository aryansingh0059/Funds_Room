import { Role } from '@prisma/client';

export interface AuthUserPayload {
  userId: string;
  role: Role;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
