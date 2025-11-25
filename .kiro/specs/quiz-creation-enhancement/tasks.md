# Implementation Plan: Quiz Creation Enhancement

## Phase 1: Package Integration (✅ COMPLETED)

- [x] 1. Integrate Package System into Section Editor
  - Add PackageApi dependency injection
  - Create package-related signals for state management
  - Implement package loading methods
  - _Requirements: 1.1, 1.2, 5.1_

- [x] 1.1 Add Package API imports and dependency injection
  - Import PackageApi and PackageDTO types
  - Inject PackageApi service into component
  - _Requirements: 1.1_

- [x] 1.2 Create package state management signals
  - Create packages signal for package list
  - Create selectedPackageId signal for current selection
  - Create packagesLoading signal for loading state
  - _Requirements: 1.1, 5.3_

- [x] 1.3 Implement loadPackages method
  - Fetch packages from API
  - Handle loading states
  - Handle errors gracefully
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 1.4 Implement loadQuestionsFromPackage method
  - Load questions by package ID
  - Clear questions when empty package ID provided
  - Handle loading states and errors
  - _Requirements: 1.2, 1.5_

- [x] 1.5 Implement onPackageChange handler
  - Update selectedPackageId signal
  - Trigger question loading
  - _Requirements: 1.2_

- [x] 1.6 Update ngOnInit to load packages
  - Call loadPackages on component initialization
  - _Requirements: 5.1_

- [x] 2. Update UI Template for Package Selection
  - Add package selector dropdown
  - Add refresh button for packages
  - Update question list header with package info
  - Enhance empty states
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 4.2, 6.1_

- [x] 2.1 Add package selector section to template
  - Create dropdown with package options
  - Show package name and question count
  - Add refresh button with loading state
  - Add helpful description text
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 2.2 Update legacy options section
  - Visually distinguish as "Legacy" or "Old Method"
  - Maintain existing "Load from Course" button
  - Maintain existing "Quiz Bank" button
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 2.3 Enhance question list header
  - Display package name when loaded from package
  - Display "From Course" when loaded from course
  - Show appropriate icons
  - _Requirements: 6.1, 6.2_

- [x] 2.4 Improve empty state messages
  - Show package-specific empty state when package has no questions
  - Show general guidance when no selection made
  - Provide helpful recommendations
  - _Requirements: 1.5, 4.2_

## Phase 2: One-Step Quiz Creation Modal

- [ ] 3. Create Quiz Creation Modal Component
  - Design and implement unified modal for quiz creation
  - Integrate package selector and question selection
  - Add quiz metadata form fields
  - _Requirements: 7.1, 7.2_

- [x] 3.1 Create quiz-creation-modal component


  - Generate new Angular component
  - Set up component structure with template and styles
  - Add modal dialog wrapper
  - _Requirements: 7.1_


- [ ] 3.2 Implement modal state management
  - Create signals for quiz metadata (title, description, timeLimit, passingScore)
  - Create signals for package selection
  - Create signals for question selection
  - Create computed signal for form validity

  - _Requirements: 7.2, 7.3_

- [ ] 3.3 Build quiz metadata form section
  - Add title input field with validation
  - Add description textarea
  - Add time limit input (optional)

  - Add passing score input with validation
  - _Requirements: 7.2_

- [ ] 3.4 Integrate package selector into modal
  - Reuse package loading logic from section editor

  - Add package dropdown
  - Add refresh button
  - _Requirements: 7.2, 1.1_

- [ ] 3.5 Integrate question selection into modal
  - Display questions from selected package

  - Add checkboxes for multi-select
  - Add "Select All" and "Clear" buttons
  - Show selected question count
  - _Requirements: 7.2, 2.1, 2.2, 2.3_


- [ ] 3.6 Implement form validation
  - Validate required fields (title, at least one question)
  - Validate numeric fields (time limit, passing score)
  - Enable/disable Create button based on validity
  - _Requirements: 7.3_

- [ ] 3.7 Implement quiz creation logic
  - Create quiz with metadata and selected questions in single operation
  - Handle success: close modal, refresh lesson list, show success message
  - Handle errors: display error message, allow retry
  - _Requirements: 7.4, 7.5_

- [ ] 3.8 Write unit tests for modal component
  - Test modal opening and closing
  - Test form validation logic
  - Test question selection logic
  - Test quiz creation success and error paths


  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Update Section Editor to Use New Modal

  - Replace old quiz creation flow with modal
  - Maintain backward compatibility option
  - _Requirements: 7.1_

- [x] 4.1 Add modal component to section editor template


  - Import and declare modal component
  - Add modal trigger button
  - _Requirements: 7.1_

- [ ] 4.2 Implement modal open/close handlers
  - Create method to open modal
  - Pass necessary context (courseId, sectionId)
  - Handle modal close events
  - _Requirements: 7.1_

- [ ] 4.3 Update lesson list after quiz creation
  - Refresh lessons when modal emits success event
  - Update UI to show new quiz
  - _Requirements: 7.5_

## Phase 3: Testing and Quality Assurance

- [ ] 5. Implement Property-Based Tests
  - Set up fast-check testing framework
  - Write property tests for core correctness properties
  - _Requirements: All_

- [ ] 5.1 Write property test for package selection correctness
  - **Property 1: Package Selection Loads Correct Questions**
  - **Validates: Requirements 1.2**
  - Generate random package IDs and question sets
  - Verify loaded questions match package exactly
  - Run 100 iterations

