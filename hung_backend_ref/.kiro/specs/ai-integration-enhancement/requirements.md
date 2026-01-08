# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu để hoàn thiện tích hợp giữa LMS Backend (Spring Boot) và AI Backend Service (Maritime AI Tutor). Mục tiêu là cập nhật DTOs, entities và services để nhận và lưu trữ đầy đủ metadata analytics từ AI Service, hỗ trợ source highlighting với bounding boxes.

## Glossary

- **LMS Backend**: Hệ thống Spring Boot quản lý học tập, đóng vai trò orchestrator
- **AI Service**: Maritime AI Tutor backend (FastAPI), xử lý RAG và trả về câu trả lời
- **DTO**: Data Transfer Object - đối tượng chuyển dữ liệu giữa các layer
- **Bounding Box**: Tọa độ vùng highlight trên PDF (x0, y0, x1, y1 theo percentage)
- **Metadata**: Thông tin bổ sung về response (processing time, confidence, topics, etc.)
- **Source**: Tài liệu tham khảo từ knowledge base

## Requirements

### Requirement 1: Update AIMetadataResponse DTO

**User Story:** As a developer, I want to receive full analytics metadata from AI Service, so that I can track learning patterns and improve user experience.

#### Acceptance Criteria

1. WHEN AI Service returns response THEN the LMS Backend SHALL deserialize all metadata fields including topics_accessed, confidence_score, document_ids_used, and query_type
2. WHEN metadata contains topics_accessed THEN the LMS Backend SHALL parse it as a list of strings
3. WHEN metadata contains confidence_score THEN the LMS Backend SHALL parse it as a Double value between 0.5 and 1.0
4. WHEN metadata contains query_type THEN the LMS Backend SHALL parse it as one of: factual, conceptual, procedural

### Requirement 2: Update AISourceResponse DTO

**User Story:** As a developer, I want to receive source highlighting data from AI Service, so that frontend can display PDF highlights.

#### Acceptance Criteria

1. WHEN AI Service returns sources THEN the LMS Backend SHALL deserialize image_url, page_number, document_id, and bounding_boxes fields
2. WHEN source contains bounding_boxes THEN the LMS Backend SHALL parse each box with x0, y0, x1, y1 coordinates as Double values
3. WHEN source contains page_number THEN the LMS Backend SHALL parse it as an Integer

### Requirement 3: Update SourceDTO for Frontend

**User Story:** As a frontend developer, I want to receive complete source data including highlighting coordinates, so that I can render PDF highlights.

#### Acceptance Criteria

1. WHEN LMS Backend returns chat response THEN the SourceDTO SHALL include imageUrl, pageNumber, documentId, and boundingBoxes
2. WHEN SourceDTO contains boundingBoxes THEN each box SHALL have x0, y0, x1, y1 as Double values

### Requirement 4: Update ChatMessage Entity

**User Story:** As a system administrator, I want to persist analytics data for each AI response, so that I can analyze learning patterns.

#### Acceptance Criteria

1. WHEN AI response is saved THEN the ChatMessage entity SHALL store topics_accessed as JSON string
2. WHEN AI response is saved THEN the ChatMessage entity SHALL store confidence_score as Double
3. WHEN AI response is saved THEN the ChatMessage entity SHALL store document_ids_used as JSON string
4. WHEN AI response is saved THEN the ChatMessage entity SHALL store query_type as String

### Requirement 5: Database Migration

**User Story:** As a database administrator, I want schema changes applied safely, so that existing data is preserved.

#### Acceptance Criteria

1. WHEN migration runs THEN the system SHALL add new columns without affecting existing data
2. WHEN new columns are added THEN the system SHALL allow NULL values for backward compatibility

### Requirement 6: Update AIChatService

**User Story:** As a developer, I want the service layer to properly map and persist all new fields, so that data flows correctly through the system.

#### Acceptance Criteria

1. WHEN AI response is received THEN the AIChatService SHALL extract and save all metadata fields to ChatMessage
2. WHEN building response for frontend THEN the AIChatService SHALL include complete source data with bounding boxes

### Requirement 7: Configuration Update

**User Story:** As a DevOps engineer, I want API Key configured securely, so that production credentials are protected.

#### Acceptance Criteria

1. WHEN application starts THEN the system SHALL read AI Service API Key from environment variable
2. WHEN API Key is not set THEN the system SHALL log a warning and use default value for development
