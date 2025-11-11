# Design Document - Guest Area Enhancement

## Overview

This design document outlines the architecture and implementation strategy for modernizing the Guest/Public area of the LMS system by integrating 78+ high-quality components from the ThamKhao folder (LMS Maritime legacy project) into the current project.

**Key Principles:**
- **Non-Breaking**: Zero impact on existing Student, Teacher, Admin modules
- **Modular**: Clean separation between guest and authenticated areas
- **Scalable**: Easy to maintain and extend
- **Performance**: Optimized for fast load times
- **Responsive**: Mobile-first design approach

## Architecture

### High-Level Structure

```
src/app/
├── features/
│   ├── guest/                    # NEW: Guest-specific features
│   │   ├── home/
│   │   ├── courses/
│   │   ├── auth/
│   │   └── info/
│   ├── student/                  # EXISTING: No changes
│   ├── teacher/                  # EXISTING: No changes
│   └── admin/                    # EXISTING: No changes
├── shared/
│   ├── components/
│   │   ├── layout/              # ENHANCED: Guest layouts
│   │   ├── ui/                  # EXISTING: Shared UI
│   │   └── guest/               # NEW: Guest-only components
│   ├── services/
│   │   ├── guest/               # NEW: Guest services
│   │   └── core/                # EXISTING: Core services
│   └── types/                   # ENHANCED: Add guest types
└── core/                        # EXISTING: No major changes
```

### Component Hierarchy

```
HomepageLayoutComponent (Guest Layout)
├── PublicHeaderComponent
│   ├── Logo
│   ├── MegaMenuComponent
│   ├── SearchComponent
│   └── Auth Buttons (Login/Register)
├── <router-outlet>
│   ├── HomeSimpleComponent
│   ├── CoursesComponent
│   ├── CourseDetailEnhancedComponent
│   ├── ConfigurableCategoryComponent
│   ├── AboutComponent
│   ├── ContactComponent
│   ├── PrivacyPolicyComponent
│   ├── TermsOfServiceComponent
│   ├── LoginComponent
│   ├── RegisterComponent
│   └── ForgotPasswordComponent
└── FooterComponent
    ├── Newsletter Signup
    ├── Quick Links
    ├── Social Media
    └── Copyright
```



## Components and Interfaces

### 1. Layout Components

#### HomepageLayoutComponent
**Purpose**: Main wrapper for all guest/public pages
**Location**: `src/app/shared/components/layout/homepage-layout/`
**Strategy**: REPLACE existing with ThamKhao version

**Key Features:**
- Wraps PublicHeaderComponent, router-outlet, FooterComponent
- Handles scroll events for sticky header
- Manages global guest state
- Responsive container

**Template Structure:**
```html
<div class="homepage-layout">
  <app-public-header></app-public-header>
  <main class="main-content">
    <router-outlet></router-outlet>
  </main>
  <app-footer></app-footer>
</div>
```

**Signals:**
```typescript
isScrolled = signal(false);
showMobileMenu = signal(false);
```

#### PublicHeaderComponent
**Purpose**: Navigation header for guest users
**Location**: `src/app/shared/components/layout/public-header/`
**Strategy**: REPLACE existing with enhanced ThamKhao version

**Key Features:**
- Top bar with user type selector (Personal, Business, School, Government)
- Main navigation with logo
- MegaMenuComponent for course categories
- Global search
- Language switcher
- Login/Register buttons (for guests)
- User avatar dropdown (for authenticated users)
- Mobile responsive hamburger menu
- Sticky on scroll

**Signals:**
```typescript
searchQuery = signal('');
isMobileMenuOpen = signal(false);
isSearchFocused = signal(false);
selectedUserType = signal('personal');
isScrolled = signal(false);
isAuthenticated = computed(() => this.authService.isAuthenticated());
currentUser = computed(() => this.authService.currentUser());
```

**Responsive Behavior:**
- Desktop (>1024px): Full navigation with mega menu
- Tablet (768-1024px): Condensed navigation
- Mobile (<768px): Hamburger menu

#### FooterComponent
**Purpose**: Footer section with links and newsletter
**Location**: `src/app/shared/components/footer/`
**Strategy**: REPLACE existing with ThamKhao version

