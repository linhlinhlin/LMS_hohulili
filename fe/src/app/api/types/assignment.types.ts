export interface CreateAssignmentLessonRequest {
  title: string;
  content?: string;
  videoUrl?: string;
  assignmentTitle: string;
  assignmentDescription: string;
  assignmentInstructions?: string;
  dueDate?: string;
  maxScore?: number;
  orderIndex?: number;
}

export interface AssignmentLessonDetail {
  id: string;
  title: string;
  content?: string;
  videoUrl?: string;
  lessonType: 'ASSIGNMENT';
  assignment: {
    id: string;
    title: string;
    description: string;
    instructions?: string;
    dueDate?: string;
    maxScore: number;
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    createdAt: string;
    updatedAt?: string;
  };
  orderIndex: number;
  createdAt: string;
  updatedAt?: string;
}