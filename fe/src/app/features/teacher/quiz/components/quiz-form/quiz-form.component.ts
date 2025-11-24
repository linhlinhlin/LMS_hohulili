import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../../../api/endpoints/question.api';
import { dateRangeValidator } from '../../../../../shared/validators/quiz.validators';
import { QuestionSelectorComponent } from '../question-selector/question-selector.component';

/**
 * QuizFormComponent - Dumb/Presentational Component
 * 
 * Responsibilities:
 * - Display quiz creation form (3-step wizard)
 * - Handle form validation
 * - Emit events to parent (Smart component)
 * 
 * Does NOT:
 * - Call APIs
 * - Access Router
 * - Contain business logic
 */
@Component({
    selector: 'app-quiz-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuestionSelectorComponent],
    templateUrl: './quiz-form.component.html',
    styleUrls: ['./quiz-form.component.scss']
})
export class QuizFormComponent implements OnInit {
    @Input() config!: QuizFormConfig;
    @Input() questions: Question[] = [];
    @Input() initialData?: QuizFormData; // For edit mode

    @Output() onSubmit = new EventEmitter<QuizFormData>();
    @Output() onCancel = new EventEmitter<void>();
    @Output() questionsChanged = new EventEmitter<string[]>();

    quizForm!: FormGroup;
    currentStep = signal(1);
    selectedQuestionIds = signal<string[]>([]);

    constructor(private fb: FormBuilder) { }

    ngOnInit() {
        this.initForm();

        // Populate form if editing
        if (this.initialData) {
            this.quizForm.patchValue(this.initialData);
            this.selectedQuestionIds.set(this.initialData.questionIds || []);
        }
    }

    private initForm() {
        this.quizForm = this.fb.group({
            title: ['', [Validators.required, Validators.maxLength(255)]],
            description: [''],
            timeLimitMinutes: [this.config.defaults.timeLimitMinutes],
            maxAttempts: [
                this.config.defaults.maxAttempts,
                [Validators.required, Validators.min(1), Validators.max(10)]
            ],
            passingScore: [
                this.config.defaults.passingScore,
                [Validators.required, Validators.min(0), Validators.max(100)]
            ],
            shuffleQuestions: [this.config.defaults.shuffleQuestions],
            shuffleOptions: [this.config.defaults.shuffleOptions],
            showResultsImmediately: [this.config.defaults.showResultsImmediately],
            showCorrectAnswers: [this.config.defaults.showCorrectAnswers],
            publishImmediately: [this.config.defaults.publishImmediately]
        });

        // Add date fields only for Assignment
        if (this.config.showDates) {
            this.quizForm.addControl('startDate', this.fb.control(''));
            this.quizForm.addControl('endDate', this.fb.control(''));

            // Add date range validator to the form group
            this.quizForm.addValidators(dateRangeValidator);
        }
    }

    // ========== Step Navigation ==========

    nextStep() {
        if (this.currentStep() < 3) {
            // Validate current step before moving
            if (this.currentStep() === 1 && this.quizForm.invalid) {
                this.quizForm.markAllAsTouched();
                return;
            }
            if (this.currentStep() === 2 && this.selectedQuestionIds().length === 0) {
                return;
            }
            this.currentStep.update(step => step + 1);
        }
    }

    prevStep() {
        if (this.currentStep() > 1) {
            this.currentStep.update(step => step - 1);
        }
    }

    goToStep(step: number) {
        if (step >= 1 && step <= 3) {
            this.currentStep.set(step);
        }
    }

    // ========== Question Selection ==========

    onQuestionsSelected(questionIds: string[]) {
        this.selectedQuestionIds.set(questionIds);
        this.questionsChanged.emit(questionIds);
    }

    // ========== Form Submission ==========

    submit() {
        // Final validation
        if (this.quizForm.invalid) {
            this.quizForm.markAllAsTouched();
            this.goToStep(1);
            return;
        }

        if (this.selectedQuestionIds().length === 0) {
            this.goToStep(2);
            return;
        }

        const formData: QuizFormData = {
            ...this.quizForm.value,
            questionIds: this.selectedQuestionIds()
        };

        this.onSubmit.emit(formData);
    }

    cancel() {
        this.onCancel.emit();
    }

    // ========== Helper Methods ==========

    get isStep1Valid(): boolean {
        return this.quizForm.get('title')?.valid ?? false;
    }

    get isStep2Valid(): boolean {
        return this.selectedQuestionIds().length > 0;
    }

    get canSubmit(): boolean {
        return this.quizForm.valid && this.selectedQuestionIds().length > 0;
    }

    // Form field getters for template
    get titleControl() { return this.quizForm.get('title'); }
    get descriptionControl() { return this.quizForm.get('description'); }
    get timeLimitControl() { return this.quizForm.get('timeLimitMinutes'); }
    get maxAttemptsControl() { return this.quizForm.get('maxAttempts'); }
    get passingScoreControl() { return this.quizForm.get('passingScore'); }
    get startDateControl() { return this.quizForm.get('startDate'); }
    get endDateControl() { return this.quizForm.get('endDate'); }
}

// ========== Interfaces ==========

export interface QuizFormConfig {
    showDates: boolean;  // Show start/end date fields for Assignment
    defaults: {
        timeLimitMinutes?: number;
        maxAttempts: number;
        passingScore: number;
        shuffleQuestions: boolean;
        shuffleOptions: boolean;
        showResultsImmediately: boolean;
        showCorrectAnswers: boolean;
        publishImmediately: boolean;
    };
}

export interface QuizFormData {
    title: string;
    description?: string;
    timeLimitMinutes?: number;
    maxAttempts: number;
    passingScore: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showResultsImmediately: boolean;
    showCorrectAnswers: boolean;
    startDate?: string;
    endDate?: string;
    questionIds: string[];
    publishImmediately: boolean;
}
