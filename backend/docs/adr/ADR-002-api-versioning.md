# ADR-002: API Versioning Strategy

## Status
Accepted

## Date
2025-12-18

## Context
During the refactoring to Clean Architecture, we needed to:
- Maintain backward compatibility for existing frontend
- Allow gradual migration to new endpoints
- Support parallel operation of old and new APIs

## Decision
Use URL path versioning with `/api/v2/` prefix for new endpoints.

### Versioning Scheme
- **v1 (legacy)**: `/api/*` - Original endpoints (deprecated)
- **v2 (current)**: `/api/v2/*` - Clean Architecture endpoints

### New v2 Endpoints

#### Authentication (`/api/v2/auth/*`)
- POST `/register` - User registration
- POST `/login` - Authentication
- POST `/refresh` - Token refresh
- POST `/logout` - Logout
- GET `/me` - Current user info
- PUT `/profile` - Update profile
- PUT `/password` - Change password

#### Learning Classes (`/api/v2/classes/*`)
- POST `/` - Create class
- PUT `/{id}` - Update class
- POST `/{id}/close` - Close class
- GET `/{id}/students` - List students
- POST `/{id}/enroll` - Self-enroll
- POST `/{id}/students` - Assign student
- POST `/{id}/students/bulk` - Bulk assign
- DELETE `/{id}/students/{studentId}` - Remove student

#### Quizzes (`/api/v2/quizzes/*`)
- GET `/{quizId}` - Get quiz
- GET `/teacher` - Teacher's quizzes
- POST `/{quizId}/attempts` - Start attempt
- POST `/attempts/{attemptId}/submit` - Submit attempt
- GET `/{quizId}/attempts` - Get attempts

#### Messages (`/api/v2/messages/*`)
- GET `/conversations` - List conversations
- GET `/conversations/{id}` - Get messages
- POST `/` - Send message
- POST `/conversations/{id}/archive` - Archive

#### AI Chat (`/api/v2/ai/chat/*`)
- GET `/sessions` - List sessions
- GET `/sessions/{id}` - Get session
- POST `/sessions` - Create session
- DELETE `/sessions/{id}` - Delete session

## Consequences

### Positive
- Zero downtime migration
- Frontend can migrate endpoint by endpoint
- Clear distinction between old and new APIs
- Easy rollback if issues arise

### Negative
- Temporary code duplication
- Need to maintain both versions during transition
- Documentation must cover both versions

## Migration Plan
1. Deploy v2 endpoints alongside v1
2. Frontend migrates to v2 incrementally
3. Monitor v1 usage
4. Deprecate v1 when usage drops to zero
5. Remove v1 code in future release
