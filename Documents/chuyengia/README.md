# Maritime AI Tutor Service

<div align="center">

![Maritime AI Tutor Banner](assets/banner_AI_LMS.jpeg)

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-0.1.9-1c3c3c?style=flat-square&logo=chainlink&logoColor=white)](https://langchain.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.0.24-purple?style=flat-square)](https://langchain.com)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.28-008cc1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)

**AI-Powered Maritime Education Platform with Agentic RAG, Semantic Memory & Long-term Personalization**

*Backend AI Service cho hệ thống LMS Hàng hải*

[Architecture](#architecture) • [Quick Start](#quick-start) • [API Reference](#api-reference) • [Deployment](#deployment)

</div>

---

## Overview

Maritime AI Tutor Service là một **Backend AI microservice** được thiết kế để tích hợp với hệ thống LMS (Learning Management System) hàng hải. Hệ thống cung cấp:

- **Intelligent Tutoring**: AI Tutor với role-based prompting (Student/Teacher/Admin)
- **Hybrid Search v0.5**: Kết hợp Dense Search (pgvector) + Sparse Search (Neo4j Full-text) với RRF Reranking
- **GraphRAG Knowledge Retrieval**: Truy vấn kiến thức từ SOLAS, COLREGs, MARPOL
- **Semantic Memory v0.3**: Ghi nhớ ngữ cảnh cross-session với pgvector + Gemini embeddings
- **Content Guardrails**: Bảo vệ nội dung với PII masking và prompt injection detection

---

## Features

### Multi-Agent Architecture (v0.5.3)

| Agent | Function | Trigger Keywords (EN + VN) |
|-------|----------|----------------------------|
| **Chat Agent** | General conversation | No maritime keywords |
| **RAG Agent** | Knowledge Graph queries | `solas`, `colregs`, `marpol`, `rule`, `luật`, `quy định`, `tàu`, `nhường đường`, `cắt hướng`... (70 keywords) |
| **Tutor Agent** | Structured teaching | `teach`, `learn`, `quiz`, `dạy`, `học`, `giải thích`... |

### Role-Based Prompting

```
┌─────────────────────────────────────────────────────────────┐
│  Student Role → AI acts as TUTOR                            │
│  • Tone: Encouraging, supportive, patient                   │
│  • Explains technical terms in detail                       │
│  • Ends with follow-up questions                            │
├─────────────────────────────────────────────────────────────┤
│  Teacher/Admin Role → AI acts as ASSISTANT                  │
│  • Tone: Professional, concise, accurate                    │
│  • Cites exact regulations and codes                        │
│  • No basic term explanations                               │
└─────────────────────────────────────────────────────────────┘
```

### Hybrid Search v0.5.2 (Dense + Sparse + RRF + Title Boosting)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HYBRID SEARCH PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Query: "Rule 15 crossing situation"                                        │
│                     │                                                        │
│         ┌──────────┴──────────┐                                             │
│         ▼                     ▼                                             │
│   ┌───────────────┐    ┌───────────────┐                                    │
│   │ Dense Search  │    │ Sparse Search │                                    │
│   │ (pgvector)    │    │ (Neo4j FTS)   │                                    │
│   │               │    │               │                                    │
│   │ Semantic      │    │ Keyword       │                                    │
│   │ Similarity    │    │ Matching      │                                    │
│   │ (Cosine)      │    │ (BM25-like)   │                                    │
│   └───────┬───────┘    └───────┬───────┘                                    │
│           │                    │                                             │
│           └────────┬───────────┘                                             │
│                    ▼                                                         │
│           ┌───────────────────┐                                             │
│           │   RRF Reranker    │                                             │
│           │   (k=60)          │                                             │
│           │                   │                                             │
│           │ + Title Boosting  │  ← NEW in v0.5.2                            │
│           │ + Sparse Priority │  ← Strong Boost x3.0                        │
│           └─────────┬─────────┘                                             │
│                     ▼                                                        │
│           ┌───────────────────┐                                             │
│           │  Merged Results   │                                             │
│           │  (Top-K by RRF)   │                                             │
│           └───────────────────┘                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Dense Search (pgvector)**: Semantic similarity với Gemini embeddings (768 dims, L2 normalized)
- **Sparse Search (Neo4j Full-text)**: Keyword matching với BM25-like scoring
- **RRF Reranker**: Reciprocal Rank Fusion (k=60) - boost documents xuất hiện ở cả 2 nguồn
- **Title Match Boosting v2**: Strong Boost x3.0 cho số hiệu (Rule 15, 19...) và proper nouns (COLREGs, SOLAS, MARPOL)
- **Sparse Priority Boost**: 1.5x boost cho exact keyword matches (sparse score > 15.0)
- **Top-1 Citation Accuracy**: 100% - Rule đúng luôn ở vị trí #1
- **Graceful Degradation**: Fallback về Sparse-only nếu Dense không khả dụng

### Test Results (04/12/2024)

```
✅ RAG Agent Response:
   Query: "Giải thích quy tắc 15 COLREGs về tình huống cắt hướng"
   Agent: rag
   Sources: 5 (Top-1: COLREGs Rule 15 - Crossing Situation)
   Suggestions: 3 context-aware questions
   
✅ Agent Routing (v0.5.3 HOTFIX):
   - 70 keywords (15 EN + 55 VN) cho intent classification
   - Phrase-level matching: "nhường đường", "cắt hướng", "đăng ký tàu"
   - 9/9 test cases passed (100% accuracy)
```

### Semantic Memory v0.3 (Cross-Session)

- **pgvector + Gemini Embeddings**: Vector similarity search (768 dimensions)
- **User Facts Extraction**: Tự động trích xuất thông tin người dùng (tên, sở thích, mục tiêu)
- **Cross-Session Persistence**: Ghi nhớ ngữ cảnh qua nhiều phiên chat
- **Deduplication**: Tự động loại bỏ facts trùng lặp, giữ bản mới nhất

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LMS FRONTEND                                    │
│                         (Angular - Port 4200)                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP/REST
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MARITIME AI SERVICE                                  │
│                        (FastAPI - Port 8000)                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          API Layer (v1)                                │  │
│  │  POST /chat  │  GET /health  │  Rate Limit (30/min)  │  Auth (API Key) │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Service Layer                                   │  │
│  │  ChatService: Guardrails → Intent → Agent Routing → Response          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Engine Layer (LangGraph)                       │  │
│  │  Orchestrator │ Chat Agent │ RAG Agent │ Tutor Agent │ Semantic Memory │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Repository Layer                                  │  │
│  │  ChatHistory │ SemanticMemory │ DenseSearch │ SparseSearch │ Neo4j     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Hybrid Search Service                             │  │
│  │  Dense (pgvector) + Sparse (Neo4j FTS) → RRF Reranker → Merged Results │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │     Neo4j       │     │  Google Gemini  │
│   (Supabase)    │     │  Knowledge      │     │  2.5 Flash      │
│   + pgvector    │     │  Graph + FTS    │     │  + Embeddings   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Project Structure

```
maritime-ai-service/
├── app/
│   ├── api/v1/                      # API endpoints (chat, health, knowledge)
│   ├── core/                        # Config, security, rate_limit
│   ├── engine/
│   │   ├── agents/chat_agent.py     # Chat Agent
│   │   ├── tools/rag_tool.py        # RAG Agent with Neo4j
│   │   ├── tools/tutor_agent.py     # Tutor Agent
│   │   ├── graph.py                 # LangGraph Orchestrator
│   │   ├── guardrails.py            # Input/Output validation
│   │   ├── semantic_memory.py       # Semantic Memory v0.3
│   │   ├── gemini_embedding.py      # Gemini Embeddings (768 dims, L2 norm)
│   │   ├── rrf_reranker.py          # RRF Reranker (k=60)
│   │   └── pdf_processor.py         # PDF extraction for ingestion
│   ├── models/                      # Pydantic & SQLAlchemy models
│   ├── repositories/
│   │   ├── dense_search_repository.py   # pgvector similarity search
│   │   ├── sparse_search_repository.py  # Neo4j full-text search
│   │   ├── neo4j_knowledge_repository.py
│   │   ├── semantic_memory_repository.py
│   │   └── chat_history_repository.py
│   └── services/
│       ├── chat_service.py          # Main integration service
│       ├── hybrid_search_service.py # Dense + Sparse + RRF
│       └── ingestion_service.py     # PDF ingestion pipeline
├── alembic/                         # Database migrations
├── assets/                          # Static assets (images)
├── scripts/
│   ├── import_colregs.py            # Import COLREGs to Neo4j
│   ├── reingest_with_embeddings.py  # Re-ingest with pgvector embeddings
│   ├── verify_all_systems.py        # System health verification
│   ├── test_hybrid_search.py        # Test hybrid search
│   └── create_*.sql                 # Database setup scripts
├── tests/
│   ├── property/                    # Property-based tests (Hypothesis)
│   ├── unit/                        # Unit tests
│   └── integration/                 # Integration tests
├── docs/                            # Documentation
├── docker-compose.yml               # Local development stack
├── requirements.txt                 # Python dependencies
└── render.yaml                      # Render.com deployment
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Neo4j (local or Aura)
- PostgreSQL with pgvector (local or Supabase)
- Google Gemini API Key

### 1. Clone & Setup

```bash
git clone <repository-url>
cd maritime-ai-service

python -m venv .venv
.venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 2. Configure Environment

```bash
copy .env.example .env
```

Edit `.env`:
```env
# LLM Provider
LLM_PROVIDER=google
GOOGLE_API_KEY=your_gemini_api_key
GOOGLE_MODEL=gemini-2.5-flash

# Database (Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_secret

# Semantic Memory
SEMANTIC_MEMORY_ENABLED=true
```

### 3. Start Infrastructure

```bash
docker-compose up -d
```

### 4. Import Knowledge Base

```bash
python scripts/import_colregs.py
```

### 5. Run Server

```bash
uvicorn app.main:app --reload --port 8000
```

### 6. Access API

- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## API Reference

### POST /api/v1/chat

**Request:**
```json
{
  "user_id": "student_12345",
  "message": "Giải thích quy tắc 15 COLREGs",
  "role": "student",
  "session_id": "session_abc123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "answer": "Theo Điều 15 COLREGs...",
    "sources": [{"title": "COLREGs Rule 15", "content": "..."}],
    "suggested_questions": ["Tàu nào phải nhường đường?"]
  },
  "metadata": {
    "agent_type": "rag",
    "processing_time": 1.25
  }
}
```

### Authentication

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "X-API-Key: your_lms_api_key" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user1", "message": "Hello", "role": "student"}'
```

---

## Knowledge Ingestion API (Admin Only)

API cho phép Admin upload tài liệu PDF vào Neo4j Knowledge Graph để hỗ trợ RAG queries.

### POST /api/v1/knowledge/ingest

Upload PDF document để xử lý và lưu vào Knowledge Graph.

**Request (multipart/form-data):**
```bash
curl -X POST http://localhost:8000/api/v1/knowledge/ingest \
  -F "file=@colregs.pdf" \
  -F "category=COLREGs" \
  -F "role=admin"
```

**Response:**
```json
{
  "status": "accepted",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Document 'colregs.pdf' accepted for processing."
}
```

### GET /api/v1/knowledge/jobs/{job_id}

Kiểm tra trạng thái xử lý document.

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "nodes_created": 45,
  "error_message": null,
  "filename": "colregs.pdf",
  "category": "COLREGs"
}
```

### GET /api/v1/knowledge/list

Lấy danh sách documents đã upload.

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_123",
      "filename": "colregs.pdf",
      "category": "COLREGs",
      "nodes_count": 45,
      "uploaded_by": "admin"
    }
  ],
  "page": 1,
  "limit": 20
}
```

### GET /api/v1/knowledge/stats

Lấy thống kê Knowledge Base.

**Response:**
```json
{
  "total_documents": 5,
  "total_nodes": 230,
  "categories": {
    "COLREGs": 120,
    "SOLAS": 80,
    "MARPOL": 30
  },
  "recent_uploads": [...]
}
```

### DELETE /api/v1/knowledge/{document_id}

Xóa document và tất cả Knowledge nodes liên quan (Admin only).

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/v1/knowledge/doc_123 \
  -F "role=admin"
```

