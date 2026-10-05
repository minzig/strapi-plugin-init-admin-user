/**
 * Strapi's admin password policy (admin::user validation):
 * at least 8 characters, one lowercase, one uppercase and one number.
 * Returns the list of violated rules (empty when the password is fine).
 */
export const passwordPolicyViolations = (password: string): string[] => {
  const violations: string[] = [];
  if (password.length < 8) violations.push('at least 8 characters');
  if (!/[a-z]/.test(password)) violations.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) violations.push('an uppercase letter');
  if (!/\d/.test(password)) violations.push('a number');
  return violations;
};