**Sections:**
1. Newsletter signup form
2. Company information (Maritime Academy)
3. Quick links (About, Contact, Privacy, Terms)
4. Course categories
5. Social media links
6. Copyright notice

**Signals:**
```typescript
newsletterEmail = signal('');
isSubmitting = signal(false);
```



### 2. Home Page Components

#### HomeSimpleComponent
**Purpose**: Main landing page
**Location**: `src/app/features/home/`
**Strategy**: REPLACE existing with ThamKhao version

**Sections:**
1. **Hero Section** - ParallaxBackgroundComponent with CTA
2. **Stats Section** - Platform statistics (courses, students, instructors)
3. **Features Section** - Why choose LMS Maritime
4. **Featured Courses** - FeaturedCoursesComponent
5. **Social Proof** - SocialProofComponent (partners, testimonials)
6. **CTA Section** - Final call-to-action

**Data Flow:**
```typescript
featuredCourses = signal<Course[]>([]);
stats = signal({
  totalCourses: 50,
  totalStudents: 2500,
  totalInstructors: 30,
  completionRate: 95
});
partners = signal<Partner[]>([]);
testimonials = signal<Testimonial[]>([]);
```

#### FeaturedCoursesComponent
**Purpose**: Display featured/popular courses
**Location**: `src/app/features/home/components/`
**Strategy**: NEW component from ThamKhao

**Features:**
- Grid layout (3-4 columns on desktop)
- Course cards with image, title, instructor, rating
- "View All Courses" CTA button
- Responsive grid

#### SocialProofComponent
**Purpose**: Display partners and testimonials
**Location**: `src/app/features/home/components/`
**Strategy**: NEW component from ThamKhao

**Sections:**
- Partner logos carousel
- Student testimonials
- Industry recognition



### 3. Courses Components

#### CoursesComponent
**Purpose**: Main courses listing page with filters
**Location**: `src/app/features/courses/`
**Strategy**: ENHANCE existing with ThamKhao features

**Layout:**
```
┌─────────────────────────────────────┐
│  Search Bar                         │
├──────────┬──────────────────────────┤
│ Filters  │  Course Grid             │
│ Sidebar  │  - Course Cards          │
│          │  - Pagination            │
└──────────┴──────────────────────────┘
```

**Features:**
- Search functionality
- Filter sidebar (Category, Level, Price, Rating, Duration)
- Sort options (Popular, Newest, Price, Rating)
- Course grid with CourseCardComponent
- Pagination
- Loading states
- Empty states

**Signals:**
```typescript
courses = signal<Course[]>([]);
filteredCourses = computed(() => this.applyFilters());
filters = signal<FilterOptions>({
  categories: [],
  levels: [],
  priceRange: [0, 1000000],
  minRating: 0
});
sortBy = signal<SortOption>('popular');
currentPage = signal(1);
pageSize = signal(12);
totalPages = computed(() => Math.ceil(this.filteredCourses().length / this.pageSize()));
loading = signal(false);
```

#### CourseCardComponent
**Purpose**: Individual course card display
**Location**: `src/app/features/courses/shared/`
**Strategy**: ENHANCE existing with ThamKhao design

**Display:**
- Course thumbnail image
- Course title
- Instructor name with avatar
- Rating stars + review count
- Price (or "Free")
- Enrollment count
- "View Details" button
- Hover effects

**Inputs:**
```typescript
@Input() course: Course;
@Input() layout: 'grid' | 'list' = 'grid';
```

**Outputs:**
```typescript
@Output() courseClick = new EventEmitter<string>();
```



#### CourseDetailEnhancedComponent
**Purpose**: Detailed course information page
**Location**: `src/app/features/courses/course-detail/`
**Strategy**: REPLACE existing with ThamKhao version

**Sections:**
1. **CourseHeroComponent** - Hero section with thumbnail, title, rating
2. **Course Info** - Description, what you'll learn, requirements
3. **CourseCurriculumComponent** - Expandable curriculum sections
4. **CourseInstructorComponent** - Instructor bio and credentials
5. **Reviews Section** - Student reviews and ratings
6. **Enrollment Section** - Price, enroll button, guarantee

