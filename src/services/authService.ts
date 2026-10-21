import { getPegaConfig } from '../config/pegaConfig';
import type { PegaToken } from '../types/pega';
import type { UserProfile } from '../types/portal';
import { PegaDxClient } from './pegaDxClient';

export interface AuthenticatedSession {
  user: UserProfile;
  token: PegaToken;
}

export const loginWithPega = async (username: string, password: string): Promise<AuthenticatedSession> => {
  const config = getPegaConfig();

  if (!config) {
    throw new Error('Pega OAuth is not configured. Add the Pega values to .env and restart Vite.');
  }

  if (!username.trim() || !password) {
    throw new Error('Enter your Pega username and password.');
  }

  const client = new PegaDxClient(config);
  const token = await client.authenticateWithPassword(username.trim(), password);

  return {
    user: {
      name: username.trim(),
      email: username.trim(),
      memberSince: 'Pega'
    },
    token
  };
};
