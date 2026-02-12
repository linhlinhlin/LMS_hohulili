---
name: cot-research
description: Deep Chain-of-Thought research methodology for systematic problem analysis. Applies SOTA patterns from industry leaders (Canvas, Moodle, Coursera for LMS; Google, Meta, Netflix for architecture). Use when debugging complex issues, planning major refactors, or analyzing system design problems.
---

# CoT Research Skill

Systematic Chain-of-Thought (CoT) research methodology for deep analysis of technical problems, following SOTA patterns from industry leaders and academic research (as of January 2026).

## When to Use This Skill

- Debugging complex, multi-layer issues
- Planning major refactors or architecture changes
- Analyzing system design problems
- Ensuring solutions follow industry best practices
- Avoiding patch-fix approaches in favor of root cause solutions

## Core Methodology

### Step 1: Problem Definition
Clearly articulate the problem before diving into solutions:
- What is the observed symptom?
- What is the expected behavior?
- When did the problem first appear?

### Step 2: Root Cause Analysis (5 Whys)

Apply iterative questioning to find the deepest source:

```
Step 1: Why is [symptom] happening?
  → Because [immediate cause]

Step 2: Why is [immediate cause] happening?
  → Because [deeper cause]

Step 3: Why is [deeper cause] happening?
  → Because [even deeper cause]

... Continue until you reach a root cause that is actionable
```

### Step 3: Logic Flow Mapping

Identify all related logic flows:

| Flow | Components | Connections |
|------|------------|-------------|
| Data Flow | Input → Processing → Output | Databases, APIs |
| Control Flow | User actions → System responses | Events, Handlers |
| Error Flow | Exceptions → Recovery → Logging | Try/Catch, Fallbacks |

### Step 4: SOTA Research

Research current best practices from:

**For LMS/EdTech:**
- Canvas LMS (Instructure)
- Moodle (open source)
- Coursera, edX, Udemy
- Google Classroom

**For General Architecture:**
- Google Cloud Architecture Center
- AWS Well-Architected Framework
- Microsoft Azure Architecture Guide
- Netflix Tech Blog
- Meta Engineering

**For Database/SQL:**
- PostgreSQL official docs
- Use-The-Index-Luke.com
- PGAnalyze best practices

### Step 5: Comparison Analysis

Compare current implementation vs SOTA:

| Aspect | Current | SOTA Pattern | Gap |
|--------|---------|--------------|-----|
| Design | ... | ... | ... |
| Performance | ... | ... | ... |
| Maintainability | ... | ... | ... |

### Step 6: Solution Design

Create solution that:
1. Addresses root cause (not symptoms)
2. Follows SOTA patterns
3. Is maintainable long-term
4. Avoids patch-fix approaches

---

## Output Format

### Quick Analysis (For Simple Issues)

```markdown
## Problem
[One-line description]

## Root Cause
[2-3 sentences explaining why]

## Solution
[Specific actionable fix]
```

### Deep Analysis (For Complex Issues)

```markdown
## 🔍 Deep Analysis Report

### 1. Problem Statement
[Clear description of symptom and expected behavior]

### 2. Root Cause Chain (CoT)
Step 1: Why? → [answer]
Step 2: Why? → [answer]
Step 3: Why? → [answer]
...
Root Cause: [final answer]

### 3. Related Logic Flows
[Diagram or table of data/control flows]

### 4. SOTA Comparison
| Aspect | Current | Industry Best | Gap |
|--------|---------|---------------|-----|
| ... | ... | ... | ... |

### 5. Proposed Solution
[Detailed approach following SOTA]

### 6. Implementation Plan
- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...
```

---

## Examples

### Example 1: Type Mismatch Analysis

**Problem:** Hibernate validation fails on startup

**CoT Analysis:**
```
Step 1: Why is Hibernate failing?
  → Type mismatch: DB column is INTEGER, Entity field is BigDecimal

Step 2: Why is there a type mismatch?
  → Entity was created assuming NUMERIC for currency values

Step 3: Why does DB have INTEGER?
  → Original migration used INTEGER for simplicity

Step 4: Which is correct per SOTA?
  → For percentage scores (0-100): INTEGER is correct
  → For currency/precise decimals: NUMERIC is correct

Root Cause: Entity type doesn't match domain semantics
Solution: Change Entity type to Integer (for scores)
         OR change DB to NUMERIC (for currency)
```

### Example 2: Duplicate Tables Analysis

**Problem:** Schema has multiple similar tables

**CoT Analysis:**
```
Step 1: Why are there duplicate tables?
  → enrollments, learning_enrollments exist with similar structure

Step 2: Why were both created?
  → Historical evolution: direct course enrollment → class-based

Step 3: Which pattern is SOTA?
  → Canvas/Moodle: Class-based enrollment (Section/Group)
  → Students enroll in CLASS, not directly in COURSE

Root Cause: Schema evolved without removing legacy tables
Solution: Keep class-based table, remove legacy
```

---

## Constraints

- **DO NOT** propose patch fixes that address symptoms only
- **DO NOT** skip root cause analysis and jump to solutions
- **DO NOT** ignore SOTA patterns from industry leaders
- **ALWAYS** document the reasoning chain
- **ALWAYS** compare against industry best practices
- **ALWAYS** consider long-term maintainability

---

## Research Resources (Jan 2026)

### LMS Domain
- Canvas API Docs: https://canvas.instructure.com/doc/api/
- Moodle Dev Docs: https://moodledev.io/
- Open edX Architecture: https://docs.openedx.org/

### PostgreSQL
- Official Docs: https://www.postgresql.org/docs/current/
- Use The Index Luke: https://use-the-index-luke.com/
- PGAnalyze: https://pganalyze.com/docs

### Architecture Patterns
- Martin Fowler: https://martinfowler.com/
- System Design Primer: https://github.com/donnemartin/system-design-primer
- 12-Factor App: https://12factor.net/

### Trigger Phrases

This skill should be activated when user mentions:
- "Suy nghĩ thật kỹ" (think carefully)
- "think step-by-step"
- "Chain of Thought" or "CoT"
- "Root cause analysis"
- "SOTA patterns"
- "Best practices from large organizations"
- "Không sửa chắp vá" (no patch fixes)
