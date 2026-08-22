import { createEntityStore } from './createEntityStore';
import { interviewRepository } from '@lib/db/repositories/interviewRepository';
import type { InterviewEntry } from '@models/models';

export const useInterviewStore = createEntityStore<InterviewEntry>(interviewRepository);
