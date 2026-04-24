# AI Lesson Generation — Final Design Spec v2.0

> **Date**: 2026-03-22 | **Status**: Final — incorporates all expert review rounds
> **Author**: The Wiii Lab / HoLiLiHu + Expert consultation
> **Systems**: LMS Backend (Spring Boot 3.2.6) · Wiii AI (FastAPI/LangGraph) · LMS Frontend (Angular 20)

---

## 1. Problem Statement

Teachers spend days converting existing materials (PDF textbooks, Word lecture notes, PowerPoint slides) into structured LMS courses. The goal: teacher uploads any document → AI parses, structures, and creates a complete Course with iterative teacher review at each stage.

### Design Principles

- **Clean Architecture**: All external dependencies (LLM providers, document parsers, storage) behind interfaces. No hardcoded models, URLs, or API keys in business logic.
- **Iterative over 1-shot**: Teacher reviews outline before content generation. Inspired by Canvas IgniteAI (30K+ educators).
- **Workflow over Agent**: Per Anthropic's "Building Effective Agents" — use deterministic workflows for well-defined tasks, reserve agents for open-ended problems.
- **Narrow Gateways**: Small, focused integration points. No monolithic tool servers.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  LMS Frontend (Angular 20)                                          │
│                                                                     │
│  Course Editor → "Tạo bài giảng bằng AI" button                    │
│       → Opens Wiii AI sidebar (existing iframe embed)               │
│       → Teacher uploads document + provides prompt                  │
│       → Interactive CourseOutlineEditor component in chat            │
│       → Receives progress updates via PostMessage                   │
│       → Course Editor auto-refreshes as chapters appear             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ PostMessage (existing bridge)
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Wiii AI (FastAPI + LangGraph)                                      │
│                                                                     │
│  Document Conversion:                                               │
│    DoclingConverter (abstracted behind DocumentParserPort)           │
│    → Any format → Markdown + structured metadata                    │
│    → Digital pages: local AI models (0 API cost)                    │
│    → Scanned pages: VLM provider (configurable)                     │
│                                                                     │
│  3-Node LangGraph Workflow:                                         │
│    Node 1: OUTLINE    — 1 LLM call, teacher review checkpoint       │
│    Node 2: EXPAND     — parallel per-chapter content generation     │
│    Node 3: PUSH       — deterministic, push to LMS API             │
│                                                                     │
│  Abstraction layers:                                                │
│    LlmPort          — swap Gemini/Claude/GPT without code changes   │
│    DocumentParserPort — swap Docling/pymupdf/custom                 │
│    LmsPushPort       — swap REST/MCP/mock                           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ REST API (HMAC-SHA256 signed)
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LMS Backend (Spring Boot 3.2.6)                                    │
│                                                                     │
│  POST /api/v3/integration/courses/generate       — create shell     │
│  POST /api/v3/integration/courses/{id}/chapters  — push 1 chapter   │
│                                                                     │
│  GenerateCourseFromAiUseCase                                        │
│    → Transaction boundary: per-chapter                              │
│    → Domain model compliance (Section.create via domain methods)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why NOT other approaches

| Rejected | Reason |
|----------|--------|
| 5-subagent Deep Agents pipeline | Overkill per Anthropic: "use workflows for well-defined tasks" |
| Full autonomous 1-shot generation | Canvas IgniteAI proves iterative is better UX + lower cost + lower risk |
| WebMCP for this feature | PostMessage is universal (all browsers); WebMCP is Chrome Canary-only |
| Keep pymupdf + Gemini Vision for all pages | Docling handles digital pages locally (0 cost); Vision API only for scanned |
| Hardcoded Gemini throughout | Clean ports allow model swapping without touching business logic |

---

## 3. Clean Architecture — Port/Adapter Pattern

### 3.1 Port Interfaces (Wiii AI)

```python
# ports/document_parser.py
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class ParsedDocument:
    markdown: str                    # Full structured markdown
    page_count: int
    metadata: dict                   # title, authors, language detected
    section_map: dict[str, list[int]] # heading → page numbers mapping
    images: list[dict]               # extracted images with metadata

class DocumentParserPort(ABC):
    """Parse any document format into structured markdown."""

    @abstractmethod
    async def parse(self, file_path: str, options: dict | None = None) -> ParsedDocument:
        ...

    @abstractmethod
    def supported_formats(self) -> list[str]:
        ...
```

```python
# ports/llm.py
from abc import ABC, abstractmethod
from typing import Any

@dataclass
class LlmConfig:
    model: str                       # e.g. "gemini-3.1-pro"
    temperature: float = 0.3
    max_tokens: int = 8192
    thinking_level: str | None = None  # "high", "medium", "low", None
    response_format: str = "json"    # "json" | "text"

class LlmPort(ABC):
    """Generate text/structured output from LLM."""

    @abstractmethod
    async def invoke_structured(
        self, prompt: str, output_schema: dict, config: LlmConfig
    ) -> dict:
        ...

    @abstractmethod
    async def invoke_text(self, prompt: str, config: LlmConfig) -> str:
        ...
```

