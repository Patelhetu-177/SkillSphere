declare module '@/lib/db' {
  import { PrismaClient } from '@prisma/client';
  export const db: PrismaClient;
}
