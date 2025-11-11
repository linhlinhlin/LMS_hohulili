# Requirements Document - Learning Interface Enhancement

## Introduction

Dự án này nhằm cải thiện toàn bộ trải nghiệm học tập (Learning Interface) của hệ thống LMS Hàng Hải, dựa trên phân tích từ Coursera và API documentation từ backend. Mục tiêu là tạo ra một giao diện học tập chuyên nghiệp, dễ sử dụng, và tối ưu hóa cho việc học trực tuyến.

## Glossary

- **Learning System**: Hệ thống giao diện học tập bao gồm course overview, lesson navigation, video player, và content display
- **Course Overview Page**: Trang tổng quan khóa học hiển thị thông tin, sections, lessons trước khi bắt đầu học
- **Learning Page**: Trang học chính với video player, lesson content, và navigation sidebar
- **Lesson**: Một bài học trong khóa học, có thể là video lecture, reading, quiz, hoặc assignment
- **Section**: Một chương/module chứa nhiều lessons
- **Progress Tracking**: Hệ thống theo dõi tiến độ học tập của sinh viên
- **Attachment**: File đính kèm trong lesson (PDF, Office docs, images, videos)
- **Student**: Người dùng với vai trò học viên
- **Teacher**: Người dùng với vai trò giảng viên
- **Admin**: Người dùng với vai trò quản trị viên

## Requirements

### Requirement 1: Course Overview Page

**User Story:** As a student, I want to see a comprehensive course overview before starting to learn, so that I understand the course structure and content.

#### Acceptance Criteria

1. WHEN THE Student navigates to course overview page, THE Learning System SHALL display course title, instructor name, course description, and total number of sections
2. WHEN THE Student views course overview, THE Learning System SHALL display an expandable accordion list of all sections with their lessons
3. WHEN THE Student clicks on a section accordion, THE Learning System SHALL expand to show all lessons in that section with lesson titles, types (Reading/Lab/Quiz/Assignment), and estimated duration
4. WHEN THE Student views a lesson item, THE Learning System SHALL display completion status icon (completed checkmark or empty circle)
5. WHERE THE Student has not enrolled in the course, THE Learning System SHALL display an "Enroll" button and hide lesson content access

### Requirement 2: Learning Page Layout

**User Story:** As a student, I want a clean and organized learning interface, so that I can focus on the lesson content without distractions.

#### Acceptance Criteria

1. WHEN THE Student enters learning page, THE Learning System SHALL display a two-column layout with collapsible sidebar navigation on the left and main content area on the right
2. WHEN THE Student views the sidebar, THE Learning System SHALL display course title, search box, and hierarchical list of sections with lessons
3. WHEN THE Student views the main content area, THE Learning System SHALL display lesson title, lesson type indicator, content area, and previous/next navigation buttons
4. WHEN THE Student clicks the collapse button, THE Learning System SHALL hide the sidebar and expand the main content area to full width
5. WHEN THE Student is on mobile device, THE Learning System SHALL display sidebar as a bottom sheet or drawer that can be toggled

### Requirement 3: Lesson Navigation

**User Story:** As a student, I want to easily navigate between lessons, so that I can move through the course content efficiently.

#### Acceptance Criteria

1. WHEN THE Student clicks on a lesson in the sidebar, THE Learning System SHALL load and display that lesson's content in the main area
2. WHEN THE Student clicks the "Next" button, THE Learning System SHALL navigate to the next lesson in sequence
3. WHEN THE Student clicks the "Previous" button, THE Learning System SHALL navigate to the previous lesson in sequence
4. WHEN THE Student is viewing the first lesson, THE Learning System SHALL disable the "Previous" button
5. WHEN THE Student is viewing the last lesson, THE Learning System SHALL disable the "Next" button
6. WHEN THE Student uses keyboard arrow keys, THE Learning System SHALL navigate to previous (left arrow) or next (right arrow) lesson

### Requirement 4: Video Lesson Display

**User Story:** As a student, I want to watch video lessons with a professional video player, so that I have a good learning experience.

#### Acceptance Criteria

1. WHEN THE Lesson contains a video URL, THE Learning System SHALL display a video player with standard controls (play, pause, volume, fullscreen, playback speed)
2. WHEN THE Student plays a video, THE Learning System SHALL track the watched duration and current timestamp
3. WHEN THE Student finishes watching a video to the end, THE Learning System SHALL automatically mark the lesson as completed
4. WHERE THE Video is a YouTube link, THE Learning System SHALL embed the YouTube player with appropriate parameters
5. WHERE THE Video is a direct video file, THE Learning System SHALL use the native HTML5 video player with appropriate MIME type

### Requirement 5: Lesson Content Display

**User Story:** As a student, I want to read lesson content and descriptions clearly, so that I can understand the material.

#### Acceptance Criteria

1. WHEN THE Lesson contains HTML content, THE Learning System SHALL render the HTML content with proper styling and formatting
2. WHEN THE Lesson contains a description, THE Learning System SHALL display the description below the lesson title
3. WHEN THE Lesson content includes images, THE Learning System SHALL display images inline with proper sizing
4. WHEN THE Lesson content includes links, THE Learning System SHALL make links clickable and open in new tab
5. WHEN THE Lesson content is empty, THE Learning System SHALL display a message indicating no content is available

### Requirement 6: File Attachments

**User Story:** As a student, I want to view and download lesson attachments, so that I can access supplementary materials.

#### Acceptance Criteria

