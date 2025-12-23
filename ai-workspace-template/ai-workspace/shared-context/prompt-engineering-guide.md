# Prompt Engineering Guide

SOTA Techniques for AI Agents - 2025

---

## Core Patterns

### 1. ReAct (Reason-Action-Observation)
```
<thought> Analyze the situation </thought>
<action> Take action </action>
<observation> Review results </observation>
```

### 2. Chain-of-Thought
```
Let me think step by step...
1. First, I need to...
2. Then, I should...
3. Finally, I will...
```

### 3. ULTRATHINK
Trigger deep multi-dimensional analysis

---

## Agent Structure

```
<meta>          - Metadata
<persona>       - Role + Backstory
<cognitive_framework> - Thinking patterns
<context_loading>     - Session start
<guardrails>          - Rules
```

---

## Best Practices

1. Clear role definition
2. Self-correction checklists
3. Human-in-the-loop for major decisions
4. Update shared-board after work
5. Use handoffs for cross-agent work