- [ ] 5.2 Write property test for question selection state consistency
  - **Property 2: Question Selection State Consistency**
  - **Validates: Requirements 2.1, 2.2, 2.3**
  - Generate random selection/deselection sequences
  - Verify internal state matches UI state
  - Run 100 iterations

- [ ] 5.3 Write property test for select all idempotence
  - **Property 3: Select All Idempotence**
  - **Validates: Requirements 2.2**
  - Generate random question lists
  - Call selectAll multiple times
  - Verify result is same as calling once
  - Run 100 iterations

- [ ] 5.4 Write property test for clear selection idempotence
  - **Property 4: Clear Selection Idempotence**
  - **Validates: Requirements 2.3**
  - Generate random question lists with selections
  - Call clearSelection multiple times
  - Verify result is same as calling once
  - Run 100 iterations

- [ ] 5.5 Write property test for package refresh consistency
  - **Property 5: Package Refresh Consistency**
  - **Validates: Requirements 5.2, 5.4**
  - Generate random package states
  - Refresh multiple times
  - Verify data consistency
  - Run 100 iterations

- [ ] 5.6 Write property test for source indicator accuracy
  - **Property 6: Source Indicator Accuracy**
  - **Validates: Requirements 6.1, 6.2, 6.5**
  - Generate random question sources (package or course)
  - Verify indicator matches actual source
  - Run 100 iterations

- [ ] 5.7 Write property test for legacy compatibility
  - **Property 7: Legacy Compatibility Preservation**
  - **Validates: Requirements 3.5**
  - Generate random quiz creation scenarios
  - Compare legacy flow results with new flow
  - Verify identical outcomes
  - Run 100 iterations

- [ ] 5.8 Write property test for empty state accuracy
  - **Property 8: Empty State Guidance Accuracy**
  - **Validates: Requirements 1.5, 4.2**
  - Generate random combinations of package selection and question availability
  - Verify correct empty state message displayed
  - Run 100 iterations

- [ ] 6. Performance Optimization
  - Implement caching strategies
  - Add debouncing for rapid operations
  - Optimize rendering for large question lists
  - _Requirements: 8.4_

- [ ] 6.1 Implement question caching by package ID
  - Create Map-based cache for loaded questions
  - Check cache before API calls
  - Invalidate cache on refresh
  - _Requirements: 8.4_

- [ ] 6.2 Add debouncing for package selection
  - Use RxJS debounceTime for package changes
  - Prevent rapid API calls from quick selections
  - Set debounce time to 300ms
  - _Requirements: 8.4_

- [ ] 6.3 Implement race condition prevention
  - Track current load operation
  - Ignore stale responses from previous operations
  - Ensure data consistency
  - _Requirements: 8.4_

- [ ] 6.4 Write property test for race condition handling
  - **Property 9: Race Condition Prevention**
  - **Validates: Requirements 8.4**
  - Generate rapid sequences of package selections
  - Verify final state matches last selection
  - Verify no stale data displayed
  - Run 100 iterations

- [ ] 7. Accessibility Improvements
  - Add ARIA labels and roles
  - Implement keyboard navigation
  - Test with screen readers
  - _Requirements: 4.3, 4.4_

- [ ] 7.1 Add ARIA labels to interactive elements
  - Label package selector
  - Label question checkboxes
  - Label action buttons
  - _Requirements: 4.3_

- [ ] 7.2 Implement keyboard navigation
  - Tab through all interactive elements
  - Space/Enter for selection
  - Escape to close modals
  - _Requirements: 4.3_

- [ ] 7.3 Add screen reader announcements
  - Announce loading states
  - Announce selection changes
  - Announce error messages
  - _Requirements: 4.4_

- [ ] 7.4 Test accessibility with automated tools
  - Run axe-core accessibility tests
  - Verify WCAG 2.1 AA compliance
  - Fix any identified issues
  - _Requirements: 4.3, 4.4_

- [ ] 8. Final Integration and Testing
  - Ensure all tests pass
  - Perform manual testing
  - Verify backward compatibility
  - _Requirements: All_

- [ ] 8.1 Run full test suite
  - Execute all unit tests
  - Execute all property-based tests
  - Verify 100% pass rate
  - _Requirements: All_

- [ ] 8.2 Perform manual testing checklist
  - Test package selection flow
  - Test legacy course selection flow
  - Test modal quiz creation (Phase 2)
  - Test error scenarios
  - Test on different browsers
  - Test responsive design
  - _Requirements: All_

- [ ] 8.3 Verify backward compatibility
  - Test existing quiz creation still works
  - Verify no breaking changes to API
  - Confirm legacy users can continue workflow
  - _Requirements: 3.5_

- [ ] 8.4 Performance testing
  - Test with large package lists (100+ packages)
  - Test with large question lists (500+ questions)
  - Verify load times meet requirements
  - _Requirements: 8.1, 8.2_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Phase 1 is already completed and deployed
- Phase 2 (Modal) is the next major milestone
- All tests are required for comprehensive quality assurance
- Property-based tests will run 100 iterations each using fast-check
- Performance tests should be run in staging environment
- Accessibility testing should include real screen reader testing
- All changes must maintain backward compatibility

## Success Criteria

- ✅ Package integration working in production (Phase 1)
- [ ] One-step modal reduces quiz creation time by 50%
- [ ] All property-based tests passing with 100 iterations
- [ ] No regression in legacy quiz creation flow
- [ ] Accessibility score of 95+ on Lighthouse
- [ ] Load time under 2 seconds for package/question loading
- [ ] Zero critical bugs in production after 2 weeks
