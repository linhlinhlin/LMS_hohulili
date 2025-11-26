# Implementation Plan

- [x] 1. Update form structure and add quiz configuration fields


  - Add quiz configuration input fields (time, score, attempts) to template
  - Update form styling with purple theme for quiz section
  - Add conditional display logic for quiz fields
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement form validation for quiz fields



  - Add validators for quizTimeLimit (1-180)
  - Add validators for quizMaxScore (0-100)
  - Add validators for quizMaxAttempts (1-10)
  - Add error message display for each field
  - _Requirements: 1.3, 5.2, 5.3, 5.4_

- [x] 3. Add package selection UI


  - Create package selector dropdown in template
  - Add loading state for packages
  - Style package section with blue theme
  - _Requirements: 2.1, 2.2_


- [ ] 4. Implement package loading logic
  - Add signal for packages list
  - Add signal for selected package ID
  - Create method to load packages on component init
  - Handle package loading errors
  - _Requirements: 2.2_


- [ ] 5. Add question list display with checkboxes
  - Create question list template with checkboxes
  - Add loading state for questions
  - Display question content and options
  - Show difficulty badge for each question

  - _Requirements: 2.3, 2.4_

- [ ] 6. Implement question selection logic
  - Add signal for selected question IDs (Set)
  - Create toggleQuestionSelection method
  - Create isQuestionSelected helper method

  - Update selection count display
  - _Requirements: 2.4, 2.5_

- [ ] 7. Add selected questions preview section
  - Create preview template for selected questions
  - Display full question details (content, options, correct answer)

  - Add remove button for each selected question
  - Show empty state when no questions selected
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 8. Implement question removal from selection

  - Create removeQuestionFromSelection method
  - Update selected count on removal
  - Update UI reactively
  - _Requirements: 3.3, 3.4_

- [x] 9. Update createLesson method for quiz type

  - Check if lessonType is QUIZ
  - Extract quiz configuration values from form
  - Extract selected question IDs
  - Build CreateQuizLessonRequest payload
  - _Requirements: 4.1, 4.2_


- [ ] 10. Implement quiz creation with questions API call
  - Call API to create quiz with configuration
  - If questions selected, call API to add questions to quiz
  - Handle success response
  - Handle error responses
  - _Requirements: 4.2, 4.3, 4.4, 4.5_


- [ ] 11. Add success and error handling
  - Show success toast on quiz creation
  - Show specific error messages for different failures
  - Reload lessons list on success

  - Reset form on success
  - _Requirements: 4.4, 4.5_

- [ ] 12. Implement default value handling
  - Set default values in form initialization (30, 60, 1)

  - Apply defaults when fields are empty
  - Test default value application
  - _Requirements: 1.4_

- [x] 13. Support quiz creation without questions

  - Allow form submission with zero questions selected
  - Show appropriate success message
  - Display quiz with 0 questions in list
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 14. Add "Add Questions" button for empty quizzes

  - Detect quizzes with 0 questions in viewer
  - Show "Thêm câu hỏi" button
  - Wire button to existing add questions modal
  - _Requirements: 6.4, 6.5_

- [x] 15. Implement loading states and spinners


  - Add spinner for package loading
  - Add spinner for question loading
  - Disable submit button during creation
  - Show progress indicator
  - _Requirements: 2.2, 2.3_

- [ ] 16. Add mobile responsive styling
  - Stack form fields vertically on mobile
  - Make question list scrollable
  - Use accordion for question selection on mobile
  - Test on various screen sizes
  - _Requirements: All_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 18. Write unit tests for form validation
  - Test valid input ranges
  - Test invalid input rejection
  - Test required field validation
  - Test default value application

- [ ]* 19. Write unit tests for question selection
  - Test single question selection
  - Test multiple question selection
  - Test question deselection
  - Test selection state persistence

- [ ]* 20. Write integration tests for quiz creation flow
  - Test complete flow with all fields
  - Test flow with default values
  - Test flow with selected questions
  - Test flow without questions
  - Test error handling