**Data Flow:**
```typescript
courseId = input<string>();  // From route params
course = signal<CourseDetail | null>(null);
curriculum = signal<CurriculumSection[]>([]);
instructor = signal<Instructor | null>(null);
reviews = signal<Review[]>([]);
loading = signal(false);
error = signal<string | null>(null);
```

**API Integration:**
```typescript
ngOnInit() {
  const id = this.courseId();
  if (id) {
    this.loadCourseDetail(id);
  }
}

loadCourseDetail(id: string) {
  this.loading.set(true);
  this.courseDetailService.getCourseById(id).subscribe({
    next: (course) => {
      this.course.set(course);
      this.curriculum.set(course.curriculum);
      this.instructor.set(course.instructor);
      this.loading.set(false);
    },
    error: (err) => {
      this.error.set('Failed to load course');
      this.loading.set(false);
    }
  });
}
```

#### CourseCurriculumComponent
**Purpose**: Display course curriculum with expandable sections
**Location**: `src/app/features/courses/course-detail/components/`
**Strategy**: NEW component from ThamKhao

**Features:**
- Expandable/collapsible sections
- Lesson list with duration
- Video icons for video lessons
- Lock icons for premium content
- Total duration calculation

**Inputs:**
```typescript
@Input() curriculum: CurriculumSection[];
@Input() isEnrolled: boolean = false;
```



### 4. Category Pages

#### ConfigurableCategoryComponent
**Purpose**: Dynamic category landing pages
**Location**: `src/app/features/courses/category/`
**Strategy**: KEEP existing, ENHANCE with ThamKhao sub-components

**Supported Categories:**
1. Safety (An toàn Hàng hải)
2. Navigation (Điều khiển Tàu)
3. Engineering (Kỹ thuật Máy tàu)
4. Logistics (Logistics Hàng hải)
5. Law (Luật Hàng hải)
6. Certificates (Chứng chỉ Chuyên môn)

**Route Configuration:**
```typescript
{
  path: 'courses/safety',
  component: ConfigurableCategoryComponent,
  data: { category: 'safety' }
}
```

**Sections:**
1. **CategoryHeroComponent** - Hero with category-specific imagery
2. **Category Description** - Overview of category
3. **CategoryCourseGridComponent** - Filtered courses
4. **CategoryTrendsComponent** - Industry trends and statistics
5. **CategoryCareerComponent** - Career paths and opportunities

**Data Flow:**
```typescript
category = input<string>();  // From route data
categoryConfig = computed(() => this.getCategoryConfig(this.category()));
courses = signal<Course[]>([]);
trends = signal<TrendData | null>(null);
careers = signal<CareerPath[]>([]);
```

#### CategoryHeroComponent
**Purpose**: Hero section for category pages
**Location**: `src/app/features/courses/category/shared/`
**Strategy**: NEW component from ThamKhao

**Features:**
- Category-specific background image
- Category title and icon
- Description text
- CTA button
- Parallax effect

**Inputs:**
```typescript
@Input() category: CategoryConfig;
```



### 5. Authentication Components

#### LoginComponent
**Purpose**: User login page
**Location**: `src/app/features/auth/login/`
**Strategy**: REPLACE existing with ThamKhao version

**Features:**
- Email/username input with validation
- Password input with show/hide toggle
- "Remember me" checkbox
- "Forgot password?" link
- Social login buttons (Google, Facebook) - Optional
- "Don't have an account? Register" link
- Form validation with error messages
- Loading state during authentication

**Form Structure:**
```typescript
loginForm = signal({
  email: '',
  password: '',
  rememberMe: false
});

errors = signal<{[key: string]: string}>({});
isSubmitting = signal(false);
```

**Validation Rules:**
- Email: Required, valid email format
- Password: Required, min 6 characters

**API Integration:**
```typescript
onSubmit() {
  if (!this.validateForm()) return;
  
  this.isSubmitting.set(true);
  this.authService.login(
    this.loginForm().email,
    this.loginForm().password,
    this.loginForm().rememberMe
  ).subscribe({
    next: (response) => {
      this.router.navigate([this.getRedirectUrl()]);
    },
    error: (err) => {
      this.errors.set({ general: 'Invalid credentials' });
      this.isSubmitting.set(false);
    }
  });
}
```

