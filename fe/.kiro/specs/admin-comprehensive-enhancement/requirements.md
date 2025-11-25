# Requirements Document - Admin Portal Comprehensive Enhancement

## Introduction

Dự án này tập trung vào việc cải thiện toàn diện Admin Portal của LMS Maritime theo phong cách Coursera chuyên nghiệp, đồng bộ hoàn toàn với Student và Teacher Portals đã được nâng cấp. Mục tiêu là tạo ra một giao diện quản trị mạnh mẽ, dễ sử dụng, tuân thủ kiến trúc DDD và clean architecture, đồng thời đảm bảo không làm hỏng business logic hiện có.

**Design Philosophy:**
- Clean, minimal, professional (Coursera-inspired)
- DDD Architecture với clear boundaries
- Simple & Practical implementation
- Đồng bộ 100% với Student/Teacher design system
- Focus on core admin features
- No over-engineering

## Glossary

- **Admin Portal**: Giao diện quản trị hệ thống LMS Maritime
- **LMS System**: Learning Management System - Hệ thống quản lý học tập
- **DDD**: Domain-Driven Design - Thiết kế hướng miền
- **Infrastructure Layer**: Lớp chứa services, API clients, external dependencies
- **Presentation Layer**: Lớp chứa components, UI logic
- **Page Component**: Smart component chứa business logic và state
- **UI Component**: Dumb component chỉ hiển thị và emit events
- **Service**: Class chứa business logic và API calls
- **Model**: TypeScript interface định nghĩa data structure
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines - Tiêu chuẩn accessibility
- **Coursera Style**: Phong cách thiết kế chuyên nghiệp, clean, minimal của Coursera
- **KPI Card**: Key Performance Indicator display card
- **Skeleton Loader**: Placeholder UI hiển thị khi đang loading
- **SVG Icon**: Scalable Vector Graphics icon (thay thế emoji)

---

## Requirements

### Requirement 1: Clean Architecture & DDD Structure

**User Story:** As a developer, I want a clean, maintainable architecture following DDD principles, so that the codebase is scalable and easy to understand

#### Acceptance Criteria

1.1 THE Admin Portal SHALL organize code into Infrastructure and Presentation layers following DDD principles

1.2 THE Infrastructure layer SHALL contain only services, API clients, and external dependencies without UI logic

1.3 THE Presentation layer SHALL contain only components, pages, and UI-related logic without direct API calls

1.4 THE Admin Portal SHALL use Page Components as smart containers that handle state and orchestration

1.5 THE Admin Portal SHALL use UI Components as presentational components that only display data and emit events

1.6 THE Admin Portal SHALL eliminate all duplicate components by consolidating them into single authoritative locations

1.7 THE Admin Portal SHALL ensure no component exceeds 500 lines of code by splitting into smaller sub-components

1.8 THE Admin Portal SHALL extract all inline templates exceeding 200 lines to separate HTML files

---

### Requirement 2: Professional Dashboard Design

**User Story:** As an admin, I want a clean, professional dashboard similar to Coursera, so that I can quickly monitor system health and access key functions

#### Acceptance Criteria

2.1 THE Dashboard SHALL display key metrics in KPI cards (Total Users, Teachers, Students, Courses, Revenue, System Uptime)

2.2 THE Dashboard SHALL use color-coded left borders for KPI cards (Red: Users, Purple: Teachers, Blue: Students, Green: Courses, Yellow: Revenue, Purple: Uptime)

2.3 THE Dashboard SHALL show growth indicators with percentage change and trend arrows (↑/↓)

2.4 THE Dashboard SHALL display quick action buttons in a responsive grid (3 columns desktop, 2 tablet, 1 mobile)

2.5 THE Dashboard SHALL show system status indicators with color-coded dots (Green: Healthy, Yellow: Warning, Red: Error)

2.6 THE Dashboard SHALL display real-time activity feed from API (not hardcoded)

2.7 THE Dashboard SHALL provide a refresh button to manually update dashboard data

2.8 THE Dashboard SHALL display last update timestamp

2.9 THE Dashboard SHALL use professional SVG icons instead of emoji for all visual elements

2.10 THE Dashboard SHALL maintain consistent spacing, typography, and color scheme following Coursera style

---

### Requirement 3: Comprehensive User Management

