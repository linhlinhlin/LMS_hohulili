# PWA Offline Fallback Fixes Design

Date: 2026-04-23

Related issues:
- #78 `bug(pwa): offline public course fallback collapses cached downloads to empty lists`
- #79 `bug(pwa): offline fallback page links downloaded courses to non-existent learn route`

## Problem

The offline path for `GET /api/v3/courses` returns a raw cached-course array while multiple frontend consumers assume a Spring-style page envelope. This collapses cached data to empty lists in offline browse/search flows.

Separately, the `/offline` recovery page links downloaded courses to `/learn/course/:id`, but the canonical student learning route is `/student/learn/course/:id`.

## Goals

- Preserve cached courses when `/api/v3/courses` is intercepted offline.
- Restore compatibility with existing consumers that read `res.data.content` and pagination metadata.
- Fix the offline recovery navigation so a downloaded course opens a valid learning route.
- Keep the patch small and isolated to the PWA/offline lane.

## Chosen Approach

### #78

Normalize the offline `/api/v3/courses` fallback at the interceptor boundary instead of patching every consumer.

The interceptor will:
- parse `search`, `page`, and `size` from the request URL
- filter cached courses by searchable fields that exist offline
- paginate the filtered list
- return a Spring-like `data` page object plus top-level `pagination`

This keeps existing consumers such as `CourseApi.publicCourses()`, header search, and WebMCP search compatible without broad refactors.

### #79

Update the `/offline` downloaded-course link to the canonical student learning prefix `/student/learn/course`.

Expose the route prefix as a constant so it can be covered by a focused unit test without introducing extra navigation logic.

## Out Of Scope

- Broader offline architecture refactors
- Reworking cached course metadata beyond what already exists offline
- Redesigning the `/offline` page

## Verification Plan

- Add focused frontend unit tests for:
  - offline course listing response normalization
  - offline fallback route prefix
- Run targeted frontend tests for the new specs
- Run a frontend build to catch template/type regressions
