import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  role: Role;
}

export const signToken = (payload: JwtPayload): string => {
  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const secret: Secret = env.JWT_SECRET;
  return jwt.verify(token, secret) as JwtPayload;
};
