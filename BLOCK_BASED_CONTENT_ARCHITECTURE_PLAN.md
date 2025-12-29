# LMS Block-based JSON Content Architecture Plan
## "THE STRUCTURED CONTENT REVOLUTION" - SOTA 2025 Implementation

---

## 🎯 OBJECTIVE
Transform the LMS from plain text/HTML storage to a sophisticated Block-based JSON architecture that supports:
- **Rich Content Types**: Images, mathematical formulas, videos, interactive elements
- **PWA/Offline Ready**: Structured data for better caching and synchronization
- **SOTA 2025 Standards**: Modern content management with advanced rendering capabilities
- **Enhanced UX**: Rich quiz creation with multiple content formats

---

## 📋 CURRENT STATE ANALYSIS

### Existing Database Structure
```sql
-- Current Question Table
questions:
- content TEXT           -- Plain text/HTML
- correct_option VARCHAR -- A, B, C, D

-- Current Question Options Table  
question_options:
- content TEXT           -- Plain text/HTML
- option_key VARCHAR     -- A, B, C, D

-- Current Sections Table
sections:
- content TEXT           -- Plain text/HTML
```

### Current Limitations
1. ❌ No support for images in questions/answers
2. ❌ No mathematical formula rendering
3. ❌ No rich media content
4. ❌ Limited content structure (just plain text)
5. ❌ No metadata for content validation
6. ❌ Poor offline/PWA support

---

## 🏗️ BLOCK-BASED JSON ARCHITECTURE

### Core Block Types
```typescript
interface Block {
  id: string;
  type: BlockType;
  content: any;
  metadata: BlockMetadata;
  position: number;
}

enum BlockType {
  TEXT = 'text',
  IMAGE = 'image', 
  MATH = 'math',
  VIDEO = 'video',
  CODE = 'code',
  LIST = 'list',
  TABLE = 'table',
  LINK = 'link'
}

interface BlockMetadata {
  id?: string;           // For media blocks (image/video UUID)
  alt?: string;          // Alt text for images
  caption?: string;      // Caption text
  source?: string;       // Source attribution
  created_at?: string;   // Timestamp
  version?: string;      // Block schema version
}
```

### Content Block Examples

#### 1. Text Block
```json
{
  "id": "block-1",
  "type": "text",
  "content": {
    "text": "Calculate the derivative of f(x) = x² + 3x + 2"
  },
  "metadata": {
    "version": "1.0"
  },
  "position": 0
}
```

#### 2. Math Block (LaTeX/MathJax)
```json
{
  "id": "block-2", 
  "type": "math",
  "content": {
    "latex": "\\frac{d}{dx}(x^2 + 3x + 2) = 2x + 3",
    "renderer": "mathjax"
  },
  "metadata": {
    "version": "1.0"
  },
  "position": 1
}
```

#### 3. Image Block
```json
{
  "id": "block-3",
  "type": "image", 
  "content": {
    "alt": "Graph of function f(x) = x² + 3x + 2",
    "caption": "Figure 1: Parabolic function graph"
  },
  "metadata": {
    "id": "550e8400-e29b-41d4-a716-446655440000", // FileAttachment UUID
    "source": "Teacher uploaded",
    "version": "1.0"
  },
  "position": 2
}
```

#### 4. Complete Question Structure
```json
{
  "id": "question-uuid",
  "content": [ // Array of blocks
    {
      "id": "q-block-1",
      "type": "text",
      "content": { "text": "Solve the following problem:" },
      "metadata": { "version": "1.0" },
      "position": 0
    },
    {
      "id": "q-block-2", 
      "type": "math",
      "content": { "latex": "f(x) = x^2 + 3x + 2", "renderer": "mathjax" },
      "metadata": { "version": "1.0" },
      "position": 1
    },
    {
      "id": "q-block-3",
      "type": "image",
      "content": { 
        "alt": "Function graph",
        "caption": "Graph of f(x)"
      },
      "metadata": { 
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "version": "1.0" 
      },
      "position": 2
    }
  ],
  "options": [
    {
      "id": "option-a",
      "optionKey": "A",
      "content": [
        {
          "id": "opt-a-block-1",
          "type": "math", 
          "content": { "latex": "2x + 3", "renderer": "mathjax" },
          "metadata": { "version": "1.0" },
          "position": 0
        }
      ]
    },
    {
      "id": "option-b", 
      "optionKey": "B",
      "content": [
        {
          "id": "opt-b-block-1",
          "type": "text",
          "content": { "text": "x + 3" },
          "metadata": { "version": "1.0" },
          "position": 0
        }
      ]
    }
  ],
  "correctOption": "A",
  "metadata": {
    "version": "1.0",
    "created_at": "2025-12-24T15:30:00Z",
    "schema_version": "1.0"
  }
}
```