#### RegisterComponent
**Purpose**: User registration page
**Location**: `src/app/features/auth/register/`
**Strategy**: REPLACE existing with ThamKhao version

**Features:**
- Full name input
- Email input with validation
- Password input with strength indicator
- Confirm password input
- Terms & conditions checkbox
- Social signup buttons (Optional)
- "Already have an account? Login" link
- Multi-step form (Optional)

**Form Structure:**
```typescript
registerForm = signal({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
});

passwordStrength = computed(() => this.calculatePasswordStrength());
errors = signal<{[key: string]: string}>({});
isSubmitting = signal(false);
```

**Validation Rules:**
- Full Name: Required, min 3 characters
- Email: Required, valid email, unique
- Password: Required, min 8 characters, must include uppercase, lowercase, number
- Confirm Password: Must match password
- Accept Terms: Must be checked



#### ForgotPasswordComponent
**Purpose**: Password reset flow
**Location**: `src/app/features/auth/forgot-password/`
**Strategy**: REPLACE existing with ThamKhao version

**Multi-Step Flow:**
1. **Step 1**: Enter email address
2. **Step 2**: Verify email code (sent to email)
3. **Step 3**: Enter new password
4. **Step 4**: Confirmation message

**State Management:**
```typescript
currentStep = signal<1 | 2 | 3 | 4>(1);
email = signal('');
verificationCode = signal('');
newPassword = signal('');
confirmPassword = signal('');
isSubmitting = signal(false);
```

### 6. Information Pages

#### AboutComponent
**Purpose**: About the platform/organization
**Location**: `src/app/features/about/`
**Strategy**: REPLACE existing with ThamKhao version

**Sections:**
- Mission & Vision
- History timeline
- Team members
- Core values
- Achievements & certifications

#### ContactComponent
**Purpose**: Contact form and information
**Location**: `src/app/features/contact/`
**Strategy**: REPLACE existing with ThamKhao version

**Features:**
- Contact form (name, email, phone, subject, message)
- Contact information (address, phone, email)
- Map integration (Optional)
- Social media links
- Office hours

**Form Structure:**
```typescript
contactForm = signal({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
});
```

#### PrivacyPolicyComponent & TermsOfServiceComponent
**Purpose**: Legal pages
**Location**: `src/app/features/privacy/`, `src/app/features/terms/`
**Strategy**: REPLACE existing with ThamKhao version

**Features:**
- Structured content with sections
- Table of contents navigation
- Last updated date
- Print-friendly layout



## Data Models

### Course Types

```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: Instructor;
  category: CourseCategory;
  level: CourseLevel;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  duration: number;  // in minutes
  lessons: number;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseDetail extends Course {
  objectives: string[];
  requirements: string[];
  curriculum: CurriculumSection[];
  reviews: Review[];
  relatedCourses: Course[];
}

interface CurriculumSection {
  id: string;
  title: string;
  lessons: Lesson[];
  duration: number;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'quiz' | 'assignment';
  duration: number;
  isFree: boolean;  // Preview lessons
  order: number;
}

type CourseCategory = 
  | 'safety' 
  | 'navigation' 
  | 'engineering' 
  | 'logistics' 
  | 'law' 
  | 'certificates';

type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
```

### User Types

```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
}

type UserRole = 'student' | 'teacher' | 'admin';

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
```

### Filter & Search Types

```typescript
interface FilterOptions {
  categories: CourseCategory[];
  levels: CourseLevel[];
  priceRange: [number, number];
  minRating: number;
  duration?: [number, number];
}

type SortOption = 
  | 'popular' 
  | 'newest' 
  | 'price-low' 
  | 'price-high' 
  | 'rating';

interface SearchParams {
  query: string;
  filters: FilterOptions;
  sortBy: SortOption;
  page: number;
  pageSize: number;
}
```



## Error Handling

### Error Types

```typescript
interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Common error codes
const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;
```

### Error Handling Strategy

**1. Component Level:**
```typescript
error = signal<string | null>(null);

loadData() {
  this.loading.set(true);
  this.error.set(null);
  
  this.service.getData().subscribe({
    next: (data) => {
      this.data.set(data);
      this.loading.set(false);
    },
    error: (err) => {
      this.error.set(this.getErrorMessage(err));
      this.loading.set(false);
    }
  });
}
```

