import { createEntityStore } from './createEntityStore';
import { certificatesRepository } from '@lib/db/repositories/certificatesRepository';
import type { Certificate } from '@models/models';

export const useCertificatesStore = createEntityStore<Certificate>(certificatesRepository);