---

## 🗄️ DATABASE SCHEMA TRANSFORMATION

### Phase 1: Core Table Modifications

#### 1. Questions Table Enhancement
```sql
-- Add JSONB columns for structured content
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS content_version VARCHAR(10) DEFAULT '1.0';

-- Add migration tracking
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS content_migrated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS content_migration_status VARCHAR(20) DEFAULT 'pending';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_questions_structured_content 
ON questions USING GIN (structured_content);
```

#### 2. Question Options Table Enhancement  
```sql
-- Add JSONB column for structured option content
ALTER TABLE question_options
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS content_version VARCHAR(10) DEFAULT '1.0';

-- Add migration tracking
ALTER TABLE question_options
ADD COLUMN IF NOT EXISTS content_migrated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS content_migration_status VARCHAR(20) DEFAULT 'pending';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_question_options_structured_content 
ON question_options USING GIN (structured_content);
```

#### 3. Sections Table Enhancement
```sql
-- Add JSONB column for structured section content
ALTER TABLE sections
ADD COLUMN IF NOT EXISTS structured_content JSONB,
ADD COLUMN IF NOT EXISTS content_version VARCHAR(10) DEFAULT '1.0';

-- Add migration tracking  
ALTER TABLE sections
ADD COLUMN IF NOT EXISTS content_migrated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS content_migration_status VARCHAR(20) DEFAULT 'pending';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sections_structured_content
ON sections USING GIN (structured_content);
```

### Phase 2: Content Metadata Table
```sql
-- New table for content block metadata
CREATE TABLE IF NOT EXISTS content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL,              -- Question/Option/Section ID
    parent_type VARCHAR(20) NOT NULL,     -- 'question', 'option', 'section'
    block_id VARCHAR(100) NOT NULL,       -- Block identifier
    block_type VARCHAR(20) NOT NULL,      -- 'text', 'image', 'math', etc.
    content JSONB NOT NULL,               -- Block content
    metadata JSONB,                       -- Block metadata
    position INTEGER NOT NULL,
    version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_parent_type CHECK (parent_type IN ('question', 'option', 'section')),
    CONSTRAINT chk_block_type CHECK (block_type IN ('text', 'image', 'math', 'video', 'code', 'list', 'table', 'link')),
    
    -- Indexes
    UNIQUE(parent_id, parent_type, block_id),
    INDEX idx_content_blocks_parent (parent_id, parent_type),
    INDEX idx_content_blocks_type (block_type)
);
```

### Phase 3: File Relationship Tracking
```sql
-- Enhanced file attachment tracking for content blocks
ALTER TABLE file_attachments
ADD COLUMN IF NOT EXISTS used_in_content_blocks JSONB,
ADD COLUMN IF NOT EXISTS last_referenced_at TIMESTAMP;

-- Create view for content block file usage
CREATE OR REPLACE VIEW content_block_files AS
SELECT 
    fa.id as file_id,
    fa.filename,
    fa.file_type,
    cb.parent_id,
    cb.parent_type,
    cb.block_id,
    cb.block_type,
    cb.metadata->>'alt' as alt_text,
    cb.created_at as referenced_at
FROM file_attachments fa
JOIN content_blocks cb ON cb.metadata->>'id' = fa.id::text
WHERE cb.block_type = 'image' OR cb.block_type = 'video';
```

---

## 🔄 MIGRATION STRATEGY

### Phase 1: Backward Compatibility Migration
```sql
-- Migration V1006: Add structured content columns
-- Migration V1007: Create content_blocks table  
-- Migration V1008: Create file relationship tracking

-- Function to convert legacy content to blocks
CREATE OR REPLACE FUNCTION convert_legacy_content_to_blocks(
    legacy_content TEXT,
    target_type VARCHAR(20)
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Convert plain text to single text block
    result := jsonb_build_array(
        jsonb_build_object(
            'id', 'legacy-' || target_type || '-' || extract(epoch from now())::text,
            'type', 'text',
            'content', jsonb_build_object('text', legacy_content),
            'metadata', jsonb_build_object('version', '1.0', 'migrated_from', 'legacy'),
            'position', 0
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Data Migration Script
```sql
-- Migrate existing question content
UPDATE questions 
SET structured_content = convert_legacy_content_to_blocks(content, 'question'),
    content_version = '1.0',
    content_migrated_at = NOW(),
    content_migration_status = 'completed'
