import { Injectable, computed, signal } from '@angular/core';

export interface ComplianceResult {
    status: 'PASS' | 'FAIL' | 'WARNING';
    score: number;
    metrics: {
        label: string;
        value: string;
        hint: string;
        status: 'PASS' | 'FAIL' | 'WARNING';
    }[];
}

@Injectable({
    providedIn: 'root'
})
export class MaritimeComplianceService {
    // Standard STCW/IMO Requirements
    private readonly MIN_PRACTICE_HOURS = 12;
    private readonly MIN_SIMULATION_QUIZZES = 2;

    calculateCompliance(chapters: any[]): ComplianceResult {
        const lessons = chapters.flatMap(ch => ch.lessons);
        const sections = lessons.flatMap(l => l.sections || []);

        // 1. Calculate Practice Hours (Dummy logic: 1 practice section = 2 hours)
        const practiceSections = sections.filter(s => s.type === 'PRACTICE');
        const practiceHours = practiceSections.length * 2;
        const practiceStatus = practiceHours >= this.MIN_PRACTICE_HOURS ? 'PASS' : 'WARNING';

        // 2. Calculate Simulation/Quiz Coverage
        const simulationQuizzes = sections.filter(s => s.type === 'QUIZ');
        const quizCount = simulationQuizzes.length;
        const quizStatus = quizCount >= this.MIN_SIMULATION_QUIZZES ? 'PASS' : 'FAIL';

        // 3. IMO Structure Check (Simple count check)
        const lessonCount = lessons.length;
        const structureStatus = lessonCount >= 10 ? 'PASS' : 'WARNING';

        const metrics: ComplianceResult['metrics'] = [
            {
                label: 'Cơ cấu bài giảng IMO',
                value: structureStatus === 'PASS' ? 'Hợp lệ' : 'Cần bổ sung',
                hint: structureStatus === 'PASS' ? 'Phù hợp với Model Course 1.27' : 'IMO yêu cầu tối thiểu 10 bài giảng chuyên sâu',
                status: structureStatus
            },
            {
                label: 'Thời lượng thực hành',
                value: `${practiceHours}/${this.MIN_PRACTICE_HOURS} giờ`,
                hint: practiceStatus === 'PASS' ? 'Đạt yêu cầu tối thiểu' : 'Cần thêm các bài lab thực hành',
                status: practiceStatus
            },
            {
                label: 'Đánh giá năng lực (STCW)',
                value: `${quizCount}/${this.MIN_SIMULATION_QUIZZES} bài`,
                hint: quizStatus === 'PASS' ? 'Đầy đủ bài kiểm tra' : 'Thiếu bài kiểm tra năng lực mô phỏng',
                status: quizStatus
            }
        ];

        // Overall Score Calculation
        const passCount = metrics.filter(m => m.status === 'PASS').length;
        const score = Math.round((passCount / metrics.length) * 100);

        let status: ComplianceResult['status'] = 'PASS';
        if (metrics.some(m => m.status === 'FAIL')) status = 'FAIL';
        else if (metrics.some(m => m.status === 'WARNING')) status = 'WARNING';

        return { status, score, metrics };
    }
}
