export interface AcademicCatalog {
  departments: AcademicDepartment[];
  programs: AcademicProgram[];
  cohorts: AcademicCohort[];
  classGroups: AcademicClassGroup[];
  subjects: AcademicSubject[];
  subjectCourses: AcademicSubjectCourse[];
}

export interface AcademicDepartment {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface AcademicProgram {
  id: string;
  organizationId: string;
  departmentId: string | null;
  code: string;
  name: string;
  level: string | null;
  status: string;
  createdAt: string;
}

export interface AcademicCohort {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  startYear: number;
  graduationYear: number | null;
  status: string;
  createdAt: string;
}

export interface AcademicClassGroup {
  id: string;
  organizationId: string;
  programId: string;
  cohortId: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface AcademicSubject {
  id: string;
  organizationId: string;
  departmentId: string | null;
  code: string;
  name: string;
  credits: number;
  status: string;
  createdAt: string;
}

export interface AcademicSubjectCourse {
  id: string;
  organizationId: string;
  subjectId: string;
  courseId: string;
  primary: boolean;
  status: string;
  createdAt: string;
}

export interface CreateAcademicDepartmentRequest {
  code: string;
  name: string;
}

export interface CreateAcademicProgramRequest {
  departmentId: string | null;
  code: string;
  name: string;
  level: string | null;
}

export interface CreateAcademicCohortRequest {
  code: string;
  name: string;
  startYear: number;
  graduationYear: number | null;
}

export interface CreateAcademicClassGroupRequest {
  programId: string;
  cohortId: string;
  code: string;
  name: string;
}

export interface CreateAcademicSubjectRequest {
  departmentId: string | null;
  code: string;
  name: string;
  credits: number;
}

export interface LinkAcademicSubjectCourseRequest {
  subjectId: string;
  courseId: string;
  primary: boolean;
}
