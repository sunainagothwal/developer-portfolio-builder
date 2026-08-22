import { createRepository } from './createRepository';
import type { Profile } from '@models/models';

export const profileRepository = createRepository<Profile>({
  table: 'profile',
  jsonColumns: ['socialLinks'],
  defaults: {
    fullName: '',
    headline: '',
    bio: '',
    email: '',
    socialLinks: [],
  },
});

/** Profile is a singleton — this convenience wrapper gets/creates the one row. */
export async function getOrCreateProfile(): Promise<Profile> {
  const all = await profileRepository.getAll();
  if (all.length > 0) return all[0];
  return profileRepository.create({});
}