**2. Global Error Interceptor:**
- Catch HTTP errors
- Show toast notifications
- Log errors to analytics
- Redirect on auth errors

**3. User-Friendly Messages:**
- Network errors: "Unable to connect. Please check your internet."
- Auth errors: "Invalid credentials. Please try again."
- Not found: "The requested resource was not found."
- Server errors: "Something went wrong. Please try again later."



## Testing Strategy

### Unit Testing

**Components to Test:**
- All page components (Home, Courses, Auth, etc.)
- Shared components (Header, Footer, Cards, etc.)
- Services (Auth, Courses, etc.)
- Pipes and utilities

**Test Coverage Goals:**
- Components: 80%+
- Services: 90%+
- Utilities: 95%+

**Example Test:**
```typescript
describe('LoginComponent', () => {
  it('should validate email format', () => {
    component.loginForm.set({
      email: 'invalid-email',
      password: 'password123',
      rememberMe: false
    });
    
    expect(component.validateForm()).toBe(false);
    expect(component.errors().email).toBeTruthy();
  });
  
  it('should call authService.login on submit', () => {
    const authService = TestBed.inject(AuthService);
    spyOn(authService, 'login').and.returnValue(of(mockAuthResponse));
    
    component.onSubmit();
    
    expect(authService.login).toHaveBeenCalled();
  });
});
```

### Integration Testing

**Key Flows to Test:**
1. Homepage → Courses → Course Detail → Enroll
2. Homepage → Login → Dashboard
3. Homepage → Register → Email Verification → Login
4. Courses → Filter → Search → View Results
5. Course Detail → Curriculum → Preview Lesson

### E2E Testing (Optional)

**Critical Paths:**
- User registration flow
- User login flow
- Course browsing and enrollment
- Navigation between pages
- Responsive design on mobile



## Integration Strategy

### Phase 1: Analysis & Preparation
1. Analyze all ThamKhao components
2. Map ThamKhao → Current Project
3. Identify conflicts and overlaps
4. Create backup of current project
5. Document integration plan

### Phase 2: Shared Components
1. Copy shared/layout components
2. Copy shared/footer component
3. Copy shared UI components (pagination, search, etc.)
4. Test shared components in isolation
5. Verify no breaking changes

### Phase 3: Home Page
1. Copy HomeSimpleComponent
2. Copy FeaturedCoursesComponent
3. Copy SocialProofComponent
4. Integrate with existing routing
5. Test homepage functionality

### Phase 4: Courses Module
1. Enhance CoursesComponent
2. Replace CourseDetailEnhancedComponent
3. Add category components
4. Test courses listing and detail
5. Verify API integration

### Phase 5: Authentication
1. Replace LoginComponent
2. Replace RegisterComponent
3. Replace ForgotPasswordComponent
4. Test auth flow end-to-end
5. Verify token management

### Phase 6: Information Pages
1. Replace AboutComponent
2. Replace ContactComponent
3. Replace PrivacyPolicyComponent
4. Replace TermsOfServiceComponent
5. Test all info pages

### Phase 7: Services & Types
1. Integrate guest services
2. Merge type definitions
3. Resolve conflicts
4. Update service dependencies
5. Test service integration

### Phase 8: Testing & Validation
1. Run unit tests
2. Run integration tests
3. Test responsive design
4. Verify existing modules work
5. Performance testing

### Phase 9: Documentation
1. Document component hierarchy
2. Document API integration
3. Create migration guide
4. Update README
5. Create troubleshooting guide

### Phase 10: Deployment
1. Final testing on staging
2. Performance audit
3. Security review
4. Deploy to production
5. Monitor for issues



## Conflict Resolution Strategy

### Scenario 1: Component Name Conflicts

**Problem**: Both projects have `CoursesComponent`

**Solution**:
- Analyze both components
- If ThamKhao version is superior: REPLACE
- If current version has unique features: MERGE
- Keep backup of original

**Example:**
```typescript
// Option A: Replace
// Delete current CoursesComponent
// Copy ThamKhao CoursesComponent

// Option B: Merge
// Keep current CoursesComponent structure
// Add ThamKhao features (filters, search, etc.)
// Enhance UI with ThamKhao design
```

### Scenario 2: Service Conflicts

