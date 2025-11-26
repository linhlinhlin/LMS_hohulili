# Requirements Document

## Introduction

Tính năng này cho phép học sinh (student) làm bài trắc nghiệm trong các bài học của khóa học. Học sinh sẽ có giao diện làm bài tương tự như chức năng xem trước của giáo viên, bao gồm đếm ngược thời gian, điều hướng câu hỏi, và xem kết quả sau khi nộp bài.

## Glossary

- **Student**: Học sinh đã đăng ký khóa học và có quyền truy cập vào các bài học
- **Quiz**: Bài trắc nghiệm được gắn với một bài học (lesson) trong khóa học
- **Quiz Attempt**: Một lần làm bài trắc nghiệm của học sinh
- **Quiz Preview Component**: Component hiện tại của giáo viên dùng để xem trước bài trắc nghiệm
- **Course Detail Page**: Trang chi tiết khóa học hiển thị danh sách các section và lesson
- **Learning Interface**: Giao diện học tập nơi học sinh xem nội dung bài học

## Requirements

### Requirement 1

**User Story:** As a student, I want to see a "Làm bài" button next to quiz lessons in the course detail page, so that I can easily identify and access quizzes.

#### Acceptance Criteria

1. WHEN a student views the course detail page THEN the system SHALL display a "Làm bài" button next to each lesson that has an associated quiz
2. WHEN a lesson does not have a quiz THEN the system SHALL NOT display the "Làm bài" button for that lesson
3. WHEN the "Làm bài" button is displayed THEN the system SHALL style it distinctively with a quiz icon to differentiate it from regular lesson links
4. WHEN a student hovers over the "Làm bài" button THEN the system SHALL provide visual feedback with hover effects

### Requirement 2

**User Story:** As a student, I want to click the "Làm bài" button and navigate to a quiz-taking interface, so that I can complete the quiz for that lesson.

#### Acceptance Criteria

1. WHEN a student clicks the "Làm bài" button THEN the system SHALL navigate to the student quiz-taking route with the lesson ID as a parameter
2. WHEN navigating to the quiz-taking route THEN the system SHALL pass the quiz title and return URL as query parameters
3. WHEN the navigation occurs THEN the system SHALL preserve the current course detail page URL as the return URL
4. WHEN the student is not authenticated THEN the system SHALL redirect to the login page before accessing the quiz

### Requirement 3

**User Story:** As a student, I want to see a quiz-taking interface similar to the teacher's preview interface, so that I have a familiar and intuitive experience.

#### Acceptance Criteria

1. WHEN the quiz-taking interface loads THEN the system SHALL display a top header bar with back button, quiz title, timer, progress indicator, and submit button
2. WHEN the quiz-taking interface loads THEN the system SHALL display a sidebar with question navigator showing all questions and their answered status
3. WHEN the quiz-taking interface loads THEN the system SHALL display the main content area with the current question, options, and navigation buttons
4. WHEN displaying questions THEN the system SHALL show question number, difficulty level, content, and multiple-choice options
5. WHEN displaying the interface THEN the system SHALL use the same styling and layout as the teacher's quiz preview component

### Requirement 4

**User Story:** As a student, I want to fetch quiz questions from the backend API, so that I can see the actual quiz content for the lesson.

#### Acceptance Criteria

1. WHEN the quiz-taking component initializes THEN the system SHALL call the backend API endpoint to retrieve quiz questions for the lesson ID
2. WHEN the API call succeeds THEN the system SHALL parse the response and populate the questions array with question ID, content, difficulty, options, and correct option
3. WHEN the API call fails THEN the system SHALL display an error message and provide a back button to return to the course detail page
4. WHEN the quiz has no questions THEN the system SHALL display a message indicating the quiz is empty
5. WHEN questions are loaded THEN the system SHALL sort options by option key alphabetically

### Requirement 5

**User Story:** As a student, I want to select answers for each question, so that I can complete the quiz.

#### Acceptance Criteria

1. WHEN a student clicks on an option THEN the system SHALL record the selected answer for that question
2. WHEN an answer is selected THEN the system SHALL highlight the selected option with a distinct visual style
3. WHEN a student changes their answer THEN the system SHALL update the recorded answer to the new selection
4. WHEN navigating between questions THEN the system SHALL preserve all previously selected answers
5. WHEN an answer is selected THEN the system SHALL update the answered count in the progress indicator

### Requirement 6

**User Story:** As a student, I want to navigate between questions using previous/next buttons and the question navigator, so that I can review and answer questions in any order.

#### Acceptance Criteria

1. WHEN a student clicks the "Câu tiếp" button THEN the system SHALL navigate to the next question in the sequence
2. WHEN a student clicks the "Câu trước" button THEN the system SHALL navigate to the previous question in the sequence
3. WHEN a student clicks a question number in the sidebar navigator THEN the system SHALL navigate directly to that question
4. WHEN on the first question THEN the system SHALL disable the "Câu trước" button
5. WHEN on the last question THEN the system SHALL replace the "Câu tiếp" button with a "Nộp bài" button

