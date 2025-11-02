import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'study' | 'assignment' | 'exam' | 'deadline' | 'meeting';
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  courseId: string;
  courseName: string;
  description?: string;
  location?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  color: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-learning-calendar',
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">📅 Learning Calendar</h1>
            <p class="text-gray-600">Lịch học tập và sự kiện</p>
          </div>
          <div class="flex items-center space-x-4">
            <button (click)="goToToday()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
              </svg>
              Hôm nay
            </button>
            <button (click)="createEvent()"
                    class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Thêm sự kiện
            </button>
          </div>
        </div>

        <!-- Calendar Controls -->
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div class="flex items-center justify-between">
            <!-- Month Navigation -->
            <div class="flex items-center space-x-4">
              <button (click)="previousMonth()"
                      class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </button>
              <h2 class="text-2xl font-bold text-gray-900">{{ currentMonthText() }}</h2>
              <button (click)="nextMonth()"
                      class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>

            <!-- View Toggle -->
            <div class="flex items-center space-x-2">
              <button (click)="setView('month')"
                      [class]="view() === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                      class="px-4 py-2 rounded-lg transition-colors">
                Tháng
              </button>
              <button (click)="setView('week')"
                      [class]="view() === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                      class="px-4 py-2 rounded-lg transition-colors">
                Tuần
              </button>
              <button (click)="setView('day')"
                      [class]="view() === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                      class="px-4 py-2 rounded-lg transition-colors">
                Ngày
              </button>
            </div>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
          <!-- Weekday Headers -->
          <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            @for (day of weekdays; track day) {
              <div class="p-4 text-center font-semibold text-gray-700">
                {{ day }}
              </div>
            }
          </div>

          <!-- Calendar Days -->
          <div class="grid grid-cols-7">
            @for (day of calendarDays(); track day.date.getTime()) {
              <div class="min-h-[120px] border-r border-b border-gray-200 p-2 hover:bg-gray-50 transition-colors cursor-pointer"
                   [class]="getDayClasses(day)"
                   (click)="selectDay(day)">
                <!-- Date Number -->
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium"
                        [class]="getDateClasses(day)">
                    {{ day.date.getDate() }}
                  </span>
                  @if (day.events.length > 0) {
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {{ day.events.length }}
                    </span>
                  }
                </div>

                <!-- Events -->
                <div class="space-y-1">
                  @for (event of day.events.slice(0, 3); track event.id) {
                    <div class="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                         [style.background-color]="event.color"
                         [style.color]="getContrastColor(event.color)"
                         (click)="viewEvent(event)">
                      {{ event.title }}
                    </div>
                  }
                  @if (day.events.length > 3) {
                    <div class="text-xs text-gray-500 text-center">
                      +{{ day.events.length - 3 }} khác
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Selected Day Events -->
        @if (selectedDay()) {
          <div class="bg-white rounded-2xl shadow-lg p-6 mt-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-gray-900">
                Sự kiện ngày {{ formatDate(selectedDay()!.date) }}
              </h3>
              <button (click)="addEventToDay(selectedDay()!.date)"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Thêm sự kiện
              </button>
            </div>

            @if (selectedDay()!.events.length === 0) {
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <p class="text-gray-600">Không có sự kiện nào trong ngày này</p>
              </div>
            } @else {
              <div class="space-y-4">
                @for (event of selectedDay()!.events; track event.id) {
                  <div class="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div class="w-4 h-4 rounded-full" [style.background-color]="event.color"></div>
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900">{{ event.title }}</h4>
                      <p class="text-sm text-gray-600">{{ event.courseName }}</p>
                      <p class="text-sm text-gray-500">{{ event.startTime }} - {{ event.endTime }}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="px-2 py-1 rounded-full text-xs font-medium"
                            [class]="getPriorityClass(event.priority)">
                        {{ getPriorityText(event.priority) }}
                      </span>
                      <span class="px-2 py-1 rounded-full text-xs font-medium"
                            [class]="getStatusClass(event.status)">
                        {{ getStatusText(event.status) }}
                      </span>
                      <button (click)="editEvent(event.id)"
                              class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Legend -->
        <div class="bg-white rounded-2xl shadow-lg p-6 mt-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Chú thích</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span class="text-sm text-gray-700">Buổi học</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-green-500 rounded-full"></div>
              <span class="text-sm text-gray-700">Bài tập</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-red-500 rounded-full"></div>
              <span class="text-sm text-gray-700">Thi</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span class="text-sm text-gray-700">Hạn nộp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningCalendarComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  currentDate = signal<Date>(new Date());
  selectedDay = signal<CalendarDay | null>(null);
  view = signal<'month' | 'week' | 'day'>('month');

  weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Mock events data
  events = signal<CalendarEvent[]>([
    {
      id: 'event-1',
      title: 'Học COLREG',
      type: 'study',
      startDate: new Date(),
      endDate: new Date(),
      startTime: '09:00',
      endTime: '11:00',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      description: 'Học về quy tắc COLREG',
      priority: 'high',
      status: 'scheduled',
      color: '#3B82F6'
    },
    {
      id: 'event-2',
      title: 'Nộp bài tập điều hướng',
      type: 'assignment',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      startTime: '23:59',
      endTime: '23:59',
      courseId: 'course-2',
      courseName: 'Điều hướng',
      description: 'Hạn nộp bài tập về GPS',
      priority: 'high',
      status: 'scheduled',
      color: '#10B981'
    },
    {
      id: 'event-3',
      title: 'Thi giữa kỳ',
      type: 'exam',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: '08:00',
      endTime: '10:00',
      courseId: 'course-3',
      courseName: 'Luật hàng hải',
      description: 'Thi giữa kỳ môn luật hàng hải',
      priority: 'high',
      status: 'scheduled',
      color: '#EF4444'
    },
    {
      id: 'event-4',
      title: 'Họp nhóm học tập',
      type: 'meeting',
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startTime: '19:00',
      endTime: '21:00',
      courseId: 'course-1',
      courseName: 'An toàn hàng hải',
      description: 'Thảo luận về bài tập nhóm',
      priority: 'medium',
      status: 'scheduled',
      color: '#8B5CF6'
    }
  ]);

  // Computed properties
  currentMonthText = computed(() => {
    const date = this.currentDate();
    return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    const currentDate = this.currentDate();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first day of the week containing the first day of the month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = this.events().filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        const dayDate = new Date(date);
        dayDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === dayDate.getTime();
      });
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        isSelected: this.selectedDay()?.date.getTime() === date.getTime(),
        events: dayEvents
      });
    }
    
    return days;
  });

  ngOnInit(): void {
    // Initialize component
  }

  previousMonth(): void {
    const current = this.currentDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentDate.set(newDate);
  }

  nextMonth(): void {
    const current = this.currentDate();
    const newDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentDate.set(newDate);
  }

  setView(newView: 'month' | 'week' | 'day'): void {
    this.view.set(newView);
  }

  selectDay(day: CalendarDay): void {
    this.selectedDay.set(day);
  }

  goToToday(): void {
    this.currentDate.set(new Date());
    this.selectedDay.set(null);
  }

  createEvent(): void {
    console.log('Create new event');
  }

  addEventToDay(date: Date): void {
    console.log('Add event to day:', date);
  }

  viewEvent(event: CalendarEvent): void {
    console.log('View event:', event);
  }

  editEvent(eventId: string): void {
    console.log('Edit event:', eventId);
  }

  getDayClasses(day: CalendarDay): string {
    let classes = '';
    if (!day.isCurrentMonth) classes += 'bg-gray-50 text-gray-400 ';
    if (day.isToday) classes += 'bg-blue-50 ';
    if (day.isSelected) classes += 'bg-blue-100 ';
    return classes;
  }

  getDateClasses(day: CalendarDay): string {
    if (!day.isCurrentMonth) return 'text-gray-400';
    if (day.isToday) return 'text-blue-600 font-bold';
    if (day.isSelected) return 'text-blue-800 font-bold';
    return 'text-gray-900';
  }

  getContrastColor(backgroundColor: string): string {
    // Simple contrast calculation
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Không xác định';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'scheduled': return 'Đã lên lịch';
      case 'in-progress': return 'Đang diễn ra';
      case 'completed': return 'Đã hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return 'Không xác định';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}