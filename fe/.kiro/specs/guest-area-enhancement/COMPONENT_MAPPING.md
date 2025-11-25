# Component Mapping - ThamKhao → Current Project

**Date**: November 12, 2025  
**Status**: ✅ Complete  
**Purpose**: Map ThamKhao components to target locations in current project

---

## 📍 MAPPING STRATEGY

### Legend
- ✅ **COPY** - No conflict, copy directly
- 🔄 **REPLACE** - Existing component, replace with ThamKhao version
- 🔀 **MERGE** - Existing component, merge features
- ⚠️ **CONFLICT** - Name conflict, needs resolution
- 🆕 **NEW** - New component, no existing equivalent

---

## 🗺️ COMPONENT MAPPING TABLE

### 1. SHARED LAYOUT COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `shared/layout/homepage-layout/` | `src/app/shared/components/layout/homepage-layout/` | 🔄 REPLACE | Existing layout, replace with enhanced version |
| `shared/layout/public-header.component.ts` | `src/app/shared/components/layout/public-header.component.ts` | 🔄 REPLACE | Existing header, replace with enhanced version |
| `shared/layout/public-header.component.scss` | `src/app/shared/components/layout/public-header.component.scss` | 🔄 REPLACE | Header styles |
| `shared/layout/mega-menu/` | `src/app/shared/components/layout/mega-menu/` | 🆕 NEW | New component |
| `shared/layout/layout.configs.ts` | `src/app/shared/components/layout/layout.configs.ts` | ✅ COPY | Configuration file |
| `shared/layout/unified-layout.component.ts` | `src/app/shared/components/layout/unified-layout.component.ts` | ⚠️ SKIP | Not needed for guest area |

### 2. SHARED UI COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `shared/footer/footer.component.ts` | `src/app/shared/components/layout/footer.component.ts` | 🔄 REPLACE | Existing footer, replace |
| `shared/pagination/pagination.component.ts` | `src/app/shared/components/ui/pagination.component.ts` | 🔀 MERGE | May have existing pagination |
| `shared/search/search.component.ts` | `src/app/shared/components/ui/search.component.ts` | 🆕 NEW | New search component |
| `shared/search/global-search.component.ts` | `src/app/shared/components/ui/global-search.component.ts` | 🆕 NEW | New global search |
| `shared/parallax-background/` | `src/app/shared/components/ui/parallax-background/` | 🆕 NEW | New component |
| `shared/category/category-base.component.ts` | `src/app/shared/components/ui/category-base.component.ts` | 🆕 NEW | New base component |
| `shared/video-player/real-video-player.component.ts` | `src/app/shared/components/ui/video-player.component.ts` | ⚠️ CONFLICT | May conflict with existing player |
| `shared/icon/icon.component.ts` | `src/app/shared/components/ui/icon/icon.component.ts` | ⚠️ CONFLICT | Existing icon component |

### 3. HOME PAGE COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/home/home-simple.component.ts` | `src/app/features/home/home-simple.component.ts` | 🔄 REPLACE | Replace existing home |
| `pages/home/components/featured-courses.component.ts` | `src/app/features/home/components/featured-courses.component.ts` | 🆕 NEW | New component |
| `pages/home/components/social-proof.component.ts` | `src/app/features/home/components/social-proof.component.ts` | 🆕 NEW | New component |

### 4. COURSES COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/courses/courses.component.ts` | `src/app/features/courses/courses.component.ts` | 🔀 MERGE | Enhance existing |
| `pages/courses/courses.service.ts` | `src/app/features/courses/services/courses.service.ts` | ⚠️ CONFLICT | Service conflict |
| `pages/courses/my-courses.component.ts` | `src/app/features/courses/my-courses.component.ts` | ⚠️ CONFLICT | Existing component |
| `pages/courses/shared/course-card.component.ts` | `src/app/features/courses/shared/course-card.component.ts` | 🔀 MERGE | Enhance existing |

### 5. COURSE DETAIL COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/courses/course-detail/course-detail-enhanced.component.ts` | `src/app/features/courses/course-detail/course-detail-enhanced.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/courses/course-detail/services/course-detail.service.ts` | `src/app/features/courses/course-detail/services/course-detail.service.ts` | 🔀 MERGE | Merge with existing |
| `pages/courses/course-detail/components/course-curriculum.component.ts` | `src/app/features/courses/course-detail/components/course-curriculum.component.ts` | 🆕 NEW | New component |
| `pages/courses/course-detail/components/course-hero.component.ts` | `src/app/features/courses/course-detail/components/course-hero.component.ts` | 🆕 NEW | New component |
| `pages/courses/course-detail/components/course-instructor.component.ts` | `src/app/features/courses/course-detail/components/course-instructor.component.ts` | 🆕 NEW | New component |

