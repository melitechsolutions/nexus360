/**
 * Department-Role Head Mapping
 * Maps departments to their default role-based heads
 */

export type DepartmentRoleMap = {
  [key: string]: string; // department name -> role
};

/**
 * Map department names to default head roles
 */
export const departmentHeadRoleMap: DepartmentRoleMap = {
  'HR': 'hr',
  'Human Resources': 'hr',
  'HR Management': 'hr',
  'People & Culture': 'hr',
  
  'Finance': 'accountant',
  'Accounting': 'accountant',
  'Accounts': 'accountant',
  'Financial Services': 'accountant',
  'CFO Office': 'accountant',
  
  'ICT': 'ict_manager',
  'IT': 'ict_manager',
  'Information Technology': 'ict_manager',
  'Technology': 'ict_manager',
  'Systems': 'ict_manager',
  
  'Sales': 'sales_manager',
  'Sales & Marketing': 'sales_manager',
  'Revenue': 'sales_manager',
  
  'Procurement': 'procurement_manager',
  'Procurement & Supply': 'procurement_manager',
  'Supply Chain': 'procurement_manager',
  
  'Operations': 'admin',
  'Administration': 'admin',
  'Admin Services': 'admin',
  
  'Projects': 'project_manager',
  'Project Management': 'project_manager',
  'PMO': 'project_manager',
};

/**
 * Get the default head role for a department
 * @param departmentName - Name of the department
 * @returns Role string or undefined
 */
export function getDefaultHeadRole(departmentName: string): string | undefined {
  if (!departmentName) return undefined;
  
  const normalized = departmentName.trim();
  
  // Exact match
  if (departmentHeadRoleMap[normalized]) {
    return departmentHeadRoleMap[normalized];
  }
  
  // Case-insensitive match
  for (const [dept, role] of Object.entries(departmentHeadRoleMap)) {
    if (dept.toLowerCase() === normalized.toLowerCase()) {
      return role;
    }
  }
  
  return undefined;
}

/**
 * Get list of suggested head roles for a department
 * @param departmentName - Name of the department
 * @returns Array of role strings
 */
export function getSuggestedHeadRoles(departmentName: string): string[] {
  const role = getDefaultHeadRole(departmentName);
  return role ? [role] : [];
}

/**
 * Check if a department should auto-assign a head based on role
 * @param departmentName - Name of the department
 * @returns true if the department has a role-based default head
 */
export function hasDefaultHeadRole(departmentName: string): boolean {
  return !!getDefaultHeadRole(departmentName);
}

/**
 * Get all departments that have role-based defaults
 */
export function getDepartmentsWithRoleDefaults(): string[] {
  return Object.keys(departmentHeadRoleMap);
}
