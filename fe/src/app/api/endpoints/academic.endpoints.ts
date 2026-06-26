export const ACADEMIC_ENDPOINTS = {
  CATALOG: (orgId: string) => `/api/v3/organizations/${orgId}/academic/catalog`,
  DEPARTMENTS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/departments`,
  PROGRAMS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/programs`,
  COHORTS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/cohorts`,
  CLASS_GROUPS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/class-groups`,
  SUBJECTS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/subjects`,
  SUBJECT_COURSES: (orgId: string) => `/api/v3/organizations/${orgId}/academic/subject-courses`,
  TERMS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/terms`,
  CURRICULUM_PLANS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/curriculum-plans`,
  CURRICULUM_SUBJECTS: (orgId: string) => `/api/v3/organizations/${orgId}/academic/curriculum-subjects`,
} as const;