**User Story:** As an admin, I want a powerful user management interface, so that I can efficiently manage all users in the system

#### Acceptance Criteria

3.1 THE User Management SHALL display users in a responsive table with columns (Avatar, Name/Email, Role, Status, Last Login, Statistics, Actions)

3.2 THE User Management SHALL provide search functionality with debounced input (300ms delay) to filter users by name or email

3.3 THE User Management SHALL provide filter dropdowns for role (Admin, Teacher, Student) and status (Active, Inactive)

3.4 THE User Management SHALL implement pagination with configurable page size (10, 25, 50, 100 items per page)

3.5 THE User Management SHALL display pagination controls with page numbers, previous/next buttons, and total count

3.6 THE User Management SHALL provide inline role change via dropdown with confirmation dialog

3.7 THE User Management SHALL provide toggle status button (Active/Inactive) with visual feedback

3.8 THE User Management SHALL provide delete button with confirmation dialog

3.9 THE User Management SHALL provide create user modal with form validation (Name, Email, Role required)

3.10 THE User Management SHALL provide bulk import functionality via Excel file upload with progress tracking

3.11 THE User Management SHALL display import results with success/failure counts and error details

3.12 THE User Management SHALL use color-coded badges for roles (Green: Admin, Purple: Teacher, Blue: Student)

3.13 THE User Management SHALL use color-coded badges for status (Green: Active, Red: Inactive)

3.14 THE User Management SHALL display user statistics (Courses Created for Teachers, Courses Enrolled for Students, Login Count for all)

---

### Requirement 4: Efficient Course Management

**User Story:** As an admin, I want to review and manage courses efficiently, so that only quality content is published to students

#### Acceptance Criteria

4.1 THE Course Management SHALL display courses in a responsive grid layout (3 columns desktop, 2 tablet, 1 mobile)

4.2 THE Course Management SHALL show course cards with thumbnail, title, description, instructor, status badge, enrollment count, rating, and price

4.3 THE Course Management SHALL use color-coded status badges (Yellow: Pending, Green: Approved, Red: Rejected, Blue: Active, Gray: Archived)

4.4 THE Course Management SHALL provide filter dropdowns for status and category

4.5 THE Course Management SHALL implement search functionality to filter courses by title, description, or instructor name

4.6 THE Course Management SHALL provide approve button for pending courses with confirmation dialog

4.7 THE Course Management SHALL provide reject button for pending courses with rejection reason modal

4.8 THE Course Management SHALL display submission timestamp and approval/rejection timestamp

4.9 THE Course Management SHALL show rejection reason if course was rejected

4.10 THE Course Management SHALL provide view and edit buttons for approved courses

4.11 THE Course Management SHALL implement pagination for course listings

4.12 THE Course Management SHALL display KPI cards (Total Courses, Pending, Approved, Total Revenue)

---

### Requirement 5: Comprehensive Analytics Dashboard

**User Story:** As an admin, I want comprehensive analytics with visualizations, so that I can make data-driven decisions

#### Acceptance Criteria

5.1 THE Analytics Dashboard SHALL display key metrics in KPI cards (Total Users, Teachers, Students, Courses)

5.2 THE Analytics Dashboard SHALL show growth indicators with percentage change and trend arrows

5.3 THE Analytics Dashboard SHALL display revenue analytics section (Total Revenue, Monthly Revenue, Growth Rate)

5.4 THE Analytics Dashboard SHALL show course statistics broken down by status (Pending, Approved, Rejected, Active)

5.5 THE Analytics Dashboard SHALL display system health monitoring with status indicators (Database, API, Storage, Email)

5.6 THE Analytics Dashboard SHALL show user growth tracking (This Month, Last Month, Growth Rate) with progress bar

5.7 THE Analytics Dashboard SHALL display active users count with percentage of total users

5.8 THE Analytics Dashboard SHALL provide a refresh button to update analytics data manually

5.9 THE Analytics Dashboard SHALL display the last update timestamp

5.10 THE Analytics Dashboard SHALL include placeholder section for future charts integration

---

### Requirement 6: Consistent Visual Design System

**User Story:** As a user, I want a consistent visual design across all admin pages, so that the interface feels cohesive and professional

#### Acceptance Criteria

