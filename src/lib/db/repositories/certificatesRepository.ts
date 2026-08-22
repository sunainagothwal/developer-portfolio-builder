import { createRepository } from './createRepository';
import type { Certificate } from '@models/models';

export const certificatesRepository = createRepository<Certificate>({
  table: 'certificates',
  defaults: {
    name: '',
    issuingOrg: '',
    issueDate: new Date().toISOString(),
  },
});
