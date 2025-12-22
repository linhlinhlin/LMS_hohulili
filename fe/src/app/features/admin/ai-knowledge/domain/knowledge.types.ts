export interface KnowledgeStats {
    totalDocuments: number;
    totalNodes: number;
    categories: Record<string, number>;
    recentUploads: KnowledgeDocument[];
}

export interface KnowledgeDocument {
    id: string;
    filename: string;
    category: string;
    nodesCount?: number;
    uploadedBy?: string;
    uploadedAt?: string;
    fileSize?: number;
}

export interface UploadResponse {
    status: string;
    jobId: string;
    message: string;
    filename: string;
    category: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
}

export interface JobStatus {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message?: string;
}

