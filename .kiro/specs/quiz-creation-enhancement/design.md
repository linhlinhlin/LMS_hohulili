# Design Document: Quiz Creation Enhancement

## Overview

This design document outlines the technical approach for enhancing the quiz creation flow in the LMS Teacher interface. The enhancement integrates the Package System into the Section Editor, providing a unified experience consistent with Quiz Bank while maintaining backward compatibility with the legacy course-based question approach.

The design follows a phased approach:
- **Phase 1** (Completed): Package integration into existing flow
- **Phase 2** (Planned): One-step quiz creation modal

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Section Editor Component                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Quiz Creation Interface                      │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ Package Selector│  │  Question Selection List  │   │  │
│  │  │   (Recommended) │  │  - Multi-select checkboxes│   │  │
│  │  │                 │  │  - Select All / Clear     │   │  │
│  │  └────────┬────────┘  │  - Question preview       │   │  │
│  │           │           └──────────────────────────┘   │  │
│  │           ▼                                           │  │
│  │  ┌─────────────────┐                                 │  │
│  │  │ Legacy Options  │                                 │  │
│  │  │ - Load by Course│                                 │  │
│  │  │ - Quiz Bank     │                                 │  │
│  │  └─────────────────┘                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend APIs                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Package API  │  │ Question API │  │   Quiz API   │     │
│  │              │  │              │  │              │     │
│  │ - getMyPkgs  │  │ - getByCourse│  │ - create     │     │
│  │ - getQs      │  │              │  │ - addQs      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

The Section Editor component is enhanced with:

1. **Package Management Layer**
   - Package loading and caching
   - Package selection state management
   - Question loading by package

2. **Question Selection Layer**
   - Multi-select question list
   - Selection state management
   - Question filtering and display

3. **Legacy Compatibility Layer**
   - Course-based question loading
   - Quiz Bank integration
   - Backward-compatible workflows

## Components and Interfaces

### 1. Section Editor Component (Enhanced)

**File:** `fe/src/app/features/teacher/courses/section-editor.component.ts`

#### New Dependencies

```typescript
import { PackageApi, PackageDTO } from '../../../api/endpoints/package.api';
```

#### New Signals (State Management)

```typescript
// Package system
packages = signal<PackageDTO[]>([]);           // Available packages
selectedPackageId = signal<string>('');        // Currently selected package
packagesLoading = signal<boolean>(false);      // Loading state

// Existing signals (for reference)
courseQuestions = signal<Question[]>([]);      // Questions to display
courseQuestionsLoading = signal<boolean>(false);
courseQuestionsError = signal<string>('');
```

#### New Methods

```typescript
/**
 * Load all packages available to the current teacher
 * Called on component initialization
 */
async loadPackages(): Promise<void>

/**
 * Load questions from a specific package
 * @param packageId - The ID of the package to load questions from
 */
async loadQuestionsFromPackage(packageId: string): Promise<void>

/**
 * Handle package selection change
 * @param packageId - The newly selected package ID
 */
onPackageChange(packageId: string): void
```

#### Enhanced Methods

```typescript
/**
 * Enhanced initialization to include package loading
 */
async ngOnInit(): Promise<void> {
  await this.loadSection();
  await this.loadLessons();
  await this.loadPackages(); // NEW: Load packages for quiz creation
}
```

### 2. Package API Service

**File:** `fe/src/app/api/endpoints/package.api.ts`

#### Interface

```typescript
interface PackageDTO {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

class PackageApi {
  /**
   * Get all packages owned by the current user
   */
  getMyPackages(): Observable<PackageDTO[]>
  
  /**
   * Get all questions in a specific package
   */
  getQuestionsInPackage(packageId: string): Observable<Question[]>
}
```

## Data Models

### PackageDTO

```typescript
interface PackageDTO {
  id: string;              // UUID
  name: string;            // Package name
  description: string;     // Package description
  questionCount: number;   // Number of questions in package
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### Question (Existing)

```typescript
interface Question {
  id: string;
  content: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: QuestionOption[];
  correctAnswerId: string;
  explanation?: string;
  courseId?: string;       // Legacy: direct course association
  packageId?: string;      // New: package association
}
```

### UI State Model

```typescript
interface QuizCreationState {
  // Package selection
  packages: PackageDTO[];
  selectedPackageId: string;
  packagesLoading: boolean;
  
