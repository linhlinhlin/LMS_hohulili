import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Question } from '../../../../../api/endpoints/question.api';

/**
 * QuestionSelectorComponent - Dumb Component
 * 
 * Responsibilities:
 * - Display list of questions
 * - Handle question selection/deselection
 * - Search and filter questions
 * - Emit selection changes to parent
 * 
 * Does NOT:
 * - Load questions from API
 * - Store selection state (parent manages it)
 */
@Component({
    selector: 'app-question-selector',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './question-selector.component.html',
    styleUrls: ['./question-selector.component.scss']
})
export class QuestionSelectorComponent {
    // Signal inputs (Angular v20+)
    readonly questions = input<Question[]>([]);
    readonly selectedIds = input<string[]>([]);

    // Output functions (Angular v20+)
    readonly selectionChange = output<string[]>();
    readonly createNew = output<void>();

    searchTerm = signal('');
    filterDifficulty = signal<string>('all');

    // Computed filtered questions
    filteredQuestions = computed(() => {
        let filtered = this.questions();

        // Filter by search term
        const search = this.searchTerm().toLowerCase();
        if (search) {
            filtered = filtered.filter(q =>
                q.content.toLowerCase().includes(search) ||
                q.tags?.toLowerCase().includes(search)
            );
        }

        // Filter by difficulty
        const difficulty = this.filterDifficulty();
        if (difficulty !== 'all') {
            filtered = filtered.filter(q => q.difficulty === difficulty);
        }

        return filtered;
    });

    isSelected(questionId: string): boolean {
        return this.selectedIds().includes(questionId);
    }

    toggleQuestion(questionId: string) {
        const currentSelection = [...this.selectedIds()];
        const index = currentSelection.indexOf(questionId);

        if (index > -1) {
            currentSelection.splice(index, 1);
        } else {
            currentSelection.push(questionId);
        }

        this.selectionChange.emit(currentSelection);
    }

    selectAll() {
        const allIds = this.filteredQuestions().map(q => q.id);
        const uniqueIds = [...new Set([...this.selectedIds(), ...allIds])];
        this.selectionChange.emit(uniqueIds);
    }

    deselectAll() {
        const filteredIds = this.filteredQuestions().map(q => q.id);
        const remaining = this.selectedIds().filter(id => !filteredIds.includes(id));
        this.selectionChange.emit(remaining);
    }

    clearFilters() {
        this.searchTerm.set('');
        this.filterDifficulty.set('all');
    }

    getDifficultyLabel(difficulty: string): string {
        const labels: Record<string, string> = {
            'EASY': 'Dễ',
            'MEDIUM': 'Trung bình',
            'HARD': 'Khó'
        };
        return labels[difficulty] || difficulty;
    }

    getDifficultyClass(difficulty: string): string {
        const classes: Record<string, string> = {
            'EASY': 'difficulty-easy',
            'MEDIUM': 'difficulty-medium',
            'HARD': 'difficulty-hard'
        };
        return classes[difficulty] || '';
    }
}
