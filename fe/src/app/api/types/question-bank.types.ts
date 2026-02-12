export type BankType = 'PERSONAL' | 'DEPARTMENT' | 'INSTITUTIONAL';
export type BankVisibility = 'PUBLIC' | 'PRIVATE';
export type BankStatus = 'ACTIVE' | 'ARCHIVED';

export interface QuestionBankDTO {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  ownerId: string;
  bankType: BankType;
  visibility: BankVisibility;
  status: BankStatus;
  questionCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  categories?: QuestionBankCategoryDTO[];
}

export interface QuestionBankCategoryDTO {
  id: string;
  bankId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  questionCount: number;
  children: QuestionBankCategoryDTO[];
}

export interface CreateBankRequest {
  name: string;
  description?: string;
  subject?: string;
  bankType?: BankType;
  visibility?: BankVisibility;
}

export interface UpdateBankRequest {
  name?: string;
  description?: string;
  subject?: string;
  visibility?: BankVisibility;
}

export interface AddCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export interface MoveBankQuestionsRequest {
  questionIds: string[];
  targetBankId: string;
  targetCategoryId?: string;
}

export interface BankQuestionDTO {
  id: string;
  content: string;
  questionType: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string | null;
  status: string;
  categoryId: string | null;
  createdAt: string | null;
}
