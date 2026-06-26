export interface AcademicCatalog {
  departments: AcademicDepartment[];
  programs: AcademicProgram[];
  cohorts: AcademicCohort[];
  classGroups: AcademicClassGroup[];
  subjects: AcademicSubject[];
  subjectCourses: AcademicSubjectCourse[];
  terms: AcademicTerm[];
  curriculumPlans: AcademicCurriculumPlan[];
  curriculumSubjects: AcademicCurriculumSubject[];
  learningPackages: AcademicLearningPackage[];
  learningPackageItems: AcademicLearningPackageItem[];
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

export interface AcademicTerm {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  academicYear: string;
  termNumber: number;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  createdAt: string;
}

export interface AcademicCurriculumPlan {
  id: string;
  organizationId: string;
  programId: string;
  cohortId: string | null;
  code: string;
  name: string;
  totalCredits: number;
  status: string;
  createdAt: string;
}

export interface AcademicCurriculumSubject {
  id: string;
  organizationId: string;
  curriculumPlanId: string;
  subjectId: string;
  termId: string | null;
  displayOrder: number;
  required: boolean;
  creditsOverride: number | null;
  status: string;
  createdAt: string;
}

export interface AcademicLearningPackage {
  id: string;
  organizationId: string;
  curriculumPlanId: string | null;
  code: string;
  name: string;
  description: string | null;
  packageType: string;
  price: number;
  currency: string;
  enrollmentPolicy: string;
  status: string;
  createdAt: string;
}

export interface AcademicLearningPackageItem {
  id: string;
  organizationId: string;
  packageId: string;
  subjectId: string | null;
  courseId: string | null;
  displayOrder: number;
  required: boolean;
  status: string;
  createdAt: string;
}

export interface AcademicLearningPackageEnrollment {
  id: string;
  organizationId: string;
  packageId: string;
  studentId: string;
  status: string;
  decisionNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
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

export interface CreateAcademicTermRequest {
  code: string;
  name: string;
  academicYear: string;
  termNumber: number;
  startsOn: string | null;
  endsOn: string | null;
}

export interface CreateAcademicCurriculumPlanRequest {
  programId: string;
  cohortId: string | null;
  code: string;
  name: string;
  totalCredits: number;
}

export interface AddAcademicCurriculumSubjectRequest {
  curriculumPlanId: string;
  subjectId: string;
  termId: string | null;
  displayOrder: number;
  required: boolean;
  creditsOverride: number | null;
}

export interface CreateAcademicLearningPackageRequest {
  curriculumPlanId: string | null;
  code: string;
  name: string;
  description: string | null;
  packageType: string;
  price: number;
  currency: string;
  enrollmentPolicy: string;
}

export interface AddAcademicLearningPackageItemRequest {
  packageId: string;
  subjectId: string | null;
  courseId: string | null;
  displayOrder: number;
  required: boolean;
}

export interface ReviewAcademicLearningPackageEnrollmentRequest {
  note: string | null;
}