WHERE content IS NOT NULL;

-- Migrate existing question options content  
UPDATE question_options
SET structured_content = convert_legacy_content_to_blocks(content, 'option'),
    content_version = '1.0', 
    content_migrated_at = NOW(),
    content_migration_status = 'completed'
WHERE content IS NOT NULL;

-- Migrate existing sections content
UPDATE sections
SET structured_content = convert_legacy_content_to_blocks(content, 'section'),
    content_version = '1.0',
    content_migrated_at = NOW(), 
    content_migration_status = 'completed'
WHERE content IS NOT NULL;
```

### Phase 3: Content Blocks Population
```sql
-- Populate content_blocks table from migrated data
INSERT INTO content_blocks (parent_id, parent_type, block_id, block_type, content, metadata, position)
SELECT 
    q.id as parent_id,
    'question' as parent_type,
    (jsonb_array_elements(q.structured_content)->>'id') as block_id,
    (jsonb_array_elements(q.structured_content)->>'type') as block_type,
    jsonb_array_elements(q.structured_content)->'content' as content,
    jsonb_array_elements(q.structured_content)->'metadata' as metadata,
    (jsonb_array_elements(q.structured_content)->>'position')::integer as position
FROM questions q 
WHERE q.structured_content IS NOT NULL;

-- Similar for question_options and sections...
```

---

## 🔧 API ARCHITECTURE CHANGES

### New API Endpoints Structure

#### 1. Enhanced Question Creation (Backward Compatible)
```java
@RestController
@RequestMapping("/api/v2/questions")
public class EnhancedQuestionController {
    
    @PostMapping("/structured") 
    public ResponseEntity<ApiResponse<QuestionDTO>> createStructuredQuestion(
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody CreateStructuredQuestionRequest request
    ) {
        // New endpoint for block-based content
    }
    
    @PostMapping("/legacy")
    public ResponseEntity<ApiResponse<QuestionDTO>> createLegacyQuestion(
        @AuthenticationPrincipal User currentUser, 
        @Valid @RequestBody CreateQuestionRequest request
    ) {
        // Legacy endpoint - converts to blocks internally
    }
}
```

#### 2. Request/Response DTOs
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateStructuredQuestionRequest {
    private List<BlockDTO> content;        // Array of content blocks
    private List<StructuredOptionDTO> options; // Structured options
    private String correctOption;          // A, B, C, D
    private Question.Difficulty difficulty;
    private String tags;
    private UUID courseId;
    private UUID packageId;
    private String version;               // Schema version
}

@Data
@NoArgsConstructor  
@AllArgsConstructor
public class BlockDTO {
    private String id;
    private BlockType type;
    private Object content;              // Flexible content based on type
    private BlockMetadataDTO metadata;
    private Integer position;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StructuredOptionDTO {
    private String optionKey;            // A, B, C, D
    private List<BlockDTO> content;      // Content blocks for option
    private Integer displayOrder;
}
```

#### 3. Content Validation Service
```java
@Service
public class ContentValidationService {
    
    public ValidationResult validateStructuredContent(List<BlockDTO> blocks) {
        // Validate block structure
        // Check content types
        // Validate image references exist
        // Validate math syntax
        // Check for circular references
        return ValidationResult.builder()
            .isValid(true)
            .warnings(warnings)
            .errors(errors)
            .build();
    }
    
    public List<String> validateImageReferences(List<BlockDTO> blocks) {
        // Check if referenced images exist in file_attachments
        // Validate image permissions
        // Check file size and format constraints
    }
}
```

---

## 🎨 FRONTEND ARCHITECTURE (Angular 20)

### Rich Content Editor Components

#### 1. Block Editor Component
```typescript
@Component({
  selector: 'app-block-editor',
  template: `
    <div class="block-editor">
      <div class="toolbar">
        <button (click)="addTextBlock()">📝 Text</button>
        <button (click)="addMathBlock()">🧮 Math</button>
        <button (click)="addImageBlock()">🖼️ Image</button>
        <button (click)="addVideoBlock()">🎥 Video</button>
      </div>
      
      <div class="blocks-container">
        <app-block 
          *ngFor="let block of blocks; trackBy: trackByBlockId"
          [block]="block"
          [index]="block.position"
          (blockChanged)="onBlockChanged($event)"
          (blockDeleted)="onBlockDeleted($event)">
        </app-block>
      </div>
    </div>
  `
})
export class BlockEditorComponent implements OnInit {
  blocks: Block[] = [];
  
  addTextBlock() {
    const newBlock: Block = {
      id: this.generateId(),
      type: 'text',
      content: { text: '' },
      metadata: { version: '1.0' },
      position: this.blocks.length
    };
    this.blocks.push(newBlock);
  }
  
  addMathBlock() {
    const newBlock: Block = {
      id: this.generateId(),
      type: 'math', 
      content: { latex: '', renderer: 'mathjax' },
      metadata: { version: '1.0' },
      position: this.blocks.length
    };
    this.blocks.push(newBlock);
  }
}
```

