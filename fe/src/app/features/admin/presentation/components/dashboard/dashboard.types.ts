export interface PendingApproval {
  id: string;
  name: string;
  type: 'course' | 'teacher';
  submittedDate: string;
}