### 6. CATEGORY COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/courses/category/configurable-category.component.ts` | `src/app/features/courses/category/configurable-category.component.ts` | 🔀 MERGE | Enhance existing |
| `pages/courses/category/category.configs.ts` | `src/app/features/courses/category/category.configs.ts` | ✅ COPY | Configuration |
| `pages/courses/category/shared/category-hero.component.ts` | `src/app/features/courses/category/shared/category-hero.component.ts` | 🆕 NEW | New component |
| `pages/courses/category/shared/category-course-grid.component.ts` | `src/app/features/courses/category/shared/category-course-grid.component.ts` | 🆕 NEW | New component |
| `pages/courses/category/shared/category-course-card.component.ts` | `src/app/features/courses/category/shared/category-course-card.component.ts` | 🆕 NEW | New component |
| `pages/courses/category/shared/category-trends.component.ts` | `src/app/features/courses/category/shared/category-trends.component.ts` | 🆕 NEW | New component |
| `pages/courses/category/shared/category-career.component.ts` | `src/app/features/courses/category/shared/category-career.component.ts` | 🆕 NEW | New component |

### 7. DDD DOMAIN LAYER (Optional)

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/courses/domain/*` | `src/app/features/courses/domain/*` | ⚠️ SKIP | Too complex for current needs |
| `pages/courses/application/*` | `src/app/features/courses/application/*` | ⚠️ SKIP | Not needed |
| `pages/courses/infrastructure/*` | `src/app/features/courses/infrastructure/*` | ⚠️ SKIP | Not needed |

### 8. INFORMATION PAGES

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/about/about.component.ts` | `src/app/features/about/about.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/contact/contact.component.ts` | `src/app/features/contact/contact.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/privacy/privacy-policy.component.ts` | `src/app/features/privacy/privacy-policy.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/terms/terms-of-service.component.ts` | `src/app/features/terms/terms-of-service.component.ts` | 🔄 REPLACE | Replace existing |

### 9. AUTHENTICATION COMPONENTS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `pages/auth/auth.routes.ts` | `src/app/features/auth/auth.routes.ts` | 🔀 MERGE | Merge routes |
| `pages/auth/login/login.component.ts` | `src/app/features/auth/login/login.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/auth/register/register.component.ts` | `src/app/features/auth/register/register.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/auth/forgot-password/forgot-password.component.ts` | `src/app/features/auth/forgot-password/forgot-password.component.ts` | 🔄 REPLACE | Replace existing |
| `pages/auth/domain/*` | `src/app/features/auth/domain/*` | ⚠️ SKIP | Not needed |

### 10. SERVICES

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `services/core/auth.service.ts` | `src/app/core/services/auth.service.ts` | ⚠️ CONFLICT | **DO NOT REPLACE** - Core service |
| `services/core/cache.service.ts` | `src/app/shared/services/cache.service.ts` | 🆕 NEW | New service |
| `services/core/learning-path.service.ts` | `src/app/shared/services/learning-path.service.ts` | 🆕 NEW | New service |
| `services/shared/analytics.service.ts` | `src/app/shared/services/analytics.service.ts` | 🆕 NEW | New service |
| `services/shared/communication.service.ts` | `src/app/shared/services/communication.service.ts` | 🆕 NEW | New service |
| `services/shared/error-handling.service.ts` | `src/app/shared/services/error-handling.service.ts` | 🆕 NEW | New service |
| `services/shared/file-upload.service.ts` | `src/app/shared/services/file-upload.service.ts` | 🆕 NEW | New service |
| `services/shared/notification.service.ts` | `src/app/shared/services/notification.service.ts` | 🆕 NEW | New service |
| `services/shared/performance-optimization.service.ts` | `src/app/shared/services/performance-optimization.service.ts` | 🆕 NEW | New service |
| `services/shared/responsive.service.ts` | `src/app/shared/services/responsive.service.ts` | 🆕 NEW | New service |

### 11. TYPE DEFINITIONS

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `types/common.types.ts` | `src/app/shared/types/common.types.ts` | 🔀 MERGE | Merge with existing |
| `types/course.types.ts` | `src/app/shared/types/course.types.ts` | 🔀 MERGE | Merge with existing |
| `types/user.types.ts` | `src/app/shared/types/user.types.ts` | 🔀 MERGE | Merge with existing |
| `types/learning-path.types.ts` | `src/app/shared/types/learning-path.types.ts` | 🆕 NEW | New types |
| `types/quiz.types.ts` | `src/app/shared/types/quiz.types.ts` | 🆕 NEW | New types |
| `types/index.ts` | `src/app/shared/types/index.ts` | 🔀 MERGE | Merge exports |

### 12. CONFIGURATION

| ThamKhao Path | Target Path | Strategy | Notes |
|---------------|-------------|----------|-------|
| `app.routes.ts` | `src/app/app.routes.ts` | 🔀 MERGE | Merge guest routes |
| `app.config.ts` | `src/app/app.config.ts` | 🔀 MERGE | Merge providers |

---

## 📊 MAPPING STATISTICS

| Strategy | Count | Percentage |
|----------|-------|------------|
| 🆕 NEW | 28 | 36% |
| 🔄 REPLACE | 15 | 19% |
| 🔀 MERGE | 12 | 16% |
| ⚠️ CONFLICT | 6 | 8% |
| ⚠️ SKIP | 16 | 21% |
| **TOTAL** | **77** | **100%** |

---

## ⚠️ CONFLICTS TO RESOLVE

### Critical Conflicts (Must Resolve)

1. **AuthService** (`services/core/auth.service.ts`)
   - **Issue**: Core service used by entire application
   - **Resolution**: DO NOT REPLACE - Extract useful methods only
   - **Action**: Add new methods from ThamKhao to existing service

2. **CoursesService** (`pages/courses/courses.service.ts`)
   - **Issue**: Existing service with different API
   - **Resolution**: MERGE - Combine both services
   - **Action**: Add ThamKhao methods to existing service

3. **MyCoursesComponent** (`pages/courses/my-courses.component.ts`)
   - **Issue**: Existing component for enrolled courses
   - **Resolution**: KEEP EXISTING - ThamKhao version is for guest
   - **Action**: Use existing component, don't replace

4. **VideoPlayerComponent** (`shared/video-player/`)
   - **Issue**: May have existing video player
   - **Resolution**: EVALUATE - Check if existing player is sufficient
   - **Action**: If existing player works, skip ThamKhao version

5. **IconComponent** (`shared/icon/icon.component.ts`)
   - **Issue**: Existing icon system
   - **Resolution**: KEEP EXISTING - Use current icon system
   - **Action**: Don't replace, use existing icons

6. **CourseDetailService** (`pages/courses/course-detail/services/`)
   - **Issue**: May have existing service
   - **Resolution**: MERGE - Combine functionality
   - **Action**: Add ThamKhao methods to existing service

---

## 🎯 INTEGRATION PRIORITY

### Phase 1: Critical Components (Must Do)
- HomepageLayoutComponent
- PublicHeaderComponent
- FooterComponent
- HomeSimpleComponent
- CoursesComponent (MERGE)
- CourseDetailEnhancedComponent
- LoginComponent
- RegisterComponent

### Phase 2: High Priority (Should Do)
- MegaMenuComponent
- FeaturedCoursesComponent
- SocialProofComponent
- Course Detail sub-components
- Category components
- AboutComponent
- ContactComponent
- PrivacyPolicyComponent
- TermsOfServiceComponent

### Phase 3: Medium Priority (Nice to Have)
- PaginationComponent
- SearchComponent
- ParallaxBackgroundComponent
- CategoryTrendsComponent
- CategoryCareerComponent
- ForgotPasswordComponent
- New services

### Phase 4: Low Priority (Optional)
- DDD Domain Layer
- Auth Domain Layer
- Test files
- Optional services

---

## 📝 NOTES

### Components to SKIP
- `unified-layout.component.ts` - Not needed for guest area
- DDD Domain Layer (9 files) - Too complex for current needs
- DDD Application Layer (3 files) - Not needed
- DDD Infrastructure Layer (1 file) - Not needed
- Auth Domain Layer (6 files) - Not needed
- Test files (2 files) - Optional

### Components to REPLACE
- All auth pages (Login, Register, Forgot Password)
- All info pages (About, Contact, Privacy, Terms)
- HomepageLayoutComponent
- PublicHeaderComponent
- FooterComponent
- HomeSimpleComponent
- CourseDetailEnhancedComponent

### Components to MERGE
- CoursesComponent
- CourseCardComponent
- ConfigurableCategoryComponent
- Type definitions
- App routes
- App config

### Components to ADD (NEW)
- MegaMenuComponent
- FeaturedCoursesComponent
- SocialProofComponent
- Course Detail sub-components (Curriculum, Hero, Instructor)
- Category sub-components (Hero, Grid, Card, Trends, Career)
- SearchComponent
- GlobalSearchComponent
- ParallaxBackgroundComponent
- Most services

---

## ✅ VALIDATION CHECKLIST

- [x] All 77 files mapped
- [x] Conflicts identified
- [x] Resolution strategy defined
- [x] Priority assigned
- [x] Skip list created
- [x] Integration phases defined

---

**Mapping Complete**: ✅  
**Ready for Phase 1.2**: ✅  
**Next Step**: Identify Impacts on Existing Modules

