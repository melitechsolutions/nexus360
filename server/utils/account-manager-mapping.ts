/**
 * Client Account Manager Role Mapping
 * Maps common roles to account manager responsibilities
 */

export const accountManagerRoleMap: Record<string, string> = {
  'sales_manager': 'sales_manager',
  'account_executive': 'sales_manager',
  'business_development_manager': 'sales_manager',
  'sales': 'sales_manager',
  'customer_success_manager': 'customer_success_manager',
  'account_manager': 'sales_manager',
  'relationship_manager': 'sales_manager',
};

/**
 * Get the default role for an account manager based on role name
 */
export function getDefaultAccountManagerRole(roleName?: string): string | null {
  if (!roleName) return null;
  
  const normalizedRole = roleName.toLowerCase().trim();
  
  // Direct match
  if (accountManagerRoleMap[normalizedRole]) {
    return accountManagerRoleMap[normalizedRole];
  }
  
  // Check for contains patterns
  if (normalizedRole.includes('sales') || normalizedRole.includes('manager')) {
    return 'sales_manager';
  }
  if (normalizedRole.includes('customer') || normalizedRole.includes('success')) {
    return 'customer_success_manager';
  }
  
  return null;
}

/**
 * Get suggested account manager roles (in priority order)
 */
export function getSuggestedAccountManagerRoles(): string[] {
  return ['sales_manager', 'customer_success_manager'];
}

/**
 * Check if a role has a suggested account manager role
 */
export function hasDefaultAccountManagerRole(roleName?: string): boolean {
  return getDefaultAccountManagerRole(roleName) !== null;
}
