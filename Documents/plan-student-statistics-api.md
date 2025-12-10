# Kế hoạch Chi tiết: Thay thế Mock Data bằng Real API cho Student Statistics

## 📊 Phân tích hiện trạng

### Mock Data hiện tại (Dashboard):
```typescript
careerGoal = signal<string>('Chuyên gia Hàng hải');
todayGoalProgress = signal<number>(1);
learningStreak = signal<number>(3);
completedGoals = signal<number>(12);
totalStudyTime = signal<number>(24);
```

### Mock Data hiện tại (My Courses Sidebar):
```typescript
inProgressCount = computed(() => enrollmentService.enrollmentStats().inProgress);
averageProgress = computed(() => enrollmentService.enrollmentStats().averageProgress);
```

---

## 🎯 Mục tiêu

Xây dựng end-to-end API để lấy thống kê học tập thực tế của student từ backend.

---

## 📋 Kế hoạch thực hiện

### **PHASE 1: Backend - Database & Entity**

#### 1.1. Tạo Entity `StudentStatistics`
**File**: `api/src/main/java/com/example/lms/entity/StudentStatistics.java`

```java
@Entity
@Table(name = "student_statistics")
public class StudentStatistics {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @Column(name = "career_goal")
    private String careerGoal;
    
    @Column(name = "today_goal_progress")
    private Integer todayGoalProgress;
    
    @Column(name = "learning_streak")
    private Integer learningStreak;
    
    @Column(name = "completed_goals")
    private Integer completedGoals;
    
    @Column(name = "total_study_time_hours")
    private Integer totalStudyTimeHours;
    
    @Column(name = "in_progress_courses")
    private Integer inProgressCourses;
    
    @Column(name = "completed_courses")
    private Integer completedCourses;
    
    @Column(name = "average_progress")
    private Double averageProgress;
    
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
    
    // Getters, Setters, Constructors
}
```

#### 1.2. Tạo DTO Response
**File**: `api/src/main/java/com/example/lms/dto/StudentStatisticsDTO.java`

```java
public class StudentStatisticsDTO {
    private String careerGoal;
    private Integer todayGoalProgress;
    private Integer learningStreak;
    private Integer completedGoals;
    private Integer totalStudyTimeHours;
    private Integer inProgressCourses;
    private Integer completedCourses;
    private Double averageProgress;
    private LocalDateTime lastUpdated;
    
    // Getters, Setters, Constructors
}
```

---

### **PHASE 2: Backend - Repository & Service**

#### 2.1. Tạo Repository
**File**: `api/src/main/java/com/example/lms/repository/StudentStatisticsRepository.java`

```java
@Repository
public interface StudentStatisticsRepository extends JpaRepository<StudentStatistics, String> {
    Optional<StudentStatistics> findByUserId(String userId);
}
```

#### 2.2. Tạo Service
**File**: `api/src/main/java/com/example/lms/service/StudentStatisticsService.java`