**Response:**
```json
{
  "status": "deleted",
  "document_id": "doc_123",
  "nodes_deleted": 45
}
```

---

## Chat History Management API

API cho phép quản lý lịch sử chat của người dùng.

### DELETE /api/v1/history/{user_id}

Xóa toàn bộ lịch sử chat của một user.

**Access Control:**
- `admin`: Có thể xóa lịch sử của bất kỳ user nào
- `student`/`teacher`: Chỉ có thể xóa lịch sử của chính mình

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/v1/history/student_123 \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin", "requesting_user_id": "admin_user"}'
```

**Response (Success):**
```json
{
  "status": "deleted",
  "user_id": "student_123",
  "messages_deleted": 15,
  "deleted_by": "admin_user"
}
```

**Response (Permission Denied - 403):**
```json
{
  "error": "permission_denied",
  "message": "Permission denied. Users can only delete their own chat history."
}
```

---

### Constraints

- **File Type**: Chỉ chấp nhận PDF (.pdf)
- **Max Size**: 50MB
- **Role**: Chỉ Admin mới có quyền ingest/delete
- **Duplicate Detection**: Tự động phát hiện file trùng lặp qua content hash

---

## Hybrid Search Details

### How It Works

1. **Query Processing**: User query được xử lý song song bởi 2 search engines
2. **Dense Search (Semantic)**: 
   - Gemini embedding (768 dims, L2 normalized)
   - pgvector cosine similarity search
   - Trả về top-K results với similarity scores (0-1)
3. **Sparse Search (Keyword)**:
   - Neo4j Full-text index với BM25-like scoring
   - Exact keyword matching
   - Trả về top-K results với relevance scores
4. **RRF Reranking**:
   - Reciprocal Rank Fusion với k=60
   - Formula: `RRF(d) = Σ 1/(k + rank(d))`
   - Documents xuất hiện ở cả 2 nguồn được boost
5. **Result Merging**: Top results được merge và trả về

### Example Output

```
Query: 'restricted visibility navigation'
Results: 3, Method: hybrid

