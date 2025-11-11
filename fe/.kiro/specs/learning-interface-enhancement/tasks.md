# Implementation Plan - Learning Interface Enhancement

## Overview

This implementation plan breaks down the Learning Interface Enhancement into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring a smooth development process.

---

## Tasks

- [x] 1. Setup project structure and core models



  - Create folder structure for learning interface components
  - Define TypeScript interfaces and enums in `learning.models.ts`
  - Create `LessonType` and `FileType` enums
  - _Requirements: 1.1, 2.1, 3.1_







- [x] 2. Implement LearningService with state management

  - [x] 2.1 Create LearningService with Angular Signals

    - Setup signal-based state for course, lesson, and progress
    - Create computed signals for derived state
    - _Requirements: 2.1, 7.1_


  
  - [x] 2.2 Implement course loading methods

    - Add `loadCourse()` method with parallel API calls


    - Map API responses to internal models
    - Handle loading and error states
    - _Requirements: 1.1, 1.2, 10.1_
  

  - [x] 2.3 Implement lesson loading and selection

    - Add `loadLesson()` method with caching
    - Add `selectLesson()` method to update current lesson

    - Handle lesson not found errors

    - _Requirements: 3.1, 10.4_
  

  - [ ] 2.4 Implement progress tracking methods
    - Add `markLessonComplete()` method
    - Calculate progress percentage

    - Persist completed lessons to local storage
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 3. Create Course Overview Page
  - [x] 3.1 Build CourseOverviewComponent structure





    - Create component with template and styles
    - Inject LearningService and load course data
    - Display course header with title, instructor, description


    - _Requirements: 1.1_







  
  - [ ] 3.2 Implement section accordion list
    - Create SectionAccordionComponent
    - Display expandable sections with lessons

    - Show lesson type icons and duration
    - _Requirements: 1.2, 1.3_
  


  - [ ] 3.3 Add completion indicators and enrollment button
    - Display checkmark for completed lessons

    - Show empty circle for not started lessons
    - Add "Enroll" button for non-enrolled students
    - _Requirements: 1.4, 1.5_





- [ ] 4. Build Course Learning Page container
  - [x] 4.1 Create CourseLearningComponent

    - Setup two-column layout with sidebar and main content
    - Inject LearningService and subscribe to state
    - Handle route params to load course and lesson

    - _Requirements: 2.1, 2.2_
  
  - [x] 4.2 Implement sidebar collapse/expand functionality




    - Add collapse button to sidebar header
    - Toggle sidebar state with signal

    - Apply CSS classes for collapsed state


    - _Requirements: 2.4_
  
  - [x] 4.3 Add breadcrumb navigation


    - Create BreadcrumbComponent
    - Display course > section > lesson hierarchy


    - Make breadcrumb items clickable
    - _Requirements: 2.3_





- [x] 5. Implement Lesson Sidebar Component


  - [x] 5.1 Create LessonSidebarComponent structure



    - Build sidebar template with header and lesson list
    - Display course title in header

    - Add collapse/expand button
    - _Requirements: 2.2_
  
  - [x] 5.2 Add search functionality

    - Create search input with two-way binding
    - Filter lessons based on search query

    - Highlight matching lessons
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.3 Build lesson list with sections


    - Create LessonListItemComponent

    - Display section titles and lesson items
    - Show completion indicators (checkmark/circle)
    - Highlight current lesson
    - _Requirements: 2.2, 7.2_
  
  - [x] 5.4 Implement lesson selection


    - Handle click events on lesson items
    - Emit lessonSelect event to parent
    - Scroll to current lesson on load
    - _Requirements: 3.1_

- [ ] 6. Create Lesson Content Component
  - [ ] 6.1 Build LessonContentComponent structure
    - Create component with lesson header
    - Display lesson title, type, and duration
    - Add "Mark as Complete" button
    - _Requirements: 2.3, 7.4_
  
  - [ ] 6.2 Implement video player integration
    - Create VideoPlayerWrapperComponent
    - Integrate RealVideoPlayerComponent
    - Handle YouTube and direct video URLs
    - Track video state changes
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [ ] 6.3 Add HTML content renderer
    - Create LessonHtmlContentComponent
    - Sanitize and render HTML content safely
    - Style content with proper typography
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 6.4 Implement auto-complete on video end
    - Listen to video ended event
    - Automatically mark lesson as complete
    - Show completion notification
    - _Requirements: 4.3_

- [ ] 7. Build Attachment Components
  - [ ] 7.1 Create AttachmentListComponent
    - Display list of attachments with file info
    - Show file type icon, name, and size
    - Add expand/collapse functionality
    - _Requirements: 6.1_
  
  - [ ] 7.2 Implement PDF Viewer
    - Create PdfViewerComponent
    - Display PDF in iframe with safe URL
    - Add download button
    - _Requirements: 6.2_
  
  - [ ] 7.3 Implement Office Document Viewer
    - Create OfficeViewerComponent
    - Use Office Online viewer for Word/Excel/PowerPoint
    - Add download button
    - _Requirements: 6.3_
  
  - [ ] 7.4 Implement Media Viewer
    - Create MediaViewerComponent
    - Display images inline
    - Add video/audio player for media files
    - _Requirements: 6.4, 6.5_
  
  - [ ] 7.5 Add file download functionality
    - Implement download method in FileViewerService
    - Handle file download with proper MIME types
    - Show download progress indicator
    - _Requirements: 6.6_

