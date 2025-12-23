# LMS - AI AGENT SYSTEM

> AI AGENT: Read this file first to understand your role and context.

---

## YOUR ROLE ASSIGNMENT

When Human Owner tells you which role you are, read the corresponding file:

| If you are... | Read this file | Your folder |
|---------------|--------------|----------------|
| Project Manager | agents/project-manager/system-prompt.md | agents/project-manager/ |
| Frontend Architect | agents/frontend-architect/system-prompt.md | agents/frontend-architect/ |
| Backend Engineer | agents/backend-engineer/system-prompt.md | agents/backend-engineer/ |
| Database Specialist | agents/database-specialist/system-prompt.md | agents/database-specialist/ |
| QA Engineer | agents/qa-engineer/system-prompt.md | agents/qa-engineer/ |

Base Path: E:\LMS\lms_1\dev\ai-workspace-template/ai-workspace/

---

## PROJECT OVERVIEW

Project: LMS
Type: [To be filled after audit]
Tech Stack: Java 21 + Spring Boot 3.5.6 + Angular 20 + PostgreSQL

> Run audit using prompts in luongngoai/quytrinhAI/ to populate this section.

---

## DIRECTORY STRUCTURE

```
ai-workspace/
├── agents/                    # Folder for each AI Agent
│   ├── project-manager/       
│   ├── frontend-architect/    
│   ├── backend-engineer/      
│   ├── database-specialist/   
│   └── qa-engineer/           
│
├── shared-context/            # Shared context for ALL agents
│   ├── shared-board.md        # Current status - CHECK FIRST
│   ├── decision-log.md        # Architecture Decision Records
│   ├── global-architecture.md # System architecture
│   └── prompt-engineering-guide.md
│
├── communication/             
│   ├── agent-handoffs.md      
│   └── conflict-resolution.md 
│
└── workflows/                 
    ├── feature-development.md 
    ├── bug-fixing.md          
    └── architecture-review.md 
```

---

## MANDATORY WORKFLOW

### When starting session:
1. Read this README.md file (done)
2. Read shared-context/shared-board.md for current status
3. Read system-prompt.md for your assigned role
4. Read context/progress.md to know previous work

### After completing each task:
- UPDATE shared-context/shared-board.md with your status
- UPDATE context/progress.md with work completed
- LOG significant decisions to decision-log.md

### When deep analysis is needed:
- USE: ULTRATHINK: [problem]
- OR: Think step-by-step

---

## TRIGGER COMMANDS

| Command | Effect |
|---------|--------|
| (Default) | Concise, focused response |
| ULTRATHINK | Multi-dimensional deep analysis |
| Think step-by-step | Step-by-step reasoning (CoT) |

---

## IMPORTANT RULES

1. Stay in role - Do not work outside your domain
2. Update progress - After each task completed
3. Use handoffs - When transferring work to another agent
4. Escalate - Contact Human Owner for major decisions
5. Document - Record important decisions

---

Version: Template 1.0