```java
@Service
public class StudentStatisticsService {
    
    @Autowired
    private StudentStatisticsRepository statisticsRepository;
    
    @Autowired
    private EnrollmentRepository enrollmentRepository;
    
    @Autowired
    private LessonProgressRepository lessonProgressRepository;
    
    /**
     * Lấy thống kê của student
     */
    public StudentStatisticsDTO getStudentStatistics(String userId) {
        // Tìm hoặc tạo mới statistics
        StudentStatistics stats = statisticsRepository.findByUserId(userId)
            .orElseGet(() -> calculateAndSaveStatistics(userId));
        
        return mapToDTO(stats);
    }
    
    /**
     * Tính toán và lưu thống kê mới
     */
    private StudentStatistics calculateAndSaveStatistics(String userId) {
        StudentStatistics stats = new StudentStatistics();
        stats.setUserId(userId);
        
        // Tính số khóa học đang học và đã hoàn thành
        List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
        long inProgress = enrollments.stream()
            .filter(e -> "IN_PROGRESS".equals(e.getStatus()))
            .count();
        long completed = enrollments.stream()
            .filter(e -> "COMPLETED".equals(e.getStatus()))
            .count();
        
        stats.setInProgressCourses((int) inProgress);
        stats.setCompletedCourses((int) completed);
        
        // Tính tiến độ trung bình
        double avgProgress = enrollments.stream()
            .mapToDouble(Enrollment::getProgress)
            .average()
            .orElse(0.0);
        stats.setAverageProgress(avgProgress);
        
        // Tính tổng thời gian học (từ lesson progress)
        Integer totalMinutes = lessonProgressRepository
            .sumStudyTimeByUserId(userId);
        stats.setTotalStudyTimeHours(totalMinutes != null ? totalMinutes / 60 : 0);
        
        // Tính learning streak (số ngày học liên tục)
        int streak = calculateLearningStreak(userId);
        stats.setLearningStreak(streak);
        
        // Mặc định các giá trị khác
        stats.setCareerGoal("Chuyên gia Hàng hải");
        stats.setTodayGoalProgress(0);
        stats.setCompletedGoals(0);
        stats.setLastUpdated(LocalDateTime.now());
        
        return statisticsRepository.save(stats);
    }
    
    /**
     * Tính learning streak
     */
    private int calculateLearningStreak(String userId) {
        // Logic: Đếm số ngày liên tục có hoạt động học tập
        List<LocalDate> activityDates = lessonProgressRepository
            .findDistinctActivityDatesByUserId(userId);
        
        if (activityDates.isEmpty()) return 0;
        
        activityDates.sort(Comparator.reverseOrder());
        
        int streak = 1;
        LocalDate today = LocalDate.now();
        
        if (!activityDates.get(0).equals(today) && 
            !activityDates.get(0).equals(today.minusDays(1))) {
            return 0; // Streak bị gián đoạn
        }
        
        for (int i = 1; i < activityDates.size(); i++) {
            if (activityDates.get(i).equals(activityDates.get(i-1).minusDays(1))) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    /**
     * Cập nhật career goal
     */
    public void updateCareerGoal(String userId, String careerGoal) {
        StudentStatistics stats = statisticsRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Statistics not found"));
        stats.setCareerGoal(careerGoal);
        stats.setLastUpdated(LocalDateTime.now());
        statisticsRepository.save(stats);
    }
    
    /**
     * Cập nhật today goal progress
     */
    public void updateTodayGoalProgress(String userId, int progress) {
        StudentStatistics stats = statisticsRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Statistics not found"));
        stats.setTodayGoalProgress(progress);
        stats.setLastUpdated(LocalDateTime.now());
        statisticsRepository.save(stats);
    }
    
    private StudentStatisticsDTO mapToDTO(StudentStatistics stats) {
        StudentStatisticsDTO dto = new StudentStatisticsDTO();
        dto.setCareerGoal(stats.getCareerGoal());
        dto.setTodayGoalProgress(stats.getTodayGoalProgress());
        dto.setLearningStreak(stats.getLearningStreak());
        dto.setCompletedGoals(stats.getCompletedGoals());
        dto.setTotalStudyTimeHours(stats.getTotalStudyTimeHours());
        dto.setInProgressCourses(stats.getInProgressCourses());
        dto.setCompletedCourses(stats.getCompletedCourses());
        dto.setAverageProgress(stats.getAverageProgress());
        dto.setLastUpdated(stats.getLastUpdated());
        return dto;
    }
}
```

---

### **PHASE 3: Backend - Controller**

#### 3.1. Tạo Controller
**File**: `api/src/main/java/com/example/lms/controller/StudentStatisticsController.java`