### Requirement 7

**User Story:** As a student, I want to see a countdown timer during the quiz, so that I know how much time I have remaining.

#### Acceptance Criteria

1. WHEN the quiz starts THEN the system SHALL initialize a countdown timer with the quiz time limit
2. WHEN the timer is running THEN the system SHALL decrement the time remaining by one second every second
3. WHEN the timer is running THEN the system SHALL display the remaining time in MM:SS format in the header
4. WHEN the timer reaches zero THEN the system SHALL automatically submit the quiz
5. WHEN the quiz is submitted THEN the system SHALL stop the timer

### Requirement 8

**User Story:** As a student, I want to submit my quiz answers, so that I can see my results.

#### Acceptance Criteria

1. WHEN a student clicks the "Nộp bài" button THEN the system SHALL stop the timer and calculate the quiz results
2. WHEN calculating results THEN the system SHALL compare each selected answer with the correct answer
3. WHEN calculating results THEN the system SHALL count the number of correct answers, wrong answers, and unanswered questions
4. WHEN calculating results THEN the system SHALL compute the score percentage as (correct answers / total questions) × 100
5. WHEN results are calculated THEN the system SHALL display a results modal with score, statistics, and action buttons

### Requirement 9

**User Story:** As a student, I want to see my quiz results in a modal, so that I can understand my performance.

#### Acceptance Criteria

1. WHEN the results modal displays THEN the system SHALL show the score percentage prominently
2. WHEN the results modal displays THEN the system SHALL show the count of correct answers, wrong answers, and unanswered questions
3. WHEN the results modal displays THEN the system SHALL show the total time spent on the quiz
4. WHEN the results modal displays THEN the system SHALL use color coding (green for high scores, yellow for medium, red for low)
5. WHEN the results modal displays THEN the system SHALL provide "Xem lại đáp án" and "Làm lại" buttons

### Requirement 10

**User Story:** As a student, I want to review my answers after submitting, so that I can learn from my mistakes.

#### Acceptance Criteria

1. WHEN a student clicks "Xem lại đáp án" THEN the system SHALL close the results modal and display the quiz with answers revealed
2. WHEN reviewing answers THEN the system SHALL highlight correct options in green
3. WHEN reviewing answers THEN the system SHALL highlight incorrect selected options in red
4. WHEN reviewing answers THEN the system SHALL show checkmarks next to correct options and X marks next to incorrect selections
5. WHEN reviewing answers THEN the system SHALL disable option selection to prevent further changes

### Requirement 11

**User Story:** As a student, I want to retake the quiz, so that I can improve my score.

#### Acceptance Criteria

1. WHEN a student clicks "Làm lại" THEN the system SHALL reset all selected answers to empty
2. WHEN resetting the quiz THEN the system SHALL reset the current question index to the first question
3. WHEN resetting the quiz THEN the system SHALL hide the results modal and review mode
4. WHEN resetting the quiz THEN the system SHALL restart the countdown timer with the full time limit
5. WHEN resetting the quiz THEN the system SHALL allow the student to select answers again

### Requirement 12

**User Story:** As a student, I want to go back to the course detail page from the quiz interface, so that I can exit the quiz if needed.

#### Acceptance Criteria

1. WHEN a student clicks the back button in the header THEN the system SHALL stop the timer
2. WHEN the back button is clicked THEN the system SHALL navigate to the return URL provided in the query parameters
3. WHEN no return URL is provided THEN the system SHALL navigate to the student's courses page as a fallback
4. WHEN navigating back THEN the system SHALL not save the quiz progress
5. WHEN navigating back THEN the system SHALL discard any selected answers

### Requirement 13

**User Story:** As a student, I want the quiz interface to be responsive on mobile devices, so that I can take quizzes on any device.

#### Acceptance Criteria

1. WHEN viewing on mobile devices THEN the system SHALL hide the sidebar question navigator
2. WHEN viewing on mobile devices THEN the system SHALL display a compact horizontal question navigator below the navigation buttons
3. WHEN viewing on mobile devices THEN the system SHALL adjust the header layout to fit smaller screens
4. WHEN viewing on mobile devices THEN the system SHALL ensure all buttons and options are easily tappable
5. WHEN viewing on mobile devices THEN the system SHALL maintain readability of question content and options

### Requirement 14

**User Story:** As a developer, I want to reuse the existing quiz preview component logic, so that I can minimize code duplication and maintain consistency.

#### Acceptance Criteria

1. WHEN implementing the student quiz component THEN the system SHALL reuse the template structure from the teacher's quiz preview component
2. WHEN implementing the student quiz component THEN the system SHALL reuse the same API endpoint for fetching quiz questions
3. WHEN implementing the student quiz component THEN the system SHALL reuse the same styling classes and animations
4. WHEN implementing the student quiz component THEN the system SHALL adapt the component for the student route structure
5. WHEN implementing the student quiz component THEN the system SHALL maintain the same user experience as the teacher preview
