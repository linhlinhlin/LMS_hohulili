# Implementation Tasks - Teacher Dashboard Enhancement

## Overview

Implementation plan để cải thiện Teacher Dashboard theo phong cách Coursera, đồng bộ với Student Dashboard. Chỉ focus vào UI/UX improvements.

## Task List

- [ ] 1. Create Dashboard Layout Structure
  - Tạo 2-column layout (Main 70% + Sidebar 30%)
  - Add greeting header component
  - Implement responsive grid system
  - Ensure đồng bộ với Student Dashboard layout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.1 Create Dashboard Container
  - Update `teacher-dashboard.component.html` với 2-column grid layout
  - Use CSS Grid với `grid-template-columns: 1fr 380px`
  - Add responsive breakpoint: single column on mobile (<1024px)
  - Set max-width: 1400px, center align
  - _Requirements: 1.1, 1.2_

- [ ] 1.2 Add Greeting Header
  - Add greeting section: "Good morning, [Teacher Name]"
  - Get teacher name from AuthService
  - Add subtitle: "Tổng quan giảng dạy của bạn"
  - Use typography: 28px bold for greeting, 15px for subtitle
  - _Requirements: 1.2_

- [ ] 1.3 Create Dashboard SCSS File
  - Create `teacher-dashboard.component.scss`
  - Import design tokens from `_variables.scss`
  - Define layout styles (container, columns, spacing)
  - Ensure consistency với Student Dashboard SCSS
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 2. Implement KPI Cards
  - Create 4 KPI cards: Total Courses, Active Courses, Total Students, Average Rating
  - Add SVG icons với gradient backgrounds
  - Display large numbers với trend indicators
  - Add hover effects
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 Create KPI Grid Layout
  - Add KPI grid với 4 columns on desktop
  - Transform to 2x2 grid on mobile
  - Use gap: 16px between cards
  - Add margin-bottom: 32px
  - _Requirements: 2.1_

- [ ] 2.2 Design KPI Card Component
  - Create card structure: icon + label + value + trend
  - Add gradient icon background (blue gradient)
  - Use white background với subtle shadow
  - Add hover effect: lift up 2px, increase shadow
  - _Requirements: 2.2, 2.3_

- [ ] 2.3 Add KPI Data Binding
  - Bind Total Courses từ `teacher.totalCourses()`
  - Bind Active Courses từ `teacher.activeCourses().length`
  - Bind Total Students từ `teacher.totalStudents()`
  - Calculate Average Rating từ courses
  - _Requirements: 2.3, 2.4_

- [ ]* 2.4 Add Trend Indicators
  - Add trend percentage (+12%, -5%, etc.)
  - Use green for positive, red for negative
  - Add "vs. tháng trước" comparison text
  - _Requirements: 2.4_

- [ ] 3. Implement Recent Courses List
  - Display recent courses in vertical list
  - Show: Title, Category, Status badge, Student count
  - Add action buttons (Edit, View)
  - Limit to 5 items với "View all" link
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.1 Create Section Card Container
  - Create section card với white background
  - Add section header với title + "View all" link
  - Use padding: 24px, border-radius: 12px
  - Add subtle shadow
  - _Requirements: 3.1_

- [ ] 3.2 Design Course List Items
  - Create course item với horizontal layout
  - Left: Course info (title, meta)
  - Right: Action buttons
  - Use background: #F9FAFB, hover: #F3F4F6
  - _Requirements: 3.2, 3.3_

- [ ] 3.3 Add Status Badges
  - Create badge component với colors
  - Green: Active, Yellow: Draft, Gray: Archived
  - Use rounded-full style (border-radius: 12px)
  - Font-size: 12px, padding: 2px 8px
  - _Requirements: 3.3_

- [ ] 3.4 Add Action Buttons
  - Add "Edit" button với pencil icon
  - Add "View" button với eye icon
  - Use ghost button style (white bg, border)
  - Add hover effects
  - _Requirements: 3.4_

- [ ] 3.5 Bind Recent Courses Data
  - Get recent courses từ `teacher.courses() | slice:0:5`
  - Sort by updatedAt descending
  - Handle empty state: "Chưa có khóa học nào"
  - _Requirements: 3.5_

- [ ] 4. Implement Pending Assignments List
  - Display pending assignments in vertical list
  - Show: Title, Course, Due date, Submissions count
  - Add "Grade" action button
  - Highlight overdue assignments
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4.1 Create Assignments List Container
  - Similar structure to courses list
  - Section card với header + list
  - Limit to 5 items
  - _Requirements: 4.1_

- [ ] 4.2 Design Assignment List Items
  - Horizontal layout: Info + Action button
  - Show title, course name, due date, submissions
  - Use same styling as course items
  - _Requirements: 4.2, 4.3_