1. COLREGs Rule 19 - Conduct in Restricted Visibility
   RRF: 0.0164, Dense: 0.75, Sparse: 14.63  ← Appears in BOTH (boosted)

2. COLREGs Rule 6 - Safe Speed
   RRF: 0.0161, Dense: 0.66, Sparse: 4.43   ← Appears in BOTH (boosted)

3. [Semantic Match Only]
   RRF: 0.0079, Dense: 0.65, Sparse: None   ← Dense only (no boost)
```

### Graceful Degradation

- Nếu Dense Search không khả dụng → Fallback về Sparse-only
- Nếu Sparse Search không khả dụng → Fallback về Dense-only
- Nếu cả 2 không khả dụng → Return empty results với error message

---

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run property-based tests
pytest tests/property/ -v
```

---

## Deployment

### Render.com (Production)

```bash
# Deploy via render.yaml
# Environment variables set in Render Dashboard
```

### Docker

```bash
docker build -t maritime-ai-service:latest .
docker run -d -p 8000:8000 maritime-ai-service:latest
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | FastAPI 0.109 |
| **AI/LLM** | LangChain + LangGraph |
| **LLM Provider** | Google Gemini 2.5 Flash |
| **Embeddings** | Gemini text-embedding-004 (768 dims) |
| **Graph Database** | Neo4j 5.28 + Full-text Search |
| **Vector Database** | PostgreSQL + pgvector (Supabase) |
| **Search** | Hybrid Search (Dense + Sparse + RRF) |
| **Memory** | Semantic Memory v0.3 |
| **Testing** | Pytest + Hypothesis |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.6.1 | 2025-12-04 | Chat History Management API - DELETE /api/v1/history/{user_id} with role-based access control |
| v0.6.0 | 2025-12-04 | Tech Debt Cleanup - pypdf migration (from PyPDF2), Knowledge API error handling, Pydantic v2 compliance, circular import fix |
| v0.5.3 | 2025-12-04 | Intent Classifier HOTFIX - 70 Vietnamese keywords, Aggressive Routing, 100% classification accuracy |
| v0.5.2 | 2025-12-04 | Title Match Boosting v2 - Strong Boost x3.0 cho số hiệu, Top-1 Citation Accuracy 100% |
| v0.5.1 | 2025-12-04 | Project cleanup, removed redundant test scripts, security fix (.env.production.example) |
| v0.5.0 | 2025-12-04 | Hybrid Search v0.5 - Dense (pgvector) + Sparse (Neo4j FTS) + RRF Reranking (k=60) |
| v0.4.0 | 2025-12-03 | Knowledge Ingestion API - Admin PDF upload to Neo4j |
| v0.3.0 | 2025-12-02 | Semantic Memory v0.3, Cross-session persistence with pgvector |
| v0.2.1 | 2025-12-01 | Memory Lite, Chat History, Learning Profile |
| v0.2.0 | 2025-11-30 | Role-based prompting, Multi-agent architecture |
| v0.1.0 | 2025-11-28 | Initial release with RAG |

---

## Known Issues & Future Work

### ✅ Resolved (v0.5.3)
- **Agent Routing**: Vietnamese questions now correctly route to RAG Agent
- **Citation Accuracy**: Top-1 accuracy improved from 20% to 100%

### ✅ Resolved (v0.6.0)
- **PDF Library Migration**: Migrated from deprecated PyPDF2 to pypdf for better Vietnamese support
- **Knowledge API Endpoints**: `/stats` and `/list` now return empty results instead of 500 errors
- **Pydantic v2 Compliance**: Config uses `model_config = SettingsConfigDict()` pattern
- **Circular Import Fix**: Fixed circular import between rag_tool.py and chat_service.py

### 🔄 In Progress
- **Vietnamese Text Chunking**: Sentence boundary detection for Vietnamese PDFs

### 📋 Planned
- Cross-session memory testing
- Learning profile analytics
- Multi-language support (EN/VN)

---

## License

Proprietary software for Maritime LMS integration.

---

<div align="center">

**Built for Maritime Education**

[![Made with FastAPI](https://img.shields.io/badge/Made%20with-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Powered by LangChain](https://img.shields.io/badge/Powered%20by-LangChain-1c3c3c?style=flat-square)](https://langchain.com)

</div>