1. WHEN THE Lesson has attachments, THE Learning System SHALL display a list of attachments with file name, file type icon, and file size
2. WHEN THE Student clicks on a PDF attachment, THE Learning System SHALL display an inline PDF viewer
3. WHEN THE Student clicks on an Office document (Word, Excel, PowerPoint), THE Learning System SHALL display the document using Office Online viewer
4. WHEN THE Student clicks on an image attachment, THE Learning System SHALL display the image inline
5. WHEN THE Student clicks on a video or audio attachment, THE Learning System SHALL display an inline media player
6. WHEN THE Student clicks the download button, THE Learning System SHALL download the attachment file to the student's device

### Requirement 7: Progress Tracking

**User Story:** As a student, I want to see my learning progress, so that I know how much of the course I have completed.

#### Acceptance Criteria

1. WHEN THE Student views the course overview, THE Learning System SHALL display overall course progress percentage
2. WHEN THE Student views a lesson in the sidebar, THE Learning System SHALL display a completion indicator (checkmark for completed, empty circle for not started)
3. WHEN THE Student completes a lesson, THE Learning System SHALL update the completion status immediately
4. WHEN THE Student clicks "Mark as Complete" button, THE Learning System SHALL mark the current lesson as completed
5. WHEN THE Student views the course, THE Learning System SHALL calculate progress as (completed lessons / total lessons) * 100

### Requirement 8: Search Functionality

**User Story:** As a student, I want to search for lessons by title or description, so that I can quickly find specific content.

#### Acceptance Criteria

1. WHEN THE Student types in the search box, THE Learning System SHALL filter the lesson list to show only lessons matching the search query
2. WHEN THE Student clears the search box, THE Learning System SHALL display all lessons again
3. WHEN THE Search query matches lesson title, THE Learning System SHALL highlight the matching lesson in the list
4. WHEN THE Search query matches lesson description, THE Learning System SHALL include that lesson in the filtered results
5. WHEN THE Search returns no results, THE Learning System SHALL display a "No lessons found" message

### Requirement 9: Access Control

**User Story:** As a student, I want to be prevented from accessing courses I haven't enrolled in, so that the system maintains proper access control.

#### Acceptance Criteria

1. WHEN THE Student is not enrolled in a course, THE Learning System SHALL display an "Access Denied" message with an "Enroll" button
2. WHEN THE Student clicks the "Enroll" button, THE Learning System SHALL call the enrollment API and reload the course content
3. WHEN THE Enrollment is successful, THE Learning System SHALL grant access to all course content
4. WHERE THE User is a teacher or admin, THE Learning System SHALL grant access to view course content without enrollment
5. WHEN THE API returns a 403 Forbidden error, THE Learning System SHALL display the access denied state

### Requirement 10: Loading and Error States

**User Story:** As a student, I want to see clear loading and error states, so that I understand what is happening in the system.

#### Acceptance Criteria

1. WHEN THE Learning System is loading course data, THE Learning System SHALL display a loading spinner with "Loading course..." message
2. WHEN THE Learning System is loading lesson details, THE Learning System SHALL display a loading overlay on the content area
3. WHEN THE API request fails with a network error, THE Learning System SHALL display an error message with a "Retry" button
4. WHEN THE Lesson is not found, THE Learning System SHALL display a "Lesson not found" message
5. WHEN THE Video fails to load, THE Learning System SHALL display a video error message with troubleshooting tips

### Requirement 11: Responsive Design

**User Story:** As a student, I want to access the learning interface on any device, so that I can learn on desktop, tablet, or mobile.

#### Acceptance Criteria

1. WHEN THE Student views the learning page on desktop (>1024px), THE Learning System SHALL display the sidebar and content side by side
2. WHEN THE Student views the learning page on tablet (768px-1024px), THE Learning System SHALL display a collapsible sidebar
3. WHEN THE Student views the learning page on mobile (<768px), THE Learning System SHALL hide the sidebar by default and show a toggle button
4. WHEN THE Student taps the toggle button on mobile, THE Learning System SHALL display the sidebar as a full-screen overlay or bottom sheet
5. WHEN THE Student views video on mobile, THE Learning System SHALL make the video player responsive and support fullscreen mode

### Requirement 12: Keyboard Navigation

**User Story:** As a student, I want to navigate the learning interface using keyboard shortcuts, so that I can learn more efficiently.

#### Acceptance Criteria

1. WHEN THE Student presses the right arrow key, THE Learning System SHALL navigate to the next lesson
2. WHEN THE Student presses the left arrow key, THE Learning System SHALL navigate to the previous lesson
3. WHEN THE Student presses the space bar while video is focused, THE Learning System SHALL toggle play/pause
4. WHEN THE Student presses the Escape key while sidebar is open on mobile, THE Learning System SHALL close the sidebar
5. WHEN THE Student presses Tab key, THE Learning System SHALL move focus to the next interactive element in logical order

### Requirement 13: Performance Optimization

**User Story:** As a student, I want the learning interface to load quickly and smoothly, so that I have a seamless learning experience.

#### Acceptance Criteria

1. WHEN THE Student navigates to a lesson, THE Learning System SHALL load lesson details within 2 seconds on average network conditions
2. WHEN THE Student scrolls through the lesson list, THE Learning System SHALL render lessons smoothly without lag
3. WHEN THE Student switches between lessons, THE Learning System SHALL cache previously loaded lesson data to avoid redundant API calls
4. WHEN THE Student views attachments, THE Learning System SHALL lazy load attachment previews only when expanded
5. WHEN THE Student plays a video, THE Learning System SHALL preload video metadata without downloading the entire video file

---

**Created:** November 11, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Design Phase