6.1 THE Admin Portal SHALL use the same color palette as Student/Teacher Portals (Blue primary #0056D2, neutral grays)

6.2 THE Admin Portal SHALL maintain consistent spacing using 8px grid system (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)

6.3 THE Admin Portal SHALL use consistent typography with clear hierarchy (12px, 14px, 16px, 18px, 20px, 24px, 30px)

6.4 THE Admin Portal SHALL use consistent border-radius values (4px small, 8px cards, 12px modals, 16px large)

6.5 THE Admin Portal SHALL apply consistent shadow styles (subtle for cards, stronger for modals)

6.6 THE Admin Portal SHALL use professional SVG icons from shared icon component library (NO emoji)

6.7 THE Admin Portal SHALL follow Coursera design patterns for familiar user experience

6.8 THE Admin Portal SHALL use semantic colors (Success: #059669, Warning: #D97706, Error: #DC2626, Info: #2563EB)

6.9 THE Admin Portal SHALL use role-specific colors (Admin: Green, Teacher: Purple, Student: Blue)

---

### Requirement 7: Loading States & Feedback

**User Story:** As an admin, I want clear visual feedback during data loading, so that I know the system is working

#### Acceptance Criteria

7.1 WHEN data is being fetched from API, THE System SHALL display skeleton loaders matching the expected content structure

7.2 WHEN a user action triggers an API call, THE System SHALL disable the action button and show a loading spinner

7.3 WHEN table data is loading, THE System SHALL display skeleton rows with animated shimmer effect

7.4 WHEN a modal operation is in progress, THE System SHALL show a loading overlay with progress indicator

7.5 THE System SHALL display loading states for a minimum of 300ms to prevent flickering on fast connections

7.6 THE System SHALL show progress bars for long-running operations (bulk import, data export)

---

### Requirement 8: Responsive Mobile Design

**User Story:** As an admin, I want to access the portal on mobile devices, so that I can manage the system on the go

#### Acceptance Criteria

8.1 THE Admin Portal SHALL display properly on mobile devices (320px - 768px width)

8.2 WHEN viewing on mobile (< 768px), THE System SHALL transform tables into card layouts

8.3 WHEN viewing on mobile, THE System SHALL display a hamburger menu for navigation

8.4 WHEN viewing on mobile, THE System SHALL stack KPI cards vertically

8.5 THE System SHALL ensure all interactive elements have minimum touch target size of 44x44px

8.6 THE System SHALL use responsive grid layouts that adapt to screen size (1/2/3/4 columns)

8.7 THE System SHALL ensure text remains readable with minimum font size of 14px on mobile

8.8 THE System SHALL hide non-essential columns in tables on mobile devices

---

### Requirement 9: Accessibility Compliance

**User Story:** As an admin with disabilities, I want the portal to be keyboard navigable and screen reader friendly, so that I can use it effectively

#### Acceptance Criteria

9.1 THE Admin Portal SHALL provide aria-label attributes for all icon-only buttons

9.2 THE Admin Portal SHALL ensure all interactive elements are keyboard accessible with visible focus indicators

9.3 THE Admin Portal SHALL maintain logical tab order throughout all pages

9.4 THE Admin Portal SHALL ensure color contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

9.5 THE Admin Portal SHALL provide role attributes for custom components (role="navigation", role="dialog", role="table")

9.6 THE Admin Portal SHALL announce loading states to screen readers using aria-live regions

9.7 THE Admin Portal SHALL provide skip navigation links for keyboard users

9.8 THE Admin Portal SHALL use semantic HTML (headings, lists, buttons, tables) for proper structure

---

### Requirement 10: Performance Optimization

**User Story:** As an admin, I want fast page loads and smooth interactions, so that I can work efficiently

#### Acceptance Criteria

10.1 THE Admin Portal SHALL implement OnPush change detection strategy for all components

10.2 THE Admin Portal SHALL lazy load admin routes to reduce initial bundle size

10.3 THE Admin Portal SHALL implement virtual scrolling for lists exceeding 100 items

10.4 THE Admin Portal SHALL debounce search inputs with 300ms delay to reduce API calls

10.5 THE Admin Portal SHALL cache analytics data for 5 minutes to reduce server load

10.6 THE Admin Portal SHALL optimize images with lazy loading and appropriate formats (WebP)

10.7 THE Admin Portal SHALL load initial page in less than 2 seconds on 3G connection

10.8 THE Admin Portal SHALL achieve Lighthouse performance score > 90

---

### Requirement 11: Error Handling & Recovery

**User Story:** As an admin, I want clear error messages and recovery options, so that I can resolve issues quickly

#### Acceptance Criteria

11.1 WHEN an API call fails, THE System SHALL display a user-friendly error message with retry option

11.2 WHEN form validation fails, THE System SHALL display inline error messages below each invalid field

11.3 WHEN a network error occurs, THE System SHALL display a banner with "Check your connection" message

11.4 WHEN an unauthorized error occurs, THE System SHALL redirect to login page with appropriate message

11.5 THE System SHALL log all errors to console for debugging purposes

11.6 THE System SHALL provide a global error boundary to catch and display unexpected errors

11.7 THE System SHALL show actionable error messages with suggestions (e.g., "Try again", "Contact support")

---

### Requirement 12: Shared Reusable Components

**User Story:** As a developer, I want reusable components for common UI patterns, so that I can build features faster and maintain consistency

#### Acceptance Criteria

12.1 THE Admin Portal SHALL provide a reusable Badge component with variants (success, warning, error, info, default) and sizes (sm, md, lg)

12.2 THE Admin Portal SHALL provide a reusable Table component with sorting, filtering, pagination, and loading states

12.3 THE Admin Portal SHALL provide a reusable Modal component with header, body, footer, and close functionality

12.4 THE Admin Portal SHALL provide a reusable Form component with validation and error display

12.5 THE Admin Portal SHALL provide a reusable Empty State component with icon, message, and action button

12.6 THE Admin Portal SHALL provide a reusable Skeleton Loader component with configurable shapes (rectangle, circle, text)

12.7 THE Admin Portal SHALL provide a reusable KPI Card component with icon, value, label, and trend indicator

---

### Requirement 13: Business Logic Preservation

**User Story:** As a developer, I want UI/UX improvements without breaking existing functionality, so that the system remains stable

#### Acceptance Criteria

13.1 THE System SHALL NOT modify any API endpoints or request/response formats

13.2 THE System SHALL NOT change business logic in services or components

13.3 THE System SHALL NOT alter database schemas or data models

13.4 THE System SHALL NOT modify authentication or authorization logic

13.5 THE System SHALL maintain backward compatibility with existing features

13.6 THE System SHALL preserve all existing user workflows and interactions

13.7 THE System SHALL NOT introduce breaking changes to existing APIs

---

### Requirement 14: Code Quality & Maintainability

**User Story:** As a developer, I want clean, maintainable code, so that future enhancements are easy to implement

#### Acceptance Criteria

14.1 THE Admin Portal SHALL ensure no component exceeds 500 lines of code

14.2 THE Admin Portal SHALL ensure no inline template exceeds 200 lines

14.3 THE Admin Portal SHALL use TypeScript strict mode for type safety

14.4 THE Admin Portal SHALL follow Angular style guide and best practices

14.5 THE Admin Portal SHALL use signals for reactive state management

14.6 THE Admin Portal SHALL use computed signals for derived state

14.7 THE Admin Portal SHALL avoid complex state patterns (Redux, NgRx) for simple CRUD operations

14.8 THE Admin Portal SHALL provide clear comments for complex logic

14.9 THE Admin Portal SHALL use meaningful variable and function names

14.10 THE Admin Portal SHALL follow consistent naming conventions (camelCase for variables, PascalCase for components)

---

## Success Criteria

- ✅ All emoji replaced with SVG icons
- ✅ All components follow DDD architecture
- ✅ All components < 500 lines
- ✅ Design system 100% synced with Student/Teacher
- ✅ Loading states implemented for all async operations
- ✅ Responsive design works on mobile, tablet, desktop
- ✅ Accessibility meets WCAG AA standards
- ✅ No business logic changes
- ✅ Code remains maintainable and well-organized
- ✅ Performance targets met (LCP < 2.5s, FID < 100ms, Lighthouse > 90)
- ✅ All duplicate components eliminated
- ✅ User management fully functional with bulk import
- ✅ Course management with approve/reject workflow
- ✅ Analytics dashboard with comprehensive metrics

---

**Document Version**: 1.0  
**Created**: November 13, 2025  
**Status**: Ready for Review  
**Philosophy**: Clean, Professional, DDD-Compliant, Practical
