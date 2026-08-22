import uuid from 'react-native-uuid';

/** Generates a RFC4122 v4 UUID string. Works in RN without native crypto. */
export function generateId(): string {
  return uuid.v4() as string;
}