**Problem**: Both projects have `AuthService`

**Solution**:
- Current AuthService is core - DO NOT REPLACE
- Extract useful methods from ThamKhao AuthService
- Add as new methods to current AuthService
- Maintain backward compatibility

**Example:**
```typescript
// Current AuthService (KEEP)
class AuthService {
  login(email, password) { ... }
  logout() { ... }
  
  // ADD from ThamKhao
  loginWithGoogle() { ... }
  loginWithFacebook() { ... }
  sendPasswordResetEmail() { ... }
}
```

### Scenario 3: Type Definition Conflicts

**Problem**: Both projects define `Course` type differently

**Solution**:
- Create unified type that includes all fields
- Use optional fields for non-common properties
- Create type guards for runtime checks

**Example:**
```typescript
// Unified Course type
interface Course {
  // Common fields
  id: string;
  title: string;
  description: string;
  
  // From current project
  sections?: Section[];
  
  // From ThamKhao
  curriculum?: CurriculumSection[];
  
  // Computed
  get content() {
    return this.sections || this.curriculum || [];
  }
}
```

### Scenario 4: Routing Conflicts

**Problem**: Both projects define routes at same paths

**Solution**:
- Preserve existing authenticated routes
- Replace/enhance guest routes
- Use route guards to separate concerns

**Example:**
```typescript
// KEEP existing authenticated routes
{
  path: 'student',
  loadChildren: () => import('./features/student/student.routes')
}

// REPLACE guest routes
{
  path: '',
  component: HomepageLayoutComponent,  // From ThamKhao
  children: [
    { path: '', component: HomeSimpleComponent },  // From ThamKhao
    // ... other guest routes
  ]
}
```



## Non-Breaking Integration Guarantees

### Protected Modules

**These modules MUST NOT be modified:**
1. `src/app/features/student/` - Student module
2. `src/app/features/teacher/` - Teacher module
3. `src/app/features/admin/` - Admin module
4. `src/app/features/learning/` - Learning interface
5. `src/app/core/services/auth.service.ts` - Core auth service
6. `src/app/core/guards/` - Auth guards

### Isolation Strategy

**1. Separate Guest Services:**
```typescript
// NEW: Guest-specific services
src/app/shared/services/guest/
├── guest-courses.service.ts
├── guest-analytics.service.ts
└── guest-notification.service.ts

// EXISTING: Core services (untouched)
src/app/core/services/
├── auth.service.ts
├── user.service.ts
└── ...
```

**2. Separate Guest Components:**
```typescript
// NEW: Guest-only components
src/app/shared/components/guest/
├── guest-header.component.ts
├── guest-footer.component.ts
└── ...

// EXISTING: Shared UI (untouched)
src/app/shared/components/ui/
├── button.component.ts
├── modal.component.ts
└── ...
```

**3. Route Isolation:**
```typescript
// Guest routes under HomepageLayoutComponent
{
  path: '',
  component: HomepageLayoutComponent,
  children: [/* guest routes */]
}

// Authenticated routes separate
{
  path: 'student',
  canActivate: [authGuard],
  children: [/* student routes */]
}
```

### Verification Checklist

Before deployment, verify:
- [ ] Student dashboard loads correctly
- [ ] Teacher dashboard loads correctly
- [ ] Admin dashboard loads correctly
- [ ] Learning interface works
- [ ] Course enrollment works
- [ ] User authentication works
- [ ] All existing API calls succeed
- [ ] No console errors in authenticated areas
- [ ] No broken links or routes
- [ ] All existing tests pass



## Performance Optimization

### Lazy Loading Strategy

```typescript
// Lazy load guest pages
{
  path: 'courses',
  loadComponent: () => import('./features/courses/courses.component')
    .then(m => m.CoursesComponent)
}

// Lazy load category pages
{
  path: 'courses/:category',
  loadComponent: () => import('./features/courses/category/configurable-category.component')
    .then(m => m.ConfigurableCategoryComponent)
}
```

### Image Optimization

**Strategy:**
- Use WebP format with JPEG fallback
- Implement lazy loading for images
- Use responsive images with srcset
- Compress images before upload
- Use CDN for static assets