- [x] 8. Implement Navigation Components


  - [x] 8.1 Create LessonNavigationComponent


    - Build prev/next button UI
    - Disable buttons at first/last lesson
    - Emit navigation events to parent
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [x] 8.2 Add keyboard navigation support


    - Listen to keyboard events in CourseLearningComponent
    - Handle arrow keys for prev/next navigation
    - Handle space bar for video play/pause
    - Handle escape key for sidebar close
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 9. Implement Access Control
  - [ ] 9.1 Add enrollment check logic
    - Check enrollment status in LearningService
    - Handle 403 Forbidden errors from API
    - Display access denied state
    - _Requirements: 9.1, 9.5_
  
  - [ ] 9.2 Create enrollment flow
    - Add enrollCourse() method in LearningService
    - Call enrollment API
    - Reload course content after enrollment
    - _Requirements: 9.2, 9.3_
  
  - [ ] 9.3 Implement role-based access
    - Check user role (student/teacher/admin)
    - Grant access to teachers and admins without enrollment
    - Show appropriate UI based on role
    - _Requirements: 9.4_

- [ ] 10. Add Loading and Error States
  - [ ] 10.1 Create LoadingSpinnerComponent
    - Build reusable loading spinner
    - Add customizable message prop
    - Style with animations
    - _Requirements: 10.1_
  
  - [ ] 10.2 Create ErrorStateComponent
    - Build error display with icon and message
    - Add retry button for network errors
    - Add enroll button for access denied
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [ ] 10.3 Implement loading states in components
    - Show loading spinner while loading course
    - Show loading overlay while loading lesson
    - Show skeleton loaders for lesson list
    - _Requirements: 10.1, 10.2_

- [ ] 11. Implement Responsive Design
  - [ ] 11.1 Add responsive styles for desktop
    - Style sidebar with fixed 320px width
    - Style main content with flex-grow
    - Add smooth transitions
    - _Requirements: 11.1_
  
  - [ ] 11.2 Add responsive styles for tablet
    - Make sidebar collapsible





    - Adjust layout for medium screens
    - _Requirements: 11.2_
  
  - [x] 11.3 Add responsive styles for mobile


    - Hide sidebar by default
    - Add toggle button for sidebar
    - Display sidebar as overlay or bottom sheet
    - Make video player responsive
    - _Requirements: 11.3, 11.4, 11.5_

- [ ] 12. Implement Performance Optimizations
  - [ ] 12.1 Add caching to LearningService
    - Cache lesson details in Map
    - Check cache before API call
    - Implement cache expiration
    - _Requirements: 13.3_
  
  - [ ] 12.2 Implement lazy loading for attachments
    - Load attachment previews only when expanded
    - Use Intersection Observer for lazy images
    - _Requirements: 13.4_





  
  - [ ] 12.3 Add OnPush change detection
    - Set changeDetection to OnPush for all components
    - Use signals for reactive updates

    - Minimize unnecessary re-renders
    - _Requirements: 13.2_
  
  - [ ] 12.4 Optimize video loading
    - Preload video metadata only
    - Use poster image for thumbnail
    - Lazy load video source
    - _Requirements: 13.5_

- [ ] 13. Add Accessibility Features
  - [ ] 13.1 Add ARIA labels and roles
    - Add aria-label to all buttons
    - Add aria-expanded to accordions
    - Add aria-current to active lesson
    - Add role attributes where needed
    - _Requirements: 12.5_
  
  - [ ] 13.2 Implement focus management
    - Focus on lesson content when selected
    - Trap focus in modals
    - Add visible focus indicators
    - _Requirements: 12.5_
  
  - [ ] 13.3 Add screen reader support
    - Use semantic HTML elements
    - Add descriptive alt text for images
    - Add aria-live regions for updates
    - Add skip links for navigation
    - _Requirements: 12.5_

- [ ] 14. Wire up routing and navigation
  - [ ] 14.1 Configure routes for learning pages
    - Add route for course overview: `/student/learn/course/:id`
    - Add route for learning page: `/student/learn/course/:courseId/lesson/:lessonId`
    - Add route guards for authentication
    - _Requirements: 2.1, 3.1_
  
  - [ ] 14.2 Implement navigation between pages
    - Navigate from overview to learning page
    - Navigate from course list to overview
    - Handle back button navigation
    - _Requirements: 3.1, 3.2_

- [ ] 15. Final integration and polish
  - [ ] 15.1 Test complete learning flow
    - Test course overview page
    - Test lesson selection and navigation
    - Test video playback and completion
    - Test attachment viewing
    - Test progress tracking
    - _Requirements: All_
  
  - [ ] 15.2 Add smooth transitions and animations
    - Add fade-in animation for lesson content
    - Add slide animation for sidebar
    - Add hover effects for buttons
    - _Requirements: 13.1_
  
  - [ ] 15.3 Fix any remaining bugs and issues
    - Test on different browsers
    - Test on different devices
    - Fix any console errors or warnings
    - _Requirements: All_

---

**Total Tasks:** 15 main tasks, 48 sub-tasks  
**Estimated Time:** 40-60 hours  
**Priority:** High  
**Status:** Ready for Implementation

**Note:** Tasks marked with "*" are optional and can be skipped for MVP. All other tasks are required for core functionality.