- [ ] 4.3 Add Due Date Highlighting
  - Check if due date < today → mark as overdue
  - Use red color (#EF4444) for overdue
  - Use yellow for due soon (within 3 days)
  - _Requirements: 4.3_

- [ ] 4.4 Add Grade Button
  - Create primary button với "Chấm điểm" label
  - Add clipboard icon
  - Link to grading page
  - _Requirements: 4.4_

- [ ] 4.5 Bind Pending Assignments Data
  - Filter assignments where status === 'pending'
  - Sort by dueDate ascending
  - Limit to 5 items
  - Handle empty state
  - _Requirements: 4.5_

- [ ] 5. Implement Sidebar Widgets
  - Create Teaching Statistics widget
  - Create Quick Actions widget
  - Ensure responsive behavior
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.1 Create Statistics Widget
  - Show 4 stats: Active Courses, Total Students, Avg Progress, Avg Rating
  - Use horizontal layout: label (left) + value (right)
  - Add dividers between items
  - _Requirements: 5.1, 5.2_

- [ ] 5.2 Calculate Statistics
  - Active Courses: filter courses where status === 'active'
  - Total Students: count all students
  - Avg Progress: average of student.progress
  - Avg Rating: average of course.rating
  - _Requirements: 5.2_

- [ ] 5.3 Create Quick Actions Widget
  - Add 3 action buttons: Create Course, Create Assignment, View Students
  - Use vertical stack layout
  - Add icons to each button
  - _Requirements: 5.3_

- [ ] 5.4 Style Quick Action Buttons
  - Use ghost button style (light gray bg)
  - Add hover effect (white bg, blue border)
  - Ensure 44px minimum height for touch
  - _Requirements: 5.4_

- [ ]* 5.5 Add Recent Activity Widget
  - Show recent activities (course updates, new submissions)
  - Display timestamp và activity type
  - Limit to 5 items
  - _Requirements: 5.5_

- [ ] 6. Add Loading States
  - Add skeleton loaders for KPI cards
  - Add loading spinners for lists
  - Add smooth transitions
  - _Requirements: 6.1, 6.2_

- [ ] 6.1 Create Skeleton Loaders
  - Create skeleton for KPI cards (4 cards)
  - Create skeleton for list items
  - Use gray gradient animation
  - _Requirements: 6.1_

- [ ]* 6.2 Add Loading Transitions
  - Add fade-in animation when data loads
  - Use 200ms duration
  - Add stagger effect for list items
  - _Requirements: 6.2_

- [ ] 7. Add Empty States
  - Add empty state for no courses
  - Add empty state for no assignments
  - Include helpful messages và CTAs
  - _Requirements: 7.1, 7.2_

- [ ] 7.1 Create Empty State Component
  - Show icon + message + CTA button
  - Use centered layout
  - Add subtle background color
  - _Requirements: 7.1_

- [ ]* 7.2 Add Empty State Illustrations
  - Add SVG illustrations for empty states
  - Keep simple and professional
  - Use brand colors
  - _Requirements: 7.2_

- [ ] 8. Responsive Design
  - Ensure mobile layout works correctly
  - Test on tablet and mobile devices
  - Fix any responsive issues
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 8.1 Mobile Layout Adjustments
  - Transform to single column on mobile
  - Move sidebar to top
  - Stack KPI cards in 2x2 grid
  - _Requirements: 8.1_

- [ ] 8.2 Touch Target Optimization
  - Ensure all buttons are at least 44x44px
  - Add adequate spacing between interactive elements
  - Test tap interactions
  - _Requirements: 8.2_

- [ ]* 8.3 Cross-Device Testing
  - Test on iPhone (Safari)
  - Test on Android (Chrome)
  - Test on iPad (Safari)
  - Fix any issues
  - _Requirements: 8.3_

- [ ] 9. Final Polish
  - Add transitions and animations
  - Ensure consistency with Student Dashboard
  - Fix any visual bugs
  - Final testing
  - _Requirements: 9.1, 9.2_

- [ ] 9.1 Add Transitions
  - Add hover transitions for cards (200ms)
  - Add fade-in for content (300ms)
  - Keep animations subtle
  - _Requirements: 9.1_

- [ ]* 9.2 Final Testing and Bug Fixes
  - Test all interactions
  - Verify data binding
  - Check responsive behavior
  - Fix any issues
  - _Requirements: 9.2_

## Success Criteria

- Dashboard follows Coursera professional style
- Đồng bộ 100% với Student Dashboard về design system
- Responsive design works on all devices
- Loading states provide clear feedback
- No business logic changes
- Code remains simple and maintainable

