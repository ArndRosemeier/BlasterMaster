import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_TITLE: z.string().optional().default('Blaster Master'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse({
  VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
});