  // Question selection
  availableQuestions: Question[];
  selectedQuestionIds: Set<string>;
  questionsLoading: boolean;
  questionsError: string;
  
  // Quiz metadata
  quizTitle: string;
  quizDescription: string;
  timeLimit?: number;
  passingScore: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Package Selection Loads Correct Questions

*For any* valid package ID, when a teacher selects that package, the system should load and display exactly the questions that belong to that package, and no others.

**Validates: Requirements 1.2**

### Property 2: Question Selection State Consistency

*For any* sequence of select/deselect operations, the set of selected questions should always match the visual state shown to the user, with no phantom selections or missing selections.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Select All Idempotence

*For any* question list, clicking "Select All" multiple times should produce the same result as clicking it once—all questions selected.

**Validates: Requirements 2.2**

### Property 4: Clear Selection Idempotence

*For any* question list, clicking "Clear Selection" multiple times should produce the same result as clicking it once—no questions selected.

**Validates: Requirements 2.3**

### Property 5: Package Refresh Consistency

*For any* state of the package list, refreshing should either return the same packages (if unchanged) or return an updated list that reflects backend changes, never returning stale or corrupted data.

**Validates: Requirements 5.2, 5.4**

### Property 6: Source Indicator Accuracy

*For any* loaded question list, the source indicator (package name or "From Course") should accurately reflect the actual source of the questions, never showing incorrect or outdated information.

**Validates: Requirements 6.1, 6.2, 6.5**

### Property 7: Legacy Compatibility Preservation

*For any* quiz creation operation using the legacy course-based approach, the system should produce the same result as before the enhancement, maintaining backward compatibility.

**Validates: Requirements 3.5**

### Property 8: Empty State Guidance Accuracy

*For any* combination of package selection and question availability, the system should display the appropriate empty state message that accurately describes the situation and provides helpful guidance.

**Validates: Requirements 1.5, 4.2**

## Error Handling

### Package Loading Errors

```typescript
try {
  const packages = await firstValueFrom(this.packageApi.getMyPackages());
  this.packages.set(packages);
} catch (error: any) {
  console.error('❌ Error loading packages:', error);
  // Graceful degradation: allow legacy flow to continue
  // Don't block the entire interface
}
```

**Strategy:** Fail gracefully, log error, allow legacy workflow

### Question Loading Errors

```typescript
try {
  const questions = await firstValueFrom(
    this.packageApi.getQuestionsInPackage(packageId)
  );
  this.courseQuestions.set(questions);
} catch (error: any) {
  console.error('❌ Error loading package questions:', error);
  this.courseQuestionsError.set('Không thể tải câu hỏi từ gói');
  // Show error message to user
  // Allow retry or alternative approach
}
```

**Strategy:** Show user-friendly error, allow retry, suggest alternatives

### Network Timeout Handling

```typescript
// Set reasonable timeouts for API calls
const TIMEOUT_MS = 10000; // 10 seconds

const questions$ = this.packageApi.getQuestionsInPackage(packageId).pipe(
  timeout(TIMEOUT_MS),
  catchError(error => {
    if (error.name === 'TimeoutError') {
      return throwError(() => new Error('Request timed out. Please try again.'));
    }
    return throwError(() => error);
  })
);
```

**Strategy:** Timeout after 10s, show specific timeout message

### Race Condition Prevention

```typescript
private currentLoadOperation: string | null = null;

async loadQuestionsFromPackage(packageId: string) {
  // Prevent race conditions from rapid package switching
  this.currentLoadOperation = packageId;
  
  try {
    const questions = await firstValueFrom(
      this.packageApi.getQuestionsInPackage(packageId)
    );
    
    // Only update if this is still the current operation
    if (this.currentLoadOperation === packageId) {
      this.courseQuestions.set(questions);
    }
  } finally {
    if (this.currentLoadOperation === packageId) {
      this.currentLoadOperation = null;
    }
  }
}
```

**Strategy:** Track current operation, ignore stale responses

## Testing Strategy

### Unit Testing

**Framework:** Jasmine/Karma (Angular default)

**Test Coverage:**

1. **Component Logic Tests**
   ```typescript
   describe('SectionEditorComponent - Package Integration', () => {
     it('should load packages on initialization', async () => {
       // Test that ngOnInit calls loadPackages
     });
     
     it('should update selectedPackageId when package changes', () => {
       // Test onPackageChange updates signal
     });
     
     it('should load questions when package is selected', async () => {
       // Test loadQuestionsFromPackage is called
     });
     
     it('should clear questions when empty package ID is provided', async () => {
       // Test empty string clears question list
     });
   });
   ```

2. **State Management Tests**
   ```typescript
   describe('Question Selection State', () => {
     it('should select all questions when selectAllQuestions is called', () => {
       // Test select all functionality
     });
     
     it('should clear all selections when clearQuestionSelection is called', () => {
       // Test clear selection functionality
     });
     
     it('should toggle individual question selection', () => {
       // Test single question toggle
     });
   });
   ```

3. **Error Handling Tests**
   ```typescript
   describe('Error Handling', () => {
     it('should handle package loading failure gracefully', async () => {
       // Mock API error, verify error handling
     });
     
     it('should display error message when question loading fails', async () => {
       // Mock API error, verify error message shown
     });
   });
   ```

### Property-Based Testing

**Framework:** fast-check (TypeScript property-based testing library)

**Configuration:** Each property test should run minimum 100 iterations

**Property Tests:**

1. **Property 1: Package Selection Loads Correct Questions**
   ```typescript
   /**
    * Feature: quiz-creation-enhancement, Property 1: Package Selection Loads Correct Questions
    * Validates: Requirements 1.2
    */
   it('should load exactly the questions belonging to selected package', () => {
     fc.assert(
       fc.asyncProperty(
         fc.uuid(), // packageId
         fc.array(questionArbitrary()), // expected questions
         async (packageId, expectedQuestions) => {
           // Mock API to return expectedQuestions for packageId
           // Select package
           // Verify loaded questions match expectedQuestions exactly
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

2. **Property 2: Question Selection State Consistency**
   ```typescript
   /**
    * Feature: quiz-creation-enhancement, Property 2: Question Selection State Consistency
    * Validates: Requirements 2.1, 2.2, 2.3
    */
   it('should maintain consistent selection state across operations', () => {
     fc.assert(
       fc.property(
         fc.array(questionArbitrary()),
         fc.array(fc.nat()), // indices to select
         (questions, indicesToSelect) => {
           // Load questions
           // Perform selection operations
           // Verify internal state matches UI state
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

3. **Property 3: Select All Idempotence**
   ```typescript
   /**
    * Feature: quiz-creation-enhancement, Property 3: Select All Idempotence
    * Validates: Requirements 2.2
    */
   it('should produce same result when selectAll called multiple times', () => {
     fc.assert(
       fc.property(
         fc.array(questionArbitrary()),
         fc.integer({ min: 1, max: 5 }), // number of times to call
         (questions, callCount) => {
           // Load questions
           // Call selectAll multiple times
           // Verify all questions selected, no duplicates
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

4. **Property 4: Clear Selection Idempotence**
   ```typescript
   /**
    * Feature: quiz-creation-enhancement, Property 4: Clear Selection Idempotence
    * Validates: Requirements 2.3
    */
   it('should produce same result when clearSelection called multiple times', () => {
     fc.assert(
       fc.property(
         fc.array(questionArbitrary()),
         fc.integer({ min: 1, max: 5 }),
         (questions, callCount) => {
           // Load and select some questions
           // Call clearSelection multiple times
           // Verify no questions selected
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

5. **Property 8: Empty State Guidance Accuracy**
   ```typescript
   /**
    * Feature: quiz-creation-enhancement, Property 8: Empty State Guidance Accuracy
    * Validates: Requirements 1.5, 4.2
    */
   it('should display correct empty state for any package/question combination', () => {
     fc.assert(
       fc.property(
         fc.option(fc.uuid(), { nil: null }), // packageId or null
         fc.array(questionArbitrary()), // questions (may be empty)
         fc.boolean(), // loading state
         (packageId, questions, isLoading) => {
           // Set state
           // Verify correct empty state message displayed
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

### Integration Testing

**Scope:** End-to-end quiz creation flow

1. **Package-based Quiz Creation**
   - Select package → Load questions → Select questions → Create quiz
   - Verify quiz created with correct questions

2. **Legacy Quiz Creation**
   - Load by course → Select questions → Create quiz
   - Verify backward compatibility

3. **Mixed Workflow**
   - Switch between package and course loading
   - Verify state resets correctly

### Manual Testing Checklist

- [ ] Package dropdown populates on page load
- [ ] Selecting package loads correct questions
- [ ] Question count matches package metadata
- [ ] Select All / Clear Selection work correctly
- [ ] Package name displays in header
- [ ] Empty states show appropriate messages
- [ ] Refresh button updates package list
- [ ] Legacy "Load from Course" still works
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader accessibility

## Phase 2 Design: One-Step Quiz Creation Modal

### Overview

Phase 2 will consolidate quiz creation into a single modal, reducing the workflow from 3+ steps to 1 step.

### Modal Structure

```
┌─────────────────────────────────────────────────────────┐
│  Create Quiz                                        [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Quiz Details                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Title: [________________________]                 │ │
│  │ Description: [___________________]                │ │
│  │ Time Limit: [___] minutes                         │ │
│  │ Passing Score: [___] %                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Select Questions                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Package: [Select Package ▼]          [🔄]        │ │
│  │                                                   │ │
│  │ ☐ Question 1: What is...?                        │ │
│  │ ☐ Question 2: How does...?                       │ │
│  │ ☐ Question 3: Why is...?                         │ │
│  │                                                   │ │
│  │ [Select All] [Clear]                             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Selected: 0 questions                                  │
│                                                         │
│                    [Cancel]  [Create Quiz]              │
└─────────────────────────────────────────────────────────┘
```

### Benefits

- **Reduced Steps:** From 3+ steps to 1 step
- **Better Context:** See all information at once
- **Fewer Errors:** Validate before creation
- **Improved UX:** Single, focused interaction

### Implementation Approach

1. Create new modal component: `quiz-creation-modal.component.ts`
2. Integrate package selector and question list
3. Add form validation
4. Handle quiz creation with questions in single API call
5. Update section-editor to use new modal

## Performance Considerations

### Lazy Loading

- Load packages only when quiz creation is initiated
- Cache package list for session duration
- Implement virtual scrolling for large question lists

### Debouncing

```typescript
// Debounce package selection to prevent rapid API calls
private packageSelectionSubject = new Subject<string>();

constructor() {
  this.packageSelectionSubject.pipe(
    debounceTime(300),
    distinctUntilChanged()
  ).subscribe(packageId => {
    this.loadQuestionsFromPackage(packageId);
  });
}
```

### Caching Strategy

```typescript
// Cache loaded questions by package ID
private questionCache = new Map<string, Question[]>();

async loadQuestionsFromPackage(packageId: string) {
  if (this.questionCache.has(packageId)) {
    this.courseQuestions.set(this.questionCache.get(packageId)!);
    return;
  }
  
  // Load from API and cache
  const questions = await firstValueFrom(
    this.packageApi.getQuestionsInPackage(packageId)
  );
  this.questionCache.set(packageId, questions);
  this.courseQuestions.set(questions);
}
```

## Security Considerations

### Authorization

- Verify teacher owns/has access to selected package
- Validate question IDs belong to accessible packages
- Prevent unauthorized quiz creation

### Input Validation

- Sanitize quiz title and description
- Validate question selection (non-empty)
- Validate numeric inputs (time limit, passing score)

### API Security

- Use authentication tokens for all API calls
- Implement CSRF protection
- Rate limit quiz creation to prevent abuse

## Accessibility

### Keyboard Navigation

- Tab through package selector, questions, buttons
- Space/Enter to select questions
- Escape to close modals

### Screen Reader Support

- ARIA labels for all interactive elements
- Announce loading states
- Announce selection changes

### Visual Accessibility

- High contrast mode support
- Focus indicators
- Color-blind friendly indicators (not just color)

## Migration Path

### For Existing Users

1. **Phase 1 (Current):** Package selector added alongside legacy options
2. **Transition Period:** Both approaches available, package recommended
3. **Phase 2:** One-step modal becomes primary, legacy still accessible
4. **Future:** Deprecate legacy approach with migration tools

### For New Users

- Default to package-based approach
- Hide legacy options unless explicitly needed
- Provide onboarding guidance

## Conclusion

This design provides a comprehensive approach to enhancing quiz creation while maintaining backward compatibility. The phased implementation allows for incremental delivery and user feedback incorporation. The integration of the Package System aligns the Section Editor with Quiz Bank, providing a consistent and intuitive experience for teachers.
