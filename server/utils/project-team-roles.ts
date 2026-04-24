/**
 * Project Team Member Role Definitions
 * Default team roles and their descriptions for project assignments
 */

export const DEFAULT_PROJECT_TEAM_ROLES = [
  { id: 'project_manager', label: 'Project Manager', description: 'Overall project responsibility' },
  { id: 'team_lead', label: 'Team Lead', description: 'Lead developer or team coordinator' },
  { id: 'developer', label: 'Developer', description: 'Software development' },
  { id: 'designer', label: 'Designer', description: 'UI/UX design' },
  { id: 'qa', label: 'QA Engineer', description: 'Testing and quality assurance' },
  { id: 'devops', label: 'DevOps Engineer', description: 'Infrastructure and deployment' },
  { id: 'business_analyst', label: 'Business Analyst', description: 'Requirements and analysis' },
  { id: 'product_owner', label: 'Product Owner', description: 'Product management' },
  { id: 'scrum_master', label: 'Scrum Master', description: 'Agile process management' },
  { id: 'tech_lead', label: 'Technical Lead', description: 'Technical architecture' },
  { id: 'other', label: 'Other', description: 'Other role' },
];

export function getRoleLabel(roleId?: string): string {
  if (!roleId) return 'Team Member';
  const role = DEFAULT_PROJECT_TEAM_ROLES.find(r => r.id === roleId);
  return role?.label || roleId;
}

export function getRoleDescription(roleId?: string): string {
  if (!roleId) return '';
  const role = DEFAULT_PROJECT_TEAM_ROLES.find(r => r.id === roleId);
  return role?.description || '';
}