**Example:**
```html
<img 
  [src]="course.thumbnail" 
  [alt]="course.title"
  loading="lazy"
  class="course-thumbnail"
/>
```

### Change Detection Optimization

**Use OnPush strategy:**
```typescript
@Component({
  selector: 'app-course-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

**Use signals for reactive state:**
```typescript
courses = signal<Course[]>([]);
filteredCourses = computed(() => this.applyFilters());
```

### Bundle Size Optimization

**Strategies:**
- Tree-shaking unused code
- Code splitting by route
- Minimize third-party dependencies
- Use Angular's built-in features

**Target Metrics:**
- Initial bundle: < 200KB
- Lazy chunks: < 50KB each
- Total bundle: < 500KB

### Caching Strategy

**Browser Caching:**
- Static assets: 1 year
- API responses: 5 minutes
- Images: 1 month

**Service Worker (Optional):**
- Cache static assets
- Cache API responses
- Offline fallback page



## Security Considerations

### Input Validation

**Client-Side:**
- Validate all form inputs
- Sanitize user input
- Use Angular's built-in validators
- Custom validators for complex rules

**Example:**
```typescript
emailValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : { invalidEmail: true };
}
```

### XSS Prevention

**Strategy:**
- Use Angular's built-in sanitization
- Never use `innerHTML` with user content
- Use `DomSanitizer` when necessary
- Escape user-generated content

**Example:**
```typescript
// SAFE: Angular automatically sanitizes
<div>{{ userContent }}</div>

// UNSAFE: Direct innerHTML
<div [innerHTML]="userContent"></div>

// SAFE: With sanitizer
<div [innerHTML]="sanitizer.sanitize(SecurityContext.HTML, userContent)"></div>
```

### CSRF Protection

**Strategy:**
- Use Angular's HttpClient (includes CSRF token)
- Verify CSRF token on backend
- Use SameSite cookies

### Authentication Security

**Strategy:**
- Store tokens in httpOnly cookies (preferred)
- Or use secure localStorage with encryption
- Implement token refresh mechanism
- Clear tokens on logout
- Implement session timeout

**Example:**
```typescript
// Token storage
setToken(token: string) {
  // Option 1: httpOnly cookie (backend sets)
  // Option 2: Encrypted localStorage
  const encrypted = this.encrypt(token);
  localStorage.setItem('auth_token', encrypted);
}

// Token refresh
refreshToken() {
  return this.http.post('/api/auth/refresh', {
    refreshToken: this.getRefreshToken()
  });
}
```

### Rate Limiting

**Client-Side:**
- Debounce search inputs
- Throttle API calls
- Disable submit buttons during processing

**Example:**
```typescript
searchQuery = signal('');

// Debounced search
searchCourses = computed(() => {
  const query = this.searchQuery();
  return debounce(() => this.performSearch(query), 300);
});
```



## Accessibility (A11y)

### WCAG 2.1 Level AA Compliance

**Key Requirements:**
1. Keyboard navigation support
2. Screen reader compatibility
3. Sufficient color contrast
4. Focus indicators
5. Alt text for images
6. ARIA labels where needed

### Implementation Guidelines

**1. Semantic HTML:**
```html
<!-- GOOD -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/courses">Courses</a></li>
  </ul>
</nav>

<!-- BAD -->
<div class="nav">
  <div class="link" (click)="navigate()">Courses</div>
</div>
```

**2. Keyboard Navigation:**
```typescript
// Ensure all interactive elements are keyboard accessible
<button (click)="submit()" (keydown.enter)="submit()">
  Submit
</button>

// Trap focus in modals
trapFocus(modal: HTMLElement) {
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  // Implement focus trap logic
}
```

**3. ARIA Labels:**
```html
<!-- Form inputs -->
<label for="email">Email Address</label>
<input 
  id="email" 
  type="email" 
  aria-required="true"
  aria-invalid="false"
/>

<!-- Buttons -->
<button aria-label="Close dialog">
  <i class="icon-close"></i>
</button>

<!-- Loading states -->
<div role="status" aria-live="polite">
  @if (loading()) {
    <span>Loading courses...</span>
  }
</div>
```

**4. Color Contrast:**
- Text: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio

**5. Focus Indicators:**
```scss
// Visible focus indicators
button:focus,
a:focus,
input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

// Skip to main content link
.skip-to-main {
  position: absolute;
  top: -40px;
  left: 0;
  
  &:focus {
    top: 0;
  }
}
```

### Testing Tools

- axe DevTools
- WAVE browser extension
- Lighthouse accessibility audit
- Screen reader testing (NVDA, JAWS, VoiceOver)



## Responsive Design

### Breakpoints

```scss
// Tailwind CSS breakpoints
$breakpoints: (
  'sm': 640px,   // Mobile landscape
  'md': 768px,   // Tablet
  'lg': 1024px,  // Desktop
  'xl': 1280px,  // Large desktop
  '2xl': 1536px  // Extra large
);
```

### Mobile-First Approach

**Base styles for mobile, enhance for larger screens:**

```html
<!-- Grid layout -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Course cards -->
</div>

<!-- Navigation -->
<nav class="hidden lg:flex">
  <!-- Desktop navigation -->
</nav>
<button class="lg:hidden" (click)="toggleMobileMenu()">
  <!-- Mobile hamburger -->
</button>
```

### Touch Targets

**Minimum size: 44x44px for touch targets**

```scss
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}
```

### Responsive Images

```html
<img 
  [src]="course.thumbnail"
  [srcset]="
    course.thumbnail_small + ' 320w, ' +
    course.thumbnail_medium + ' 768w, ' +
    course.thumbnail_large + ' 1024w'
  "
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  [alt]="course.title"
/>
```

### Testing Matrix

| Device | Viewport | Test Scenarios |
|--------|----------|----------------|
| iPhone SE | 375x667 | Navigation, Forms, Cards |
| iPhone 12 | 390x844 | Navigation, Forms, Cards |
| iPad | 768x1024 | Grid layouts, Filters |
| Desktop | 1920x1080 | Full features |



## Monitoring & Analytics

### Performance Monitoring

**Metrics to Track:**
- Page load time
- Time to interactive (TTI)
- First contentful paint (FCP)
- Largest contentful paint (LCP)
- Cumulative layout shift (CLS)

**Tools:**
- Google Lighthouse
- Web Vitals
- Chrome DevTools Performance tab

### User Analytics

**Events to Track:**
```typescript
// Page views
analytics.trackPageView('/courses');

// User actions
analytics.trackEvent('course_view', {
  courseId: course.id,
  courseName: course.title
});

analytics.trackEvent('course_enroll_click', {
  courseId: course.id,
  price: course.price
});

// Form submissions
analytics.trackEvent('contact_form_submit', {
  success: true
});

// Errors
analytics.trackError('api_error', {
  endpoint: '/api/courses',
  statusCode: 500
});
```

### Error Tracking

**Integration with error tracking service:**
```typescript
// Global error handler
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error) {
    // Log to console
    console.error(error);
    
    // Send to error tracking service
    errorTrackingService.captureException(error);
    
    // Show user-friendly message
    notificationService.showError('Something went wrong');
  }
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] No console warnings (acceptable)
- [ ] Responsive design verified
- [ ] Accessibility audit passed
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Cross-browser testing done
- [ ] Existing modules verified working

### Deployment Steps

1. Create production build
2. Run final tests on build
3. Deploy to staging environment
4. Smoke test on staging
5. Get stakeholder approval
6. Deploy to production
7. Monitor for errors
8. Verify all features working
9. Check analytics for issues
10. Document any issues

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify user flows working
- [ ] Monitor server load
- [ ] Check for broken links
- [ ] Verify API calls succeeding
- [ ] Monitor user feedback
- [ ] Document lessons learned

## Success Metrics

### Technical Metrics

- Lighthouse Performance: > 90
- Lighthouse Accessibility: > 95
- Lighthouse Best Practices: > 90
- Lighthouse SEO: > 90
- Bundle size: < 500KB
- Page load time: < 3s
- Time to interactive: < 5s

### Business Metrics

- User registration rate
- Course enrollment rate
- Page bounce rate
- Session duration
- Pages per session
- Conversion rate

### User Experience Metrics

- Task completion rate
- Error rate
- User satisfaction score
- Net Promoter Score (NPS)

---

**Document Version**: 1.0  
**Last Updated**: November 12, 2025  
**Status**: Ready for Implementation