```java
@RestController
@RequestMapping("/api/student/statistics")
@CrossOrigin(origins = "*")
public class StudentStatisticsController {
    
    @Autowired
    private StudentStatisticsService statisticsService;
    
    /**
     * GET /api/student/statistics
     * Lấy thống kê của student hiện tại
     */
    @GetMapping
    public ResponseEntity<ApiResponse<StudentStatisticsDTO>> getMyStatistics(
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername();
        StudentStatisticsDTO stats = statisticsService.getStudentStatistics(userId);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    /**
     * PUT /api/student/statistics/career-goal
     * Cập nhật career goal
     */
    @PutMapping("/career-goal")
    public ResponseEntity<ApiResponse<Void>> updateCareerGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {
        String userId = userDetails.getUsername();
        String careerGoal = request.get("careerGoal");
        statisticsService.updateCareerGoal(userId, careerGoal);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
    
    /**
     * PUT /api/student/statistics/today-goal
     * Cập nhật today goal progress
     */
    @PutMapping("/today-goal")
    public ResponseEntity<ApiResponse<Void>> updateTodayGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Integer> request) {
        String userId = userDetails.getUsername();
        Integer progress = request.get("progress");
        statisticsService.updateTodayGoalProgress(userId, progress);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
```

---

### **PHASE 4: Frontend - API Client**

#### 4.1. Tạo Statistics API
**File**: `fe/src/app/api/endpoints/statistics.api.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StudentStatistics {
  careerGoal: string;
  todayGoalProgress: number;
  learningStreak: number;
  completedGoals: number;
  totalStudyTimeHours: number;
  inProgressCourses: number;
  completedCourses: number;
  averageProgress: number;
  lastUpdated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsApi {
  private baseUrl = `${environment.apiUrl}/api/student/statistics`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy thống kê của student
   */
  getMyStatistics(): Observable<ApiResponse<StudentStatistics>> {
    return this.http.get<ApiResponse<StudentStatistics>>(this.baseUrl);
  }

  /**
   * Cập nhật career goal
   */
  updateCareerGoal(careerGoal: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.baseUrl}/career-goal`,
      { careerGoal }
    );
  }

  /**
   * Cập nhật today goal progress
   */
  updateTodayGoal(progress: number): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.baseUrl}/today-goal`,
      { progress }
    );
  }
}
```

---

### **PHASE 5: Frontend - Service Integration**

#### 5.1. Tạo Statistics Service
**File**: `fe/src/app/features/student/services/statistics.service.ts`

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { StatisticsApi, StudentStatistics } from '../../../api/endpoints/statistics.api';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentStatisticsService {
  private statisticsApi = inject(StatisticsApi);
  
  // State
  private statistics = signal<StudentStatistics | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Computed values
  careerGoal = computed(() => this.statistics()?.careerGoal || '');
  todayGoalProgress = computed(() => this.statistics()?.todayGoalProgress || 0);
  learningStreak = computed(() => this.statistics()?.learningStreak || 0);
  completedGoals = computed(() => this.statistics()?.completedGoals || 0);
  totalStudyTime = computed(() => this.statistics()?.totalStudyTimeHours || 0);
  inProgressCount = computed(() => this.statistics()?.inProgressCourses || 0);
  completedCount = computed(() => this.statistics()?.completedCourses || 0);
  averageProgress = computed(() => Math.round(this.statistics()?.averageProgress || 0));
  
  /**
   * Load statistics from API
   */
  async loadStatistics(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const response = await firstValueFrom(this.statisticsApi.getMyStatistics());
      this.statistics.set(response.data);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load statistics');
      console.error('Error loading statistics:', err);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Update career goal
   */
  async updateCareerGoal(careerGoal: string): Promise<void> {
    try {
      await firstValueFrom(this.statisticsApi.updateCareerGoal(careerGoal));
      // Reload statistics
      await this.loadStatistics();
    } catch (err: any) {
      console.error('Error updating career goal:', err);
      throw err;
    }
  }
  
  /**
   * Update today goal progress
   */
  async updateTodayGoal(progress: number): Promise<void> {
    try {
      await firstValueFrom(this.statisticsApi.updateTodayGoal(progress));
      // Reload statistics
      await this.loadStatistics();
    } catch (err: any) {
      console.error('Error updating today goal:', err);
      throw err;
    }
  }
}
```

---

### **PHASE 6: Frontend - Component Integration**

#### 6.1. Cập nhật Dashboard Component
**File**: `fe/src/app/features/student/dashboard/student-dashboard.component.ts`

```typescript
// Thay thế mock data signals bằng service
export class StudentDashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private enrollmentService = inject(StudentEnrollmentService);
  private statisticsService = inject(StudentStatisticsService); // NEW
  private courseApi = inject(CourseApi);

  // XÓA các mock signals cũ:
  // careerGoal = signal<string>('Chuyên gia Hàng hải');
  // todayGoalProgress = signal<number>(1);
  // learningStreak = signal<number>(3);
  // completedGoals = signal<number>(12);
  // totalStudyTime = signal<number>(24);
  
  // THAY BẰNG service computed values:
  careerGoal = this.statisticsService.careerGoal;
  todayGoalProgress = this.statisticsService.todayGoalProgress;
  learningStreak = this.statisticsService.learningStreak;
  completedGoals = this.statisticsService.completedGoals;
  totalStudyTime = this.statisticsService.totalStudyTime;
  
  ngOnInit(): void {
    // Load statistics
    this.statisticsService.loadStatistics();
    
    // Load enrolled courses
    this.enrollmentService.loadEnrolledCourses(1, 20);
  }
  
  // Thêm methods để edit goal
  editGoal(): void {
    // Show dialog để edit career goal
    const newGoal = prompt('Nhập mục tiêu nghề nghiệp:', this.careerGoal());
    if (newGoal) {
      this.statisticsService.updateCareerGoal(newGoal);
    }
  }
}
```

#### 6.2. Cập nhật My Courses Component
**File**: `fe/src/app/features/student/student-my-courses.component.ts`

```typescript
export class StudentMyCoursesComponent implements OnInit {
  private statisticsService = inject(StudentStatisticsService); // NEW
  
