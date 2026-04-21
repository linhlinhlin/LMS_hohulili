/**
 * Detects whether a user is "new" (just registered) by checking if their
 * fullName is still the auto-generated email prefix placeholder.
 */
export function isNewUser(user: { fullName?: string; email?: string }): boolean {
  if (!user.fullName) return true;
  const emailPrefix = user.email?.split('@')[0];
  return user.fullName === emailPrefix;
}