#### 2. Math Editor Component (MathJax Integration)
```typescript
@Component({
  selector: 'app-math-block',
  template: `
    <div class="math-block">
      <textarea 
        [(ngModel)]="latexCode"
        (input)="onLatexChanged()"
        placeholder="Enter LaTeX code (e.g., \frac{a}{b})"
        class="latex-input">
      </textarea>
      
      <div class="math-preview" [innerHTML]="renderedMath">
      </div>
      
      <div class="math-toolbar">
        <button (click)="insertSymbol('\\frac{a}{b}')">Fraction</button>
        <button (click)="insertSymbol('\\sqrt{a}')">Square Root</button>
        <button (click)="insertSymbol('a^2')">Superscript</button>
        <button (click)="insertSymbol('a_2')">Subscript</button>
      </div>
    </div>
  `
})
export class MathBlockComponent {
  @Input() block: Block;
  @Output() blockChanged = new EventEmitter<Block>();
  
  latexCode = '';
  renderedMath = '';
  
  ngOnInit() {
    this.latexCode = this.block.content.latex || '';
    this.renderLatex();
  }
  
  onLatexChanged() {
    this.block.content.latex = this.latexCode;
    this.renderLatex();
    this.blockChanged.emit(this.block);
  }
  
  renderLatex() {
    // MathJax rendering logic
    if (window['MathJax']) {
      MathJax.typesetPromise([this.renderedMath]).then(() => {
        // Rendering complete
      });
    }
  }
}
```

#### 3. Image Block Component
```typescript
@Component({
  selector: 'app-image-block',
  template: `
    <div class="image-block">
      <div class="image-upload-area" 
           (click)="fileInput.click()"
           [class.has-image]="imageUrl">
        <img *ngIf="imageUrl" [src]="imageUrl" [alt]="altText" class="preview-image">
        <div *ngIf="!imageUrl" class="upload-placeholder">
          📷 Click to upload image
        </div>
      </div>
      
      <div class="image-properties" *ngIf="imageUrl">
        <input type="text" 
               [(ngModel)]="altText"
               placeholder="Alt text for accessibility"
               (input)="onAltTextChanged()">
        
        <input type="text"
               [(ngModel)]="caption"
               placeholder="Caption (optional)"
               (input)="onCaptionChanged()">
        
        <button (click)="removeImage()">Remove Image</button>
      </div>
      
      <input #fileInput 
             type="file" 
             accept="image/*"
             (change)="onFileSelected($event)"
             style="display: none;">
    </div>
  `
})
export class ImageBlockComponent {
  @Input() block: Block;
  @Output() blockChanged = new EventEmitter<Block>();
  
  imageUrl = '';
  altText = '';
  caption = '';
  
  ngOnInit() {
    this.loadExistingImage();
  }
  
  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];
    if (file) {
      const uploadResult = await this.uploadImage(file);
      this.block.metadata.id = uploadResult.fileId;
      this.imageUrl = uploadResult.url;
      this.blockChanged.emit(this.block);
    }
  }
  
  async uploadImage(file: File): Promise<{fileId: string, url: string}> {
    // Upload to R2/Supabase storage
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.http.post('/api/v1/files/upload', formData).toPromise();
    return response as {fileId: string, url: string};
  }
}
```

---

## 🛡️ SECURITY & VALIDATION

### Content Security Measures

#### 1. Input Sanitization
```java
@Service
public class ContentSecurityService {
    
    public String sanitizeHtml(String html) {
        // Remove malicious scripts
        // Allow only safe HTML tags
        // Validate image URLs
        return Jsoup.clean(html, Whitelist.basic());
    }
    
    public boolean validateMathLatex(String latex) {
        // Check for suspicious patterns
        // Validate LaTeX syntax
        // Prevent injection attacks
        return isValidLatex(latex);
    }
    
    public List<String> validateImageReferences(List<Block> blocks) {
        // Check if image UUIDs exist
        // Validate file permissions
        // Check file size limits
    }
}
```