  // THAY BẰNG service computed values:
  inProgressCount = this.statisticsService.inProgressCount;
  completedCount = this.statisticsService.completedCount;
  averageProgress = this.statisticsService.averageProgress;
  
  ngOnInit(): void {
    this.loadCourses();
    this.statisticsService.loadStatistics(); // NEW
  }
}
```

---

### **PHASE 7: Database Migration**

#### 7.1. Tạo Migration Script
**File**: `api/src/main/resources/db/migration/V1__create_student_statistics.sql`

```sql
CREATE TABLE student_statistics (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    career_goal VARCHAR(255),
    today_goal_progress INT DEFAULT 0,
    learning_streak INT DEFAULT 0,
    completed_goals INT DEFAULT 0,
    total_study_time_hours INT DEFAULT 0,
    in_progress_courses INT DEFAULT 0,
    completed_courses INT DEFAULT 0,
    average_progress DOUBLE DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_student_stats_user_id ON student_statistics(user_id);
```

---

## 🚀 Thứ tự thực hiện

1. **Backend Database** → Tạo migration script và chạy
2. **Backend Entity** → Tạo StudentStatistics entity
3. **Backend Repository** → Tạo repository
4. **Backend Service** → Implement business logic
5. **Backend Controller** → Expose REST API
6. **Frontend API** → Tạo statistics.api.ts
7. **Frontend Service** → Tạo statistics.service.ts
8. **Frontend Components** → Integrate vào dashboard và my-courses
9. **Testing** → Test end-to-end

---

## ✅ Checklist

- [ ] Phase 1: Backend Entity & DTO
- [ ] Phase 2: Backend Repository & Service
- [ ] Phase 3: Backend Controller
- [ ] Phase 4: Frontend API Client
- [ ] Phase 5: Frontend Service
- [ ] Phase 6: Frontend Component Integration
- [ ] Phase 7: Database Migration
- [ ] Testing & Verification

---

## 📝 Notes

- Statistics sẽ được tính toán tự động khi student truy cập lần đầu
- Có thể thêm scheduled job để refresh statistics định kỳ
- Learning streak được tính dựa trên activity dates từ lesson_progress
- Total study time được tính từ tổng thời gian học các lessons
