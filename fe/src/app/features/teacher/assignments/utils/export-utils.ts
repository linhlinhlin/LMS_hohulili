/**
 * Export Utilities
 * 
 * Provides functions for exporting submission grades to Excel format.
 * Ensures all required fields are included in the export.
 * 
 * @module export-utils
 * @requirements 8.1, 8.3
 */

// ============================================================================
// Types
// ============================================================================

export interface ExportableSubmission {
  studentName: string;
  studentEmail: string;
  submittedAt?: string;
  grade?: number;
  maxScore?: number;
  feedback?: string;
  status?: string;
  isLate?: boolean;
}

export interface ExportData {
  assignmentTitle: string;
  courseTitle: string;
  dueDate?: string;
  maxScore: number;
  exportedAt: string;
  submissions: ExportRow[];
}

export interface ExportRow {
  studentName: string;
  studentEmail: string;
  submissionDate: string;
  grade: string;
  percentage: string;
  feedback: string;
  status: string;
  isLate: string;
}

export interface ExportValidationResult {
  isValid: boolean;
  missingFields: string[];
}

// ============================================================================
// Constants
// ============================================================================

export const REQUIRED_EXPORT_FIELDS = [
  'studentName',
  'studentEmail', 
  'submissionDate',
  'grade',
  'feedback'
] as const;

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Prepares submission data for export.
 * Ensures all required fields are included.
 * 
 * @param submissions - Array of submissions to export
 * @param assignmentInfo - Assignment metadata
 * @returns ExportData ready for Excel generation
 * 
 * @requirements 8.1, 8.3
 */
export function prepareExportData(
  submissions: ExportableSubmission[],
  assignmentInfo: {
    title: string;
    courseTitle: string;
    dueDate?: string;
    maxScore: number;
  }
): ExportData {
  const exportRows: ExportRow[] = submissions.map((sub: ExportableSubmission) => ({
    studentName: sub.studentName || '',
    studentEmail: sub.studentEmail || '',
    submissionDate: sub.submittedAt ? formatDateForExport(sub.submittedAt) : 'Chưa nộp',
    grade: sub.grade !== undefined ? String(sub.grade) : 'Chưa chấm',
    percentage: sub.grade !== undefined && sub.maxScore 
      ? `${Math.round((sub.grade / sub.maxScore) * 100)}%` 
      : '',
    feedback: sub.feedback || '',
    status: translateStatus(sub.status),
    isLate: sub.isLate ? 'Có' : 'Không'
  }));

  return {
    assignmentTitle: assignmentInfo.title,
    courseTitle: assignmentInfo.courseTitle,
    dueDate: assignmentInfo.dueDate,
    maxScore: assignmentInfo.maxScore,
    exportedAt: new Date().toISOString(),
    submissions: exportRows
  };
}

/**
 * Validates that export data contains all required fields.
 * 
 * @param exportData - The export data to validate
 * @returns Validation result with missing fields if any
 * 
 * @requirements 8.3
 */
export function validateExportData(exportData: ExportData): ExportValidationResult {
  const missingFields: string[] = [];

  for (const row of exportData.submissions) {
    if (!row.studentName) missingFields.push('studentName');
    if (!row.studentEmail) missingFields.push('studentEmail');
    // submissionDate, grade, feedback can be empty but must exist
  }

  return {
    isValid: missingFields.length === 0,
    missingFields: [...new Set(missingFields)] // Remove duplicates
  };
}

/**
 * Checks if a single submission has all required export fields.
 * 
 * @param submission - The submission to check
 * @returns true if all required fields are present
 */
export function hasRequiredExportFields(submission: ExportableSubmission): boolean {
  return !!(
    submission.studentName &&
    submission.studentEmail
    // Other fields are optional but will be included with default values
  );
}


// ============================================================================
// Excel Generation Functions
// ============================================================================

/**
 * Generates CSV content from export data.
 * Can be used as fallback when Excel library is not available.
 * 
 * @param exportData - The prepared export data
 * @returns CSV string content
 */
export function generateCSV(exportData: ExportData): string {
  const headers = [
    'Họ tên',
    'Email',
    'Ngày nộp',
    'Điểm',
    'Phần trăm',
    'Nhận xét',
    'Trạng thái',
    'Nộp muộn'
  ];

  const rows = exportData.submissions.map((row: ExportRow) => [
    escapeCSV(row.studentName),
    escapeCSV(row.studentEmail),
    escapeCSV(row.submissionDate),
    escapeCSV(row.grade),
    escapeCSV(row.percentage),
    escapeCSV(row.feedback),
    escapeCSV(row.status),
    escapeCSV(row.isLate)
  ].join(','));

  // Add metadata header
  const metadata = [
    `# Bài tập: ${exportData.assignmentTitle}`,
    `# Khóa học: ${exportData.courseTitle}`,
    `# Điểm tối đa: ${exportData.maxScore}`,
    `# Hạn nộp: ${exportData.dueDate || 'Không có'}`,
    `# Xuất lúc: ${formatDateForExport(exportData.exportedAt)}`,
    ''
  ];

  return [...metadata, headers.join(','), ...rows].join('\n');
}

/**
 * Triggers download of export file.
 * 
 * @param content - File content (CSV or Excel blob)
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
): void {
  const blob = content instanceof Blob 
    ? content 
    : new Blob(['\ufeff' + content], { type: mimeType }); // Add BOM for Excel UTF-8

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generates filename for export.
 * 
 * @param assignmentTitle - Title of the assignment
 * @param extension - File extension (csv or xlsx)
 * @returns Formatted filename
 */
export function generateExportFilename(
  assignmentTitle: string,
  extension: 'csv' | 'xlsx' = 'csv'
): string {
  const sanitized = assignmentTitle
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  
  const date = new Date().toISOString().split('T')[0];
  return `${sanitized}_${date}.${extension}`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats date for export display.
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string in Vietnamese format
 */
function formatDateForExport(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Translates submission status to Vietnamese.
 * 
 * @param status - Status string
 * @returns Vietnamese translation
 */
function translateStatus(status?: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Chờ nộp',
    'submitted': 'Đã nộp',
    'graded': 'Đã chấm',
    'late': 'Nộp muộn',
    'PENDING': 'Chờ nộp',
    'SUBMITTED': 'Đã nộp',
    'GRADED': 'Đã chấm',
    'RETURNED': 'Đã trả'
  };
  
  return statusMap[status || ''] || status || 'Không xác định';
}

/**
 * Escapes special characters for CSV format.
 * 
 * @param value - Value to escape
 * @returns Escaped value safe for CSV
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

// ============================================================================
// Export All-in-One Function
// ============================================================================

/**
 * Complete export workflow: prepare data, generate CSV, and download.
 * 
 * @param submissions - Submissions to export
 * @param assignmentInfo - Assignment metadata
 * @returns true if export was successful
 */
export function exportSubmissionsToCSV(
  submissions: ExportableSubmission[],
  assignmentInfo: {
    title: string;
    courseTitle: string;
    dueDate?: string;
    maxScore: number;
  }
): boolean {
  try {
    const exportData = prepareExportData(submissions, assignmentInfo);
    const validation = validateExportData(exportData);
    
    if (!validation.isValid) {
      console.warn('Export validation warnings:', validation.missingFields);
    }
    
    const csvContent = generateCSV(exportData);
    const filename = generateExportFilename(assignmentInfo.title, 'csv');
    
    downloadFile(csvContent, filename);
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    return false;
  }
}
