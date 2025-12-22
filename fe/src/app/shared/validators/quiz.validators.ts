import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Custom validator for date range
 * Ensures endDate is after startDate
 */
export function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (!startDate || !endDate) {
        return null; // Don't validate if either date is missing
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
        return { dateRangeInvalid: true };
    }

    return null;
}

/**
 * Validator to ensure at least one question is selected
 */
export function minQuestionsValidator(min: number = 1) {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (!value || !Array.isArray(value) || value.length < min) {
            return { minQuestions: { required: min, actual: value?.length || 0 } };
        }

        return null;
    };
}

