# Implementation Plan

- [-] 1. Create student quiz taking component

  - Create new component file at `fe/src/app/features/student/quiz/student-quiz-taking.component.ts`
  - Copy template and logic from teacher's quiz preview component
  - Adapt component for student route structure (use studentGuard, adjust return navigation)
  - Implement all signals, computed values, and methods for quiz functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 1.1 Write property test for navigation parameter preservation
  - **Property 2: Navigation parameter preservation**
  - **Validates: Requirements 2.2, 2.3**

- [ ] 1.2 Write property test for question data integrity
  - **Property 3: Question data integrity**
  - **Validates: Requirements 4.2, 4.5**

- [ ] 1.3 Write property test for answer persistence across navigation
  - **Property 4: Answer persistence across navigation**
  - **Validates: Requirements 5.4**

- [ ] 1.4 Write property test for progress indicator accuracy
  - **Property 5: Progress indicator accuracy**
  - **Validates: Requirements 5.5**

- [ ] 1.5 Write property test for navigation button state consistency
  - **Property 6: Navigation button state consistency**
  - **Validates: Requirements 6.4, 6.5**

- [ ] 1.6 Write property test for timer countdown accuracy
  - **Property 7: Timer countdown accuracy**
  - **Validates: Requirements 7.2, 7.4**

- [ ] 1.7 Write property test for score calculation correctness
  - **Property 8: Score calculation correctness**
  - **Validates: Requirements 8.4**

- [ ] 1.8 Write property test for results statistics consistency
  - **Property 9: Results statistics consistency**
  - **Validates: Requirements 9.2**

- [ ] 1.9 Write property test for answer review immutability
  - **Property 10: Answer review immutability**
  - **Validates: Requirements 10.5**

- [ ] 1.10 Write property test for quiz reset completeness
  - **Property 11: Quiz reset completeness**
  - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [ ] 1.11 Write property test for back navigation cleanup
  - **Property 12: Back navigation cleanup**
  - **Validates: Requirements 12.1, 12.4, 12.5**



- [ ] 2. Add quiz route to student routes
  - Open `fe/src/app/features/student/student.routes.ts`
  - Add new route for quiz taking: `/quiz/take/:lessonId`
  - Configure lazy loading for the student quiz taking component
  - Set appropriate route title and guard

  - _Requirements: 2.1, 2.4_

- [ ] 3. Modify course detail component to detect quizzes
  - Open `fe/src/app/features/student/pages/course-detail.component.ts`
  - Add method to check if a lesson has an associated quiz using QuizApi
  - Add method to navigate to quiz taking interface with proper parameters
  - Update Lesson interface to include `hasQuiz` property
  - Implement quiz existence checking when loading course content
  - _Requirements: 1.1, 1.2, 2.2, 2.3_

- [-] 3.1 Write property test for quiz button visibility consistency

  - **Property 1: Quiz button visibility consistency**
  - **Validates: Requirements 1.1, 1.2**

- [x] 4. Update course detail template to show quiz buttons

  - Open `fe/src/app/features/student/pages/course-detail.component.html`
  - Add "Làm bài" button next to lessons that have quizzes
  - Style the button with quiz icon and distinctive appearance
  - Add hover effects for the quiz button
  - Bind click event to navigate to quiz taking interface
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5. Update course detail styles for quiz buttons



  - Open `fe/src/app/features/student/pages/course-detail.component.scss`
  - Add styles for the "Làm bài" button
  - Add hover and active states
  - Ensure responsive design for mobile devices
  - Add quiz icon styling
  - _Requirements: 1.3, 1.4_

- [ ] 6. Write unit tests for course detail quiz integration
  - Test quiz existence checking logic
  - Test navigation to quiz taking interface
  - Test quiz button visibility based on quiz existence
  - Test parameter passing (lessonId, title, returnUrl)
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [ ] 7. Write unit tests for student quiz taking component
  - Test component initialization with valid lesson ID
  - Test quiz loading from API
  - Test answer selection and updates
  - Test navigation between questions
  - Test timer functionality
  - Test quiz submission and results calculation
  - Test quiz reset functionality
  - Test back navigation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2, 11.1, 12.1_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
