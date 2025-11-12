# Requirements - Teacher Dashboard Enhancement

## Introduction

Cải thiện Teacher Dashboard theo phong cách Coursera chuyên nghiệp, đồng bộ hoàn toàn với Student Dashboard về design system, layout, và components. Focus vào UI/UX improvements only - KHÔNG thay đổi business logic.

## Glossary

- **Teacher Dashboard**: Trang chủ của giảng viên, hiển thị tổng quan về khóa học, học viên, bài tập
- **KPI Cards**: Cards hiển thị các chỉ số quan trọng (Total Courses, Students, Assignments, Rating)
- **Recent Lists**: Danh sách khóa học và bài tập gần đây
- **Coursera Style**: Phong cách thiết kế chuyên nghiệp, clean, minimal của Coursera
- **Signal**: Angular Signals cho state management

## Requirements

### Requirement 1: Dashboard Layout Structure

**User Story:** As a teacher, I want a clean dashboard layout similar to Coursera, so that I can quickly see my teaching overview

#### Acceptance Criteria

1. THE Dashboard SHALL use 2-column layout: Main column (70%) + Sidebar (30%)
2. THE Dashboard SHALL display greeting header with teacher name (Good morning, [Name])
3. THE Dashboard SHALL show KPI cards in a 4-column grid on desktop
4. THE Dashboard SHALL stack all content vertically on mobile (<768px)
5. THE Dashboard SHALL use consistent spacing (16px, 24px, 32px) throughout

### Requirement 2: KPI Cards Design

**User Story:** As a teacher, I want to see key metrics at a glance, so that I can understand my teaching performance quickly

#### Acceptance Criteria

1. THE KPI Cards SHALL display 4 metrics: Total Courses, Active Courses, Total Students, Average Rating
2. THE KPI Cards SHALL use SVG icons (no emoji) with gradient backgrounds
3. THE KPI Cards SHALL show large numbers (24px font) with labels (13px font)
4. THE KPI Cards SHALL include trend indicators (+12% vs last month) where applicable
5. THE KPI Cards SHALL use white background with subtle shadow (0 1px 3px rgba(0,0,0,0.1))

### Requirement 3: Recent Courses List

**User Story:** As a teacher, I want to see my recent courses, so that I can quickly access them

#### Acceptance Criteria

1. THE Recent Courses SHALL display in a vertical list format (not grid)
2. THE Recent Courses SHALL show: Title, Category, Status badge, Student count, Rating
3. THE Recent Courses SHALL use status badges with colors (Green: Active, Yellow: Draft, Gray: Archived)
4. THE Recent Courses SHALL provide action buttons (Edit, View, Manage Content)
5. THE Recent Courses SHALL limit to 5 items with "View all" link

### Requirement 4: Pending Assignments List

**User Story:** As a teacher, I want to see pending assignments, so that I can prioritize grading work

#### Acceptance Criteria

1. THE Pending Assignments SHALL display in a vertical list format
2. THE Pending Assignments SHALL show: Title, Course, Due date, Submissions count (X/Y)
3. THE Pending Assignments SHALL use color coding (Red: Overdue, Yellow: Due soon, Green: On track)
4. THE Pending Assignments SHALL provide "Grade" action button
5. THE Pending Assignments SHALL limit to 5 items with "View all" link

### Requirement 5: Sidebar Widgets

**User Story:** As a teacher, I want quick access to important information in the sidebar, so that I can stay informed

#### Acceptance Criteria

1. THE Sidebar SHALL display Teaching Statistics widget with key numbers
2. THE Sidebar SHALL show Quick Actions widget with common tasks
3. THE Sidebar SHALL include Recent Activity feed (optional)
4. THE Sidebar SHALL use white background cards with subtle borders
5. THE Sidebar SHALL stack below main content on mobile

### Requirement 6: Responsive Design

**User Story:** As a teacher, I want to access dashboard on mobile, so that I can check status on the go

#### Acceptance Criteria

1. THE Dashboard SHALL transform to single column on mobile (<768px)
2. THE KPI Cards SHALL stack in 2x2 grid on mobile
3. THE Dashboard SHALL ensure 44px minimum touch targets
4. THE Dashboard SHALL use readable font sizes (16px+ body text)
5. THE Dashboard SHALL hide sidebar or move it below main content on mobile

### Requirement 7: Loading and Empty States

**User Story:** As a teacher, I want clear feedback when data is loading, so that I know the system is working

#### Acceptance Criteria

1. THE Dashboard SHALL show skeleton loaders for KPI cards during initial load
2. THE Dashboard SHALL display loading spinners for list data
3. THE Dashboard SHALL show empty state messages when no data exists
4. THE Dashboard SHALL provide retry button on error states
5. THE Dashboard SHALL use smooth transitions (200-300ms) for state changes

### Requirement 8: Consistency with Student Dashboard

**User Story:** As a developer, I want Teacher Dashboard to match Student Dashboard design, so that the system feels cohesive

#### Acceptance Criteria

1. THE Dashboard SHALL use the same color palette as Student Dashboard (Blue primary #0056D2, neutral grays)
2. THE Dashboard SHALL use the same typography (Source Sans Pro/Inter, same sizes and weights)
3. THE Dashboard SHALL use the same spacing system (8px grid)
4. THE Dashboard SHALL use the same component styles (buttons, cards, badges)
5. THE Dashboard SHALL follow the same layout patterns (2-column, sidebar, widgets)

---

**Version**: 1.0  
**Status**: Ready for Design  
**Philosophy**: Simple, Professional, Coursera Style, Consistent with Student