```python
# ports/lms_push.py
from abc import ABC, abstractmethod

class LmsPushPort(ABC):
    """Push generated content to LMS Backend."""

    @abstractmethod
    async def create_course_shell(self, request: dict) -> dict:
        """Returns { courseId: str }"""
        ...

    @abstractmethod
    async def push_chapter(self, course_id: str, chapter: dict) -> dict:
        """Returns { chapterId: str, status: str }"""
        ...
```

### 3.2 Configuration (environment-driven, no hardcode)

```yaml
# config/course_generation.yaml (loaded via pydantic-settings)
document_parser:
  adapter: "docling"                  # "docling" | "pymupdf_vision" | "mock"
  docling:
    vlm_backend: "gemini"             # "gemini" | "ollama" | "granite_local" | "none"
    vlm_api_url: "${DOCLING_VLM_API_URL}"
    vlm_api_key: "${DOCLING_VLM_API_KEY}"
    vlm_model: "${DOCLING_VLM_MODEL:gemini-3.1-flash-lite}"
    vlm_concurrency: 3
    standard_pipeline: true           # DocLayNet + TableFormer for digital pages

llm:
  outline:
    adapter: "gemini"                 # "gemini" | "openai" | "anthropic" | "mock"
    model: "${LLM_OUTLINE_MODEL:gemini-3.1-pro}"
    thinking_level: "high"
    temperature: 0.3
  expand:
    adapter: "gemini"
    model: "${LLM_EXPAND_MODEL:gemini-3.1-flash}"
    thinking_level: null
    temperature: 0.3

lms_push:
  adapter: "rest"                     # "rest" | "mcp" | "mock"
  base_url: "${LMS_API_BASE_URL}"
  service_token: "${LMS_SERVICE_TOKEN}"
  hmac_secret: "${LMS_HMAC_SECRET}"

generation:
  max_concurrent_chapters: 3          # Parallel expand limit (rate limit safety)
  max_retries: 2                      # Per-chapter retry attempts
  chapter_timeout_seconds: 120
```

### 3.3 Adapter Implementations

```python
# adapters/docling_parser.py
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.pipeline.vlm_pipeline import VlmPipeline
from docling.datamodel.pipeline_options import VlmPipelineOptions, VlmConvertOptions
from docling.datamodel.vlm_engine_options import ApiVlmEngineOptions, VlmEngineType

class DoclingParserAdapter(DocumentParserPort):

    def __init__(self, config: DoclingConfig):
        self._config = config
        self._converter = self._build_converter()

    def _build_converter(self) -> DocumentConverter:
        format_options = {}

        if self._config.vlm_backend != "none":
            # Scanned pages → VLM provider (Gemini, Ollama, etc.)
            vlm_engine = ApiVlmEngineOptions(
                runtime_type=VlmEngineType.API,
                url=self._config.vlm_api_url,
                headers={"Authorization": f"Bearer {self._config.vlm_api_key}"},
                params={
                    "model": self._config.vlm_model,
                    "max_completion_tokens": 4096,
                },
                timeout=120,
                concurrency=self._config.vlm_concurrency,
            )
            vlm_options = VlmConvertOptions(engine_options=vlm_engine)
            format_options[InputFormat.PDF] = PdfFormatOption(
                pipeline_cls=VlmPipeline,
                pipeline_options=VlmPipelineOptions(vlm_options=vlm_options),
            )

        return DocumentConverter(format_options=format_options)

    async def parse(self, file_path: str, options: dict | None = None) -> ParsedDocument:
        result = self._converter.convert(file_path)
        doc = result.document

        markdown = doc.export_to_markdown()
        section_map = self._extract_section_map(doc)
        images = self._extract_images(doc)

        return ParsedDocument(
            markdown=markdown,
            page_count=len(doc.pages) if hasattr(doc, 'pages') else 0,
            metadata={"title": doc.name if hasattr(doc, 'name') else ""},
            section_map=section_map,
            images=images,
        )

    def _extract_section_map(self, doc) -> dict[str, list[int]]:
        """Map maritime-specific headings (Điều, Khoản, Chương) to page numbers."""
        import re
        section_map = {}
        for item in doc.iterate_items():
            if hasattr(item, 'label') and item.label in ('section_header', 'title'):
                text = item.text if hasattr(item, 'text') else str(item)
                # Vietnamese maritime document patterns
                for pattern in [r'Chương\s+(\S+)', r'Điều\s+(\d+)', r'Khoản\s+(\d+)',
                                r'Chapter\s+(\S+)', r'Section\s+(\d+)']:
                    match = re.search(pattern, text)
                    if match:
                        key = match.group(0)
                        page = item.prov[0].page_no if hasattr(item, 'prov') and item.prov else 0
                        section_map.setdefault(key, []).append(page)
        return section_map

    def supported_formats(self) -> list[str]:
        return ["pdf", "docx", "pptx", "xlsx", "html", "png", "jpg", "tiff", "md", "latex"]
```

---

## 4. Document Conversion Pipeline

### 4.1 Docling Integration (replaces MultimodalIngestionService)

```
Any file upload (PDF/DOCX/PPTX/HTML/images/LaTeX)
       │
       ▼
  DoclingParserAdapter (implements DocumentParserPort)
       │
       ├── Digital pages → Standard pipeline (DocLayNet + TableFormer)
       │                    Local AI models, 0 API cost, fast
       │
       └── Scanned pages → Docling auto-detects (no text layer)
                            → VLM pipeline → configured provider
                            → Default: Gemini Flash-Lite ($0.25/1M tokens)
                            → Swappable: Ollama local, Granite, Claude, etc.
       │
       ▼
  ParsedDocument { markdown, section_map, images, metadata }
       │
       ├──→ markdown        → Course Generation Workflow
       │
       ├──→ HybridChunker   → Embed → pgvector → RAG search
       │    (Docling built-in, replaces custom SemanticChunker)
       │
       └──→ images          → MinIO storage → "Show original page" in chat
```

### 4.2 Migration Strategy (gradual, not big-bang)

| Week | Action | Rollback |
|------|--------|----------|
| 1 | Add DoclingParserAdapter alongside existing pipeline. Feature flag `USE_DOCLING=false`. Test on 20 maritime documents. | Flag off → old pipeline |
| 2 | If quality ≥ existing: flip `USE_DOCLING=true` for new uploads. Old documents untouched. | Flag off |
| 3 | Deprecate MultimodalIngestionService. Remove Gemini Vision dependency from ingestion. Keep Vision for chat image features only. | Keep old code in repo 1 more sprint |

### 4.3 Docling Deployment

```yaml
# docker-compose.yml addition
docling-serve:
  image: doclingproject/docling-serve:latest
  environment:
    DOCLING_SERVE_VLM_ENABLE_REMOTE_SERVICES: "true"
    DOCLING_SERVE_VLM_API_URL: "${DOCLING_VLM_API_URL}"
    DOCLING_SERVE_VLM_API_HEADERS_JSON: '{"Authorization":"Bearer ${DOCLING_VLM_API_KEY}"}'
  deploy:
    resources:
      limits:
        memory: 4G    # DocLayNet + TableFormer models
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
    interval: 30s
```

Isolated microservice: doesn't consume Wiii AI FastAPI memory. Scale independently.

---

## 5. LangGraph Workflow (3 Nodes)

### State Schema

```python
from typing import TypedDict, Optional
from enum import Enum

class ChapterStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class CourseGenState(TypedDict):
    # Input
    document_id: str
    teacher_prompt: str
    language: str                          # "vi" | "en"
    target_chapters: int | None

    # After CONVERT (new — Docling)
    markdown: str                          # Full structured markdown from Docling
    section_map: dict                      # heading → page mapping
    metadata: dict

    # After OUTLINE
    outline: dict | None                   # CourseOutline JSON
    phase: str                             # current phase for PostMessage

    # After teacher approval
    approved_chapters: list[int]           # indices teacher approved
    chapter_dependencies: dict[int, list[int]]  # {4: [2]} = ch4 depends on ch2

    # EXPAND tracking
    course_id: str | None
    completed_chapters: list[dict]         # [{index, chapterId, status}]
    failed_chapters: list[dict]            # [{index, error, content_cache}]
```

### Node 0: CONVERT (Deterministic)

```python
async def convert_node(state: CourseGenState, *, parser: DocumentParserPort) -> CourseGenState:
    """
    Convert uploaded document to structured Markdown via DocumentParserPort.
    Docling handles format detection, digital/scanned routing, OCR automatically.
    """
    parsed = await parser.parse(
        file_path=get_upload_path(state["document_id"]),
        options={"language": state["language"]}
    )

    return {
        **state,
        "markdown": parsed.markdown,
        "section_map": parsed.section_map,
        "metadata": parsed.metadata,
    }
```

### Node 1: OUTLINE (LLM — Teacher Review Checkpoint)

```python
async def outline_node(state: CourseGenState, *, llm: LlmPort, config: LlmConfig) -> CourseGenState:
    """
    Generate course outline from structured Markdown.
    Single LLM call with structured output.
    Config-driven: model, temperature, thinking_level all from config.
    """
    markdown = state["markdown"]
    language = state["language"]
    target = state.get("target_chapters")

    prompt = build_outline_prompt(
        markdown=markdown,
        language=language,
        target_chapters=target,
        teacher_prompt=state.get("teacher_prompt", ""),
    )

    outline = await llm.invoke_structured(
        prompt=prompt,
        output_schema=COURSE_OUTLINE_SCHEMA,
        config=config,
    )

    # Validate outline
    validate_outline(outline)

    return {
        **state,
        "outline": outline,
        "phase": "OUTLINE_READY",
    }
```

```python
# prompts/outline.py — Separated from business logic
def build_outline_prompt(markdown: str, language: str, target_chapters: int | None,
                         teacher_prompt: str) -> str:
    lang_instruction = "Nội dung tiếng Việt" if language == "vi" else "Content in English"
    chapter_hint = f"Tạo khoảng {target_chapters} chương." if target_chapters else ""

    return f"""Bạn là chuyên gia thiết kế khóa học hàng hải.

Từ tài liệu dưới đây, tạo course outline theo JSON schema.

Quy tắc:
- Mỗi chapter tương ứng với 1 phần lớn của tài liệu
- Mỗi lesson là 1 bài học 20-45 phút
- Đánh dấu vị trí nên có quiz bằng QUIZ_PLACEHOLDER (không tạo quiz)
- Giữ nguyên thuật ngữ chuyên ngành hàng hải
- {lang_instruction}
- Thêm sourcePages mapping cho mỗi chapter (để truy xuất nội dung gốc)
{chapter_hint}

YÊU CẦU CỦA GIÁO VIÊN:
{teacher_prompt}

TÀI LIỆU:
{markdown}

OUTPUT: CourseOutline JSON theo schema."""
```

**Checkpoint**: After this node, Wiii sends outline to teacher via chat as interactive `<CourseOutlineEditor>` component. Teacher can approve/edit/remove chapters before proceeding.

### Node 2: EXPAND (LLM — Parallel Per-Chapter)

```python
import asyncio
from langgraph.types import Send

async def expand_router(state: CourseGenState) -> list[Send]:
    """
    Fan-out: dispatch parallel EXPAND for each approved chapter.
    Respects dependencies: if chapter 4 depends on chapter 2,
    chapter 4 waits until chapter 2 completes.
    """
    approved = state["approved_chapters"]
    deps = state.get("chapter_dependencies", {})

    # Group into waves: wave 1 = no dependencies, wave 2 = depends on wave 1, etc.
    waves = compute_execution_waves(approved, deps)

    sends = []
    for wave in waves:
        for chapter_idx in wave:
            chapter = state["outline"]["chapters"][chapter_idx]
            sends.append(Send("expand_single_chapter", {
                **state,
                "current_chapter": chapter,
                "current_chapter_idx": chapter_idx,
            }))

    return sends


async def expand_single_chapter(
    state: CourseGenState, *, llm: LlmPort, config: LlmConfig, push: LmsPushPort
) -> CourseGenState:
    """
    Generate full content for ONE chapter.
    Uses relevant markdown sections (not full document) for focused generation.
    """
    chapter = state["current_chapter"]
    chapter_idx = state["current_chapter_idx"]
    markdown = state["markdown"]

    # Extract only relevant sections for this chapter
    relevant_content = extract_chapter_content(
        markdown=markdown,
        source_pages=chapter.get("sourcePages", []),
        section_map=state["section_map"],
    )

    prompt = build_expand_prompt(
        chapter=chapter,
        source_content=relevant_content,
        language=state["language"],
    )

    # Retry logic
    max_retries = 2
    last_error = None
    chapter_content = None

    for attempt in range(max_retries + 1):
        try:
            chapter_content = await llm.invoke_structured(
                prompt=prompt,
                output_schema=CHAPTER_CONTENT_SCHEMA,
                config=config,
            )
            validate_chapter_content(chapter_content)
            break
        except (ValidationError, LlmError) as e:
            last_error = e
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    if chapter_content is None:
        return {
            **state,
            "failed_chapters": state.get("failed_chapters", []) + [{
                "index": chapter_idx,
                "error": str(last_error),
                "content_cache": None,
            }],
        }

    # Cache content BEFORE push (so retry-push doesn't re-generate)
    cached_content = chapter_content

    # Push to LMS
    try:
        response = await push.push_chapter(
            course_id=state["course_id"],
            chapter=chapter_content,
        )
        return {
            **state,
            "completed_chapters": state.get("completed_chapters", []) + [{
                "index": chapter_idx,
                "chapterId": response["chapterId"],
                "status": "COMPLETED",
            }],
        }
    except PushError as e:
        return {
            **state,
            "failed_chapters": state.get("failed_chapters", []) + [{
                "index": chapter_idx,
                "error": str(e),
                "content_cache": cached_content,  # Keep for retry-push
            }],
        }


def compute_execution_waves(approved: list[int], deps: dict[int, list[int]]) -> list[list[int]]:
    """
    Topological sort into parallel waves.
    Wave 1: chapters with no dependencies (run parallel)
    Wave 2: chapters depending on wave 1 (run parallel after wave 1 done)
    Default: all chapters in wave 1 (fully parallel) when no dependencies declared.
    """
    if not deps:
        return [approved]

    waves = []
    completed = set()
    remaining = set(approved)

    while remaining:
        wave = [ch for ch in remaining
                if all(d in completed for d in deps.get(ch, []))]
        if not wave:
            # Circular dependency fallback: run remaining sequentially
            wave = [min(remaining)]
        waves.append(wave)
        completed.update(wave)
        remaining -= set(wave)

    return waves
```

### Workflow Assembly

```python
# workflows/course_generation.py
from langgraph.graph import StateGraph, END

def build_course_generation_workflow(
    parser: DocumentParserPort,
    llm: LlmPort,
    push: LmsPushPort,
    config: CourseGenConfig,
) -> StateGraph:
    """
    Assemble the 3-node workflow with dependency injection.
    No hardcoded providers — all via ports.
    """
    workflow = StateGraph(CourseGenState)

    # Bind dependencies via closures (clean DI without framework)
    workflow.add_node("convert", lambda s: convert_node(s, parser=parser))
    workflow.add_node("outline", lambda s: outline_node(
        s, llm=llm, config=config.outline_llm))
    workflow.add_node("expand_single_chapter", lambda s: expand_single_chapter(
        s, llm=llm, config=config.expand_llm, push=push))

    workflow.set_entry_point("convert")
    workflow.add_edge("convert", "outline")
    # After outline: PAUSE for teacher review (external checkpoint)
    # After teacher approval: fan-out to expand
    workflow.add_conditional_edges("outline", expand_router)
    workflow.add_edge("expand_single_chapter", END)

    return workflow.compile()
```

---

## 6. Data Schemas

### 6.1 CourseOutline (Node 1 output — teacher reviews this)

```json
{
  "title": "An toàn hàng hải cơ bản",
  "description": "Khóa học tổng quan về an toàn trên tàu biển",
  "estimatedDuration": "12 giờ",
  "chapters": [
    {
      "title": "Chương 1: Giới thiệu an toàn hàng hải",
      "description": "Tổng quan về quy định và nguyên tắc an toàn",
      "status": "DRAFT",
      "orderIndex": 0,
      "estimatedLessons": 3,
      "keyTopics": ["Quy tắc SOLAS", "ISM Code", "Phân loại tàu"],
      "sourcePages": [1, 2, 3, 4, 5],
      "dependsOn": [],
      "lessons": [
        {
          "title": "Bài 1: Quy tắc SOLAS",
          "type": "LECTURE",
          "estimatedMinutes": 30,
          "sourcePages": [1, 2]
        }
      ]
    }
  ]
}
```

### 6.2 CourseGenerationRequest (Wiii → LMS API — per chapter)

```json
{
  "teacherId": "uuid",
  "title": "Chương 1: Giới thiệu an toàn hàng hải",
  "description": "Tổng quan về quy định và nguyên tắc an toàn",
  "orderIndex": 0,
  "lessons": [
    {
      "title": "Bài 1: Khái niệm cơ bản",
      "description": "Các khái niệm nền tảng",
      "type": "LECTURE",
      "orderIndex": 0,
      "durationMinutes": 30,
      "isFree": true,
      "sections": [
        {
          "title": "Giới thiệu",
          "type": "TEXT",
          "content": "<p>An toàn hàng hải là...</p>",
          "orderIndex": 0
        },
        {
          "title": "Kiểm tra kiến thức",
          "type": "QUIZ_PLACEHOLDER",
          "content": null,
          "orderIndex": 1
        }
      ]
    }
  ]
}
```

### 6.3 Schema Rules

| Field | Values | Notes |
|-------|--------|-------|
| `chapters[].status` | `DRAFT` / `APPROVED` / `GENERATING` / `COMPLETED` / `FAILED` | Tracks iterative progress |
| `chapters[].dependsOn` | `[chapterIndex]` or `[]` | Cross-reference dependencies; empty = parallel-safe |
| `sections[].type` | `TEXT` / `FILE` / `QUIZ_PLACEHOLDER` / `VIDEO` / `EMBED` | `QUIZ_PLACEHOLDER` = teacher creates quiz separately |
| `lessons[].type` | `LECTURE` / `VIDEO` / `READING` / `QUIZ` / `ASSIGNMENT` / `DISCUSSION` | Maps to `LessonType` enum |

---

## 7. User Flow

```
Step 1: Teacher opens Course Editor → clicks "Tạo bài giảng bằng AI"
        → Wiii sidebar opens (existing iframe embed)
        → WiiiContextService sends: { page_type: 'course_editor', action: 'generate_lesson' }

Step 2: Teacher uploads PDF/DOCX/PPTX in Wiii chat
        → Docling converts to Markdown + chunks for RAG (parallel paths)
        → Teacher prompts: "Tạo khóa học 5 chương từ file này"

Step 3: OUTLINE node runs (1 LLM call, ~10-30 seconds)
        → Returns course outline
        → Wiii renders <CourseOutlineEditor> component in chat
        → Interactive: collapsible tree, inline edit, drag-drop reorder

Step 4: Teacher reviews outline in <CourseOutlineEditor>
        → Edit titles, reorder chapters (drag-drop)
        → Remove chapters (click ❌), add chapters (click ➕)
        → Mark dependencies if needed ("Ch4 depends on Ch2")
        → Or chat: "Bỏ chương 3, tách chương 2 thành 2 phần"
        → AI adjusts outline → re-renders component
        → Teacher clicks "Approve" per chapter or "Approve All"

Step 5: On first approval, Wiii calls LMS API:
        POST /api/v3/integration/courses/generate
        → LMS creates empty course → returns courseId
        → PostMessage: wiii:course-progress { phase: 'COURSE_CREATED', courseId }
        → LMS navigates to Course Editor with new courseId

Step 6: EXPAND runs in parallel for approved chapters:
        → Independent chapters: parallel (max 3 concurrent, configurable)
        → Dependent chapters: wait for dependencies
        → Each chapter ~30-60 seconds
        → Per chapter complete:
            → Push to LMS API (per-chapter transaction)
            → PostMessage: wiii:course-progress { phase: 'CHAPTER_GENERATED', chapterIndex }
            → Course Editor auto-refreshes, chapter appears
        → Failed chapters: status badge ❌, "Retry" button available

Step 7: All chapters done:
        → PostMessage: wiii:course-progress { phase: 'COMPLETED' }
        → Teacher reviews in Course Editor → edits → publishes
```

---

## 8. PostMessage Contract

### Existing (unchanged)

| Direction | Type | Purpose |
|-----------|------|---------|
| LMS → Wiii | `wiii:page-context` | Current page context |
| LMS → Wiii | `wiii:auth` | Token refresh |
| LMS → Wiii | `wiii:clear-chat` | Reset conversation |
| Wiii → LMS | `wiii:ready` | Embed loaded |
| Wiii → LMS | `wiii:auth-expired` | Request token refresh |
| Wiii → LMS | `wiii:action-request` | Screenshot capture |

### New Messages

```typescript
// Wiii → LMS: Course generation progress
{
  type: 'wiii:course-progress',
  payload: {
    courseId: string,
    phase: 'COURSE_CREATED' | 'OUTLINE_READY' | 'CHAPTER_GENERATED' | 'COMPLETED',
    chapterIndex?: number,
    totalChapters: number,
    title?: string
  }
}

// LMS → Wiii: page context for course editor (uses existing type, new page_type)
{
  type: 'wiii:page-context',
  payload: {
    page_type: 'course_editor',
    course_id: 'uuid',
    action: 'generate_lesson'
  }
}
```

Backward compatible: new types ignored by old listeners.

---

## 9. LMS Backend

### 9.1 Controller

```java
@RestController
@RequestMapping("/api/v3/integration/courses")
public class WiiiCourseGenerationController {

    private final GenerateCourseFromAiUseCase useCase;

    @PostMapping("/generate")
    public ResponseEntity<CourseShellResponse> createCourseShell(
        @RequestBody CourseShellRequest request
    ) {
        UUID courseId = useCase.createCourseShell(request);
        return ResponseEntity.ok(new CourseShellResponse(courseId));
    }

    @PostMapping("/generate/{courseId}/chapters")
    public ResponseEntity<ChapterGenerationResponse> pushChapter(
        @PathVariable UUID courseId,
        @RequestBody ChapterContentRequest request
    ) {
        return ResponseEntity.ok(useCase.pushChapter(courseId, request));
    }
}
```

### 9.2 UseCase (DDD compliant)

```java
@Service
public class GenerateCourseFromAiUseCase {

    private final CourseAuthoringUseCase courseUseCase;
    private final CreateChapterUseCaseV3 chapterUseCase;
    private final CreateLessonUseCaseV3 lessonUseCase;
    private final LessonRepository lessonRepository;

    @Transactional
    public UUID createCourseShell(CourseShellRequest req) {
        var courseReq = CourseDTOs.CreateCourseRequest.builder()
            .categoryId(req.getCategoryId())
            .title(req.getTitle())
            .description(req.getDescription())
            .deliveryMode(req.getDeliveryMode())
            .priceType(req.getPriceType())
            .build();
        var draft = courseUseCase.createCourse(courseReq, req.getTeacherId());
        return draft.getId();
    }

    /**
     * Per-chapter transaction: if chapter 3 fails, chapters 1-2 safe.
     * Uses domain model methods — NOT direct repository access.
     */
    @Transactional
    public ChapterGenerationResponse pushChapter(UUID courseId, ChapterContentRequest req) {
        // 1. Create chapter via existing UseCase
        UUID chapterId = chapterUseCase.execute(
            new CreateChapterCommand(courseId, req.getTitle(),
                req.getDescription(), req.getOrderIndex(),
                req.getTeacherId(), true)
        );

        int lessonCount = 0;
        int sectionCount = 0;

        // 2. Create lessons via existing UseCase
        for (var lessonReq : req.getLessons()) {
            UUID lessonId = lessonUseCase.execute(
                new CreateLessonCommand(chapterId, lessonReq.getTitle(),
                    lessonReq.getDescription(), lessonReq.getType(),
                    null, lessonReq.getDurationMinutes(),
                    lessonReq.getOrderIndex(), lessonReq.getIsFree())
            );
            lessonCount++;

            // 3. Create sections via DOMAIN MODEL (not direct repo)
            Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));

            for (var sectionReq : lessonReq.getSections()) {
                SectionType type = resolveSectionType(sectionReq.getType());
                Section section = Section.create(
                    lesson, sectionReq.getTitle(), type, sectionReq.getOrderIndex()
                );

                if ("QUIZ_PLACEHOLDER".equals(sectionReq.getType())) {
                    section.updateContent(
                        "<div class='quiz-placeholder'>📝 Vị trí đề xuất cho bài kiểm tra</div>"
                    );
                } else if (sectionReq.getContent() != null) {
                    section.updateContent(sectionReq.getContent());
                }
                // Section is persisted via cascade from Lesson (JPA managed)
                sectionCount++;
            }
        }

        return new ChapterGenerationResponse(
            chapterId, req.getOrderIndex(), lessonCount, sectionCount, "SUCCESS"
        );
    }

    private SectionType resolveSectionType(String type) {
        // QUIZ_PLACEHOLDER stored as TEXT in domain
        if ("QUIZ_PLACEHOLDER".equals(type)) return SectionType.TEXT;
        return SectionType.valueOf(type);
    }
}
```

### 9.3 Security (all existing patterns)

| Mechanism | Status |
|-----------|--------|
| `WiiiServiceAuthFilter` (Bearer service token) | Existing — new endpoints inherit |
| HMAC webhook signing | Existing |
| PostMessage strict origin validation | Existing |
| `/api/v3/integration/**` route protection | Existing |

No new security code needed.

---

## 10. LMS Frontend

### 10.1 Course Editor: AI Generate Button

```typescript
// course-curriculum.component.ts — minimal change
<button
  *ngIf="wiiiHealthy"
  (click)="openWiiiSidebar('generate_lesson')"
  class="btn-ai-generate">
  🤖 Tạo bài giảng bằng AI
</button>
```

### 10.2 WiiiContextService: Progress Listener

```typescript
// wiii-context.service.ts
private listenForCourseProgress(): void {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== this.wiiiOrigin) return;
    if (event.data?.type !== 'wiii:course-progress') return;

    const { courseId, phase, chapterIndex, totalChapters } = event.data.payload;

    switch (phase) {
      case 'COURSE_CREATED':
        this.router.navigate(['/teacher/courses', courseId, 'curriculum']);
        break;
      case 'CHAPTER_GENERATED':
        this.courseProgressSubject.next({ courseId, chapterIndex, totalChapters });
        break;
      case 'COMPLETED':
        this.toastService.success('Khóa học đã tạo xong!');
        this.courseProgressSubject.next({ courseId, phase: 'COMPLETED' });
        break;
    }
  });
}
```

### 10.3 Interactive Outline Editor (Wiii Sidebar — React)

```
<CourseOutlineEditor> component in Wiii chat message stream:

┌──────────────────────────────────────────────┐
│  📚 An toàn hàng hải cơ bản                 │
│  Ước tính: 12 giờ · 5 chương                │
│                                              │
│  ▼ Chương 1: Giới thiệu          [✅][✏️][❌] │
│    ├─ Bài 1: Quy tắc SOLAS (30 phút)        │
│    ├─ Bài 2: ISM Code (25 phút)             │
│    └─ 📝 Quiz placeholder                   │
│                                              │
│  ▶ Chương 2: Cấu trúc tàu        [✅][✏️][❌] │
│  ▶ Chương 3: Thiết bị an toàn    [✅][✏️][❌] │
│  ▶ Chương 4: Phòng chống cháy    [✅][✏️][❌] │
│    └─ ⚠️ Phụ thuộc: Chương 2                │
│  ▶ Chương 5: Ứng phó sự cố      [✅][✏️][❌] │
│                                              │
│  [➕ Thêm chương]    [✅ Approve All]         │
└──────────────────────────────────────────────┘
```

Libraries: `@dnd-kit/sortable` for drag-drop reorder, no other external deps.

---

## 11. Observability

```python
# Every generation session gets a unique ID for tracing
import structlog

logger = structlog.get_logger()

async def expand_single_chapter(state, ...):
    generation_id = state.get("generation_id", str(uuid4()))

    logger.info("chapter_expand_start",
        generation_id=generation_id,
        chapter_index=chapter_idx,
        source_pages=chapter.get("sourcePages"),
    )

    # ... LLM call ...

    logger.info("chapter_expand_complete",
        generation_id=generation_id,
        chapter_index=chapter_idx,
        tokens_used=response_metadata.get("usage", {}),
        duration_ms=elapsed,
        status="success",
    )
```

Track per session: time per node, token count per LLM call, push success/fail per chapter, total cost estimate.

---

## 12. Implementation Plan

### Phase 1: Core Pipeline (MVP)

| # | Task | System | Effort | Files |
|---|------|--------|--------|-------|
| 1 | Port interfaces (`DocumentParserPort`, `LlmPort`, `LmsPushPort`) | Wiii AI | 0.5 day | `ports/*.py` (NEW) |
| 2 | DoclingParserAdapter + config | Wiii AI | 1 day | `adapters/docling_parser.py` (NEW) |
| 3 | 3-node LangGraph workflow with parallel expand | Wiii AI | 2 days | `workflows/course_generation.py` (NEW) |
| 4 | Prompt templates (outline + expand) | Wiii AI | 0.5 day | `prompts/outline.py`, `prompts/expand.py` (NEW) |
| 5 | Extend push_service.py (course shell + chapter push) | Wiii AI | 0.5 day | `integrations/lms/push_service.py` (EXTEND) |
| 6 | `POST /generate` + `/chapters` endpoints | LMS BE | 1 day | `WiiiCourseGenerationController.java` (NEW) |
| 7 | `GenerateCourseFromAiUseCase` (DDD compliant, per-chapter tx) | LMS BE | 1 day | `GenerateCourseFromAiUseCase.java` (NEW) |
| 8 | "AI Generate" button + progress listener | LMS FE | 1 day | 2 files (EDIT) |

**Total Phase 1**: ~7.5 days · 6 new files (Wiii) · 2 new files (LMS BE) · 2 edits (LMS FE)

### Phase 2: UX + Quality

| # | Task | System | Effort |
|---|------|--------|--------|
| 9 | `<CourseOutlineEditor>` component (tree + drag-drop + approve) | Wiii FE | 3-4 days |
| 10 | Retry UI for failed chapters | Wiii FE | 0.5 day |
| 11 | Progress bar in Course Editor | LMS FE | 0.5 day |
| 12 | AI Nutrition Facts labels | Both | 0.5 day |
| 13 | Docling migration (test → switch → deprecate old pipeline) | Wiii AI | 3 days (spread over 3 weeks) |

### Phase 3: MCP + Future

| # | Task | System | Effort |
|---|------|--------|--------|
| 14 | `@McpTool` annotations on LMS endpoints | LMS BE | 0.5 day |
| 15 | Narrow MCP gateway server (course-generation only) | LMS BE | 1 day |
| 16 | Quiz generation tool (separate from course creation) | Wiii AI | 2 days |

---

## 13. Testing Strategy

| Test | What | How |
|------|------|-----|
| Unit: DoclingParserAdapter | Parse sample maritime PDF → verify markdown structure | Pytest + fixture PDFs |
| Unit: outline prompt | Verify prompt builds correctly for VI/EN | Pytest |
| Unit: expand_router | Verify wave computation with/without dependencies | Pytest |
| Unit: GenerateCourseFromAiUseCase | Entity creation chain via domain model | JUnit 5 + Mockito |
| Integration: per-chapter transaction | Rollback on section failure | JUnit 5 + @Transactional |
| Integration: parallel expand | 3 concurrent chapters don't conflict | Pytest + async |
| Integration: HMAC auth | Service token validation | MockMvc |
| E2E: full pipeline | Upload PDF → outline → approve → course | Manual + Playwright |
| Stability: LLM output | Same input × 5 runs → consistent outline structure | Weekly pytest, non-blocking |

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large document (500+ pages) | Slow conversion, LLM context overflow | Docling markdown is ~20% of raw; Gemini 3.1 Pro handles 1M context |
| LLM hallucinated maritime content | Dangerous inaccuracies | Content sourced from document chunks, not freeform; teacher review mandatory |
| Chapter push fails mid-way | Partial course | Per-chapter transactions + cached content for retry-push |
| Parallel expand hits API rate limit | Chapters fail | `max_concurrent_chapters` config (default 3) + exponential backoff |
| Docling model download (3GB first run) | Slow first deploy | Pre-bake in Docker image or use Docling Serve |
| Gemini OpenAI-compat endpoint quirks | Docling VLM fails on scanned pages | Test 10 scanned docs in migration week 1; fallback: GraniteDocling local |
| Provider price/availability change | Pipeline breaks | Port/adapter pattern: swap provider via config, no code change |
| QUIZ_PLACEHOLDER confuses teachers | Empty sections UX | Clear visual indicator + tooltip "Tạo quiz riêng" |

---

## 15. SOTA References

| Source | Pattern Applied |
|--------|----------------|
| Canvas IgniteAI (30K+ educators, MCP-based) | Chat-driven iterative generation, separate quiz tool |
| Anthropic "Building Effective Agents" | Workflow > Agent for well-defined tasks |
| Claude Code subagent patterns | Parallel vs sequential routing based on dependency analysis |
| D2L Lumi AI Course Builder | AI Nutrition Facts transparency labels |
| Docling (IBM, LF AI Foundation, 55K+ stars) | Universal document → Markdown conversion |
| LangChain Deep Agents (March 2026) | Planning + context isolation patterns (adapted, not adopted wholesale) |
| Canvas MCP Servers (open-source) | Narrow task gateways, not monolithic servers |
| MCP 2026 Roadmap (AAIF) | Future-proofing via MCP integration path |

---

## 16. Future Extensions

- **Quiz generation tool**: Separate tool using chapter content (after teacher approves structure)
- **Image extraction**: Docling detects images → embed as section images in course
- **Multi-language**: Generate course in both VI and EN from bilingual documents
- **Version control**: Track document version → course version mapping
- **Course update from updated document**: Teacher uploads v2 → AI diffs → suggests chapter updates
- **Audio/video transcription**: Docling ASR pipeline → course from lecture recordings

---

*Design finalized after 4 expert review rounds on 2026-03-22.*
*Architecture: Port/Adapter pattern · Config-driven · No hardcoded providers.*
*Ready for implementation.*