#### 2. Content Validation Rules
```typescript
export interface ContentValidationRules {
  maxBlocks: number;           // Max blocks per question/option
  maxTextLength: number;       // Max text length per block
  allowedImageTypes: string[]; // Allowed image MIME types
  maxImageSize: number;        // Max image size in bytes
  allowedMathRenderers: string[]; // 'mathjax', 'katex'
}

export const CONTENT_VALIDATION_RULES: ContentValidationRules = {
  maxBlocks: 20,
  maxTextLength: 2000,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedMathRenderers: ['mathjax', 'katex']
};
```

---

## 📱 PWA/OFFLINE STRATEGY

### Offline Content Caching
```typescript
// Service Worker for offline content
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/v1/questions/')) {
    event.respondWith(
      caches.open('questions-cache').then(cache => {
        return cache.match(event.request).then(response => {
          return response || fetch(event.request).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});

// Content synchronization for offline edits
@Injectable()
export class OfflineContentSyncService {
  syncPendingChanges() {
    const pendingChanges = this.getPendingChanges();
    
    return this.apiService.syncStructuredContent(pendingChanges).subscribe({
      next: (result) => this.clearPendingChanges(result.syncedIds),
      error: (error) => this.handleSyncError(error)
    });
  }
}
```

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Database Foundation (Week 1-2)
- [ ] Add JSONB columns to questions, question_options, sections
- [ ] Create content_blocks table
- [ ] Create migration functions
- [ ] Test backward compatibility

### Phase 2: API Development (Week 3-4)  
- [ ] Create enhanced question creation endpoints
- [ ] Implement content validation services
- [ ] Add structured content DTOs
- [ ] Test API endpoints

### Phase 3: Frontend Components (Week 5-6)
- [ ] Create block editor component
- [ ] Implement math editor with MathJax
- [ ] Build image upload component
- [ ] Test rich content creation flow

### Phase 4: Migration & Testing (Week 7-8)
- [ ] Execute data migration scripts
- [ ] Test backward compatibility
- [ ] Performance testing
- [ ] Security validation

### Phase 5: PWA Integration (Week 9-10)
- [ ] Implement offline content caching
- [ ] Add content synchronization
- [ ] Test offline functionality
- [ ] Final optimization

---

## 📊 SUCCESS METRICS

### Technical Metrics
- **Content Types**: Support for 8+ block types (text, math, image, video, etc.)
- **Performance**: < 200ms response time for structured content queries
- **Storage Efficiency**: 50% reduction in content storage size
- **Offline Support**: 100% functionality available offline

### User Experience Metrics  
- **Creation Time**: 30% faster question creation with rich content
- **Content Quality**: 90% teacher satisfaction with new content types
- **Student Engagement**: 40% increase in quiz interaction rates
- **Mobile Experience**: Fully responsive rich content editor

### Business Metrics
- **Feature Adoption**: 80% of teachers using structured content within 3 months
- **Content Reusability**: 60% increase in question bank utilization
- **Platform Differentiation**: Unique SOTA 2025 content capabilities
- **Customer Retention**: 25% improvement in teacher retention

---

## 🔄 ROLLBACK PLAN

### Emergency Rollback Strategy
```sql
-- Quick rollback script
UPDATE questions 
SET content = (structured_content->0->'content'->>'text'),
    structured_content = NULL,
    content_migration_status = 'rolled_back'
WHERE content_migration_status = 'completed';

-- Similar rollbacks for other tables...
```

### Feature Flags
```java
// Gradual rollout with feature flags
@Configuration
public class FeatureFlagConfig {
    
    @Value("${app.feature.structured-content.enabled:false}")
    private boolean structuredContentEnabled;
    
    public boolean isStructuredContentEnabled() {
        return structuredContentEnabled;
    }
}
```

---

## 🎉 CONCLUSION

This Block-based JSON architecture represents a **paradigm shift** in how the LMS handles content, positioning it as a **SOTA 2025-ready platform** that supports:

- ✅ **Rich Content Creation**: Images, math formulas, videos, and more
- ✅ **PWA/Offline Ready**: Structured data for better performance  
- ✅ **Future-Proof**: Extensible block system for new content types
- ✅ **Enhanced UX**: Intuitive rich content editors
- ✅ **Scalable Architecture**: JSONB for efficient storage and querying

The implementation will transform the LMS from a basic quiz system to a **world-class educational content platform** ready for the demands of modern digital learning.

---

*Document Version: 1.0*  
*Created: 2025-12-24*  
*Status: Ready for Implementation*