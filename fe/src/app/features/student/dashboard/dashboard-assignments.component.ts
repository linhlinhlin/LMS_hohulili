import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
}

@Component({
  selector: 'app-dashboard-assignments',
  imports: [CommonModule],
  template: `
    <!-- Assignments Overview -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-gray-900">Bài tập</h3>
        <button (click)="goToAssignments.emit()"
                class="text-purple-600 hover:text-purple-700 font-medium transition-colors">
          Xem tất cả →
        </button>
      </div>

      <div class="space-y-3">
        @for (assignment of pendingAssignments().slice(0, 3); track assignment.id) {
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 class="font-medium text-gray-900">{{ assignment.title }}</h4>
              <p class="text-sm text-gray-600">{{ assignment.course }}</p>
              <p class="text-xs text-gray-500 mt-1">Hạn: {{ assignment.dueDate }}</p>
            </div>
            <div class="text-right">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    [class]="getStatusClass(assignment.status)">
                {{ getStatusText(assignment.status) }}
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardAssignmentsComponent {
  pendingAssignments = input<Assignment[]>([]);

  goToAssignments = output<void>();

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Chưa nộp';
      case 'submitted':
        return 'Đã nộp';
      case 'overdue':
        return 'Quá hạn';
      default:
        return status;
    }
  }
}