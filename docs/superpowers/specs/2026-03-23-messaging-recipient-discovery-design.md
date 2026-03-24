# Messaging Recipient Discovery and Authorized Conversation Initiation

**Date**: 2026-03-23  
**Status**: Ready for implementation  
**Scope**: Backend policy + recipient discovery API + FE people picker contract  
**Owners**: Codex spec / implementation handoff for communication module

---

## Context

The LMS already supports 1:1 messaging if the client knows `recipientId`.

Current repo truth:

- Backend has:
  - `GET /api/v3/messages/conversations`
  - `GET /api/v3/messages/conversations/between`
  - `GET /api/v3/messages/conversations/{conversationId}/messages`
  - `POST /api/v3/messages/send`
  - `PATCH /api/v3/messages/mark-read`
  - `GET /api/v3/messages/unread-count`
- There is **no** backend endpoint for recipient discovery / people picker.
- `POST /api/v3/messages/send` currently blocks self-messaging, but does **not** enforce a relationship-based authorization rule.
- Frontend can search existing conversations locally, but there is no safe way to discover a valid new recipient.

That makes inbox usable only after a conversation exists, while also leaving the send path too open if a client already knows some arbitrary `recipientId`.

---

## Industry Pattern Snapshot

This spec intentionally follows the pattern used by large platforms as of 2026-03-23:

- **Canvas** keeps Inbox recipient discovery tied to context. Its Conversations API exposes recipient finding with `context` / `context_code` rather than a global free-for-all directory, and the Canvas Inbox UX is built around course/section recipients.  
  Sources: [Canvas Conversations API](https://developerdocs.instructure.com/services/canvas/resources/conversations), [Canvas Inbox guide](https://community.canvaslms.com/t5/Canvas-Basics-Guide/What-is-the-Inbox/ta-p/55)
- **Microsoft Teams** explicitly distinguishes org-wide search from `currentContext` search in its People Picker. For LMS messaging, the safer default is `currentContext`, not org-wide discovery.  
  Source: [Teams People Picker](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/people-picker)
- **Discourse** treats direct-message initiation as a permission problem, not just a UI problem. Admins can restrict who may initiate PMs via group-based policy, while replies to existing threads can remain allowed.  
  Source: [Discourse personal message enabled groups](https://meta.discourse.org/t/prevent-users-from-sending-private-messages-to-users-in-a-group/158783)

Design conclusion:

- Do **not** implement a global people search for LMS messaging.
- Implement a **policy-scoped recipient picker** backed by server authorization.
- Use the **same policy** for both recipient discovery and `POST /send`.

---

## Goals

1. Let users start a new conversation only with recipients that are valid in the LMS relationship graph.
2. Keep search bounded to current academic / administrative context.
3. Prevent user enumeration, spam, and accidental cross-role messaging.
4. Keep the implementation compatible with current repo truth:
   - `users`
   - `learning_classes`
   - `enrollments`
   - `conversations`
5. Make the backend the source of truth for authorization, not the frontend picker.

## Non-goals for V1

- Global directory search across all users
- Student-to-student open DMs
- Group chat / broadcast / announcement threads
- Teacher-to-teacher discovery beyond explicit existing conversations or admin escalation
- Fuzzy search infrastructure such as trigram or external search service
- Inbox redesign beyond the new-recipient flow

---

## Current Domain Constraints

From repo truth:

- `LearningClass` has `courseId` and `teacherId`
- `Enrollment` ties a `studentId` to a class and course context
- `UserJpaEntity` has `role` and `organizationId`
- `ConversationJpaEntity` stores two participants directly (`participant1Id`, `participant2Id`)
- There is no dedicated co-instructor membership model in the current course domain

Implications:

- Teacher <-> student messaging can be derived safely from active class/course relationships
- Org-admin scope can be derived from `organizationId`
- Co-instructor discovery should **not** be invented in V1 because the data model is not there yet

---

## Authorization Model

### Core principle

**Initiation is stricter than reply.**

- Starting a new conversation requires a valid LMS relationship.
- Replying in an existing conversation remains allowed as long as:
  - the user is still a participant
  - both accounts are active
  - there is no future hard-block policy added later

This mirrors the safer pattern seen in systems like Discourse: the platform may restrict who can initiate a new DM without retroactively breaking every existing thread.

### Role matrix

| Sender | May initiate with | V1 decision |
|---|---|---|
| `STUDENT` | teachers of active classes/courses, existing conversation peers, optionally org support/admin | Allowed |
| `TEACHER` | students in classes/courses they teach, existing conversation peers, org admins/admin | Allowed |
| `ORG_ADMIN` | teachers/students in same organization, existing conversation peers, admins | Allowed |
| `ADMIN` | any active user | Allowed |
| `STUDENT` -> arbitrary `STUDENT` | no relationship edge | Not allowed |
| `TEACHER` -> arbitrary unrelated `TEACHER` | no relationship edge in current model | Not allowed in V1 |

### Detailed rules

#### Student initiation

A student may start a new conversation with:

1. the `teacherId` of any `OPEN` or otherwise active class where the student has `ACTIVE` enrollment
2. a user already present in an existing conversation with the student
3. optionally `ORG_ADMIN` / `ADMIN` if product wants a support path

A student may **not**:

- search or message arbitrary other students
- search or message unrelated teachers
- discover users outside their academic path

#### Teacher initiation

A teacher may start a new conversation with:

1. students in classes they teach
2. a user already present in an existing conversation
3. `ORG_ADMIN` / `ADMIN`

A teacher may **not**:

- search unrelated students
- search unrelated teachers in V1

#### Org admin initiation

An org admin may start a new conversation with:

1. teachers in the same organization
2. students in the same organization
3. admins
4. existing conversation peers

Org admins should not discover users outside their governed organization unless the runtime explicitly grants that access.

#### Admin initiation

Admin may search all active users. This is the only role allowed to operate like a near-global picker in V1.

---

## API Contract

## 1. New endpoint: `GET /api/v3/messages/recipients`

### Purpose

Return only recipients the current user is allowed to message.

### Request

Query params:

- `q` optional string
- `contextType` optional enum:
  - `auto` default
  - `recent`
  - `class`
  - `course`
  - `support`
  - `org`
- `contextId` optional UUID
- `limit` optional integer, default `20`, max `50`
- `cursor` optional opaque string for keyset pagination

### Behavior

- If `q` is blank, return top eligible recipients ranked by:
  1. existing conversations
  2. same active class
  3. same active course group derived from active classes
  4. support/admin scope
- If `contextType=class` or `course`, results are intersected with that context.
- If `contextType=recent`, only existing conversation peers are returned.
- If the caller asks for a context they are not allowed to use, return `403`.

For V1, `contextType=course` is resolved through active class relationships (`learning_classes.course_id`), not through a separate standalone messaging graph.

### Response

```json
{
  "success": true,
  "message": "Eligible recipients",
  "data": {
    "items": [
      {
        "userId": "uuid",
        "displayName": "Nguyen Van A",
        "email": "teacher@maritime.edu",
        "role": "TEACHER",
        "avatarUrl": null,
        "conversationId": "uuid-or-null",
        "relationshipType": "CLASS_TEACHER",
        "contextType": "class",
        "contextId": "uuid-or-null",
        "contextLabel": "ECDIS-2026B",
        "canMessage": true
      }
    ],
    "nextCursor": null
  }
}
```

### Notes

- `conversationId` is returned when an existing conversation already exists, so FE can deep-link directly instead of creating a duplicate.
- Do not return detailed denial reasons for users that are outside scope. Just omit them from results.

---

## 2. Existing endpoint hardening: `POST /api/v3/messages/send`

### Required change

`POST /send` must call the same authorization policy used by `GET /recipients`.

### Reason

The picker is not enough. A malicious or buggy client could still call `POST /send` with an arbitrary `recipientId`.

### Failure contract

- Return `403` with a stable application code such as `RECIPIENT_NOT_ALLOWED`
- Do **not** reveal whether the target user exists outside the sender's allowed scope

### V1 decision

No new `POST /conversations/start` endpoint is required.

Reason:

- current backend already creates or reuses a conversation on first send
- FE can use:
  - `GET /recipients`
  - `GET /conversations/between` when needed
  - `POST /send` for the first real message

This keeps V1 simpler and avoids a half-empty conversation state.

---

## Query Strategy

### Strategy summary

Use a **server-side scoped union query**, not client stitching and not a global user search.

Candidate sources:

1. `existing_conversation_peers`
2. `student_visible_teachers`
3. `teacher_visible_students`
4. `org_admin_visible_users`
5. `admin_visible_users`

Then:

- union candidates
- de-duplicate by `user_id`
- left join existing conversation
- apply query filter
- apply rank
- paginate with keyset cursor

### Why this strategy

- matches Canvas-style contextual recipient discovery
- matches Teams-style current-context search
- prevents student/global directory exposure
- keeps the result set small and explainable
- stays inside current repo truth instead of inventing new relationship tables

### Query outline

Illustrative SQL shape:

```sql
with existing_peers as (
  select
    case
      when c.participant1_id = :currentUserId then c.participant2_id
      else c.participant1_id
    end as user_id,
    'EXISTING_CONVERSATION' as relationship_type,
    null::uuid as context_id,
    'recent' as context_type,
    0 as rank_bucket,
    c.id as conversation_id
  from conversations c
  where c.participant1_id = :currentUserId
     or c.participant2_id = :currentUserId
),
student_teachers as (
  select distinct
    lc.teacher_id as user_id,
    'CLASS_TEACHER' as relationship_type,
    lc.id as context_id,
    'class' as context_type,
    1 as rank_bucket,
    null::uuid as conversation_id
  from enrollments e
  join learning_classes lc on lc.id = e.class_id
  where e.student_id = :currentUserId
    and e.status = 'ACTIVE'
    and lc.teacher_id is not null
),
teacher_students as (
  select distinct
    e.student_id as user_id,
    'CLASS_STUDENT' as relationship_type,
    lc.id as context_id,
    'class' as context_type,
    1 as rank_bucket,
    null::uuid as conversation_id
  from learning_classes lc
  join enrollments e on e.class_id = lc.id
  where lc.teacher_id = :currentUserId
    and e.status = 'ACTIVE'
),
org_scope as (
  select
    u.id as user_id,
    case when u.role = 'ADMIN' then 'SYSTEM_ADMIN' else 'ORG_ADMIN' end as relationship_type,
    null::uuid as context_id,
    'org' as context_type,
    3 as rank_bucket,
    null::uuid as conversation_id
  from users u
  where :allowOrgScope = true
    and u.enabled = true
    and (
      u.role = 'ADMIN'
      or (u.organization_id = :currentOrgId and u.role = 'ORG_ADMIN')
    )
),
candidates as (
  select * from existing_peers
  union all
  select * from student_teachers
  union all
  select * from teacher_students
  union all
  select * from org_scope
),
deduped as (
  select distinct on (c.user_id)
    c.user_id,
    c.relationship_type,
    c.context_id,
    c.context_type,
    c.rank_bucket,
    c.conversation_id
  from candidates c
  where c.user_id <> :currentUserId
  order by c.user_id, c.rank_bucket asc
)
select
  d.user_id,
  u.full_name,
  u.email,
  u.role,
  d.relationship_type,
  d.context_type,
  d.context_id,
  d.rank_bucket,
  d.conversation_id
from deduped d
join users u on u.id = d.user_id
where u.enabled = true
  and (
    :q is null
    or lower(u.full_name) like lower(concat('%', :q, '%'))
    or lower(u.email) like lower(concat('%', :q, '%'))
  )
order by d.rank_bucket asc, lower(u.full_name) asc, u.id asc
limit :limit;
```

### Pagination

Use keyset pagination, not offset, with an opaque cursor derived from:

- `rank_bucket`
- normalized display name
- `user_id`

That keeps the endpoint stable as inbox state changes.

### Search matching

V1 matching is enough with:

- `LOWER(full_name) LIKE`
- `LOWER(email) LIKE`

Do not add trigram / full-text search yet.

Reason:

- current LMS dataset is moderate
- search is scoped to a small eligible subset
- context-bounded search keeps the query cheap

### Existing indexes

The base schema already has useful indexes:

- `idx_learning_classes_teacher_id`
- `idx_learning_classes_status`
- `idx_enrollments_student_status`
- `idx_enrollments_class_id`
- `idx_conversations_participant1_id`
- `idx_conversations_participant2_id`

V1 should ship on these first, then use `EXPLAIN ANALYZE` before adding more.

---

## Backend Design Notes

### New application read path

Introduce a dedicated read-model path instead of overloading `UserRepository`:

- `communication/application/port/MessageRecipientDiscoveryPort`
- `communication/application/usecase/ListMessageRecipientsUseCase`
- `communication/application/dto/MessageRecipientCandidateResponse`

Reason:

- recipient discovery is query-oriented, not aggregate persistence
- current `UserRepository` domain port is too coarse for contextual discovery

### Shared policy service

Introduce a reusable policy abstraction:

- `communication/application/port/MessageRecipientPolicy`
- or `communication/application/service/MessageAuthorizationService`

Methods:

- `List<RecipientScope> listAllowedScopes(currentUser)`
- `CanMessageResult canInitiateMessage(currentUserId, recipientId)`
- `CanMessageResult canSendMessage(currentUserId, recipientId)`

This same policy must be called by:

- `GET /api/v3/messages/recipients`
- `POST /api/v3/messages/send`

Policy semantics:

- `canInitiateMessage(...)` is used for new recipient discovery
- `canSendMessage(...)` first checks whether an existing conversation already exists between the pair
- if a conversation already exists and both accounts remain active, reply is allowed even when the pair is no longer discoverable in the new-recipient picker

### Repo-truth cleanup to schedule

Frontend `MessagingService.searchMessages()` currently calls `/api/v3/messages/search`, but the controller does not expose that route. V1 implementation should either:

1. remove that dead remote call and keep local conversation search, or
2. add a real conversation search endpoint later

That cleanup is adjacent, but separate from recipient discovery.

---

## Frontend Contract

### V1 UX

Add a `Tin nhan moi` flow with:

1. recent recipients first
2. scoped search field
3. relationship subtitle
4. direct open if `conversationId` exists
5. compose-first-send if `conversationId` is null

### Mobile-first requirements

- full-screen sheet on small screens
- one-tap back to inbox
- keep recipient rows compact:
  - name
  - role badge
  - relationship subtitle
- no infinite filter chips in V1

### Empty states

- student with no eligible recipients:
  - "Ban chua co giang vien hoac hoi thoai hop le de nhan tin."
- teacher with no active students:
  - "Chua co hoc vien hop le de bat dau hoi thoai."

---

## Security and Privacy Invariants

1. Never expose a global people directory to students.
2. Never trust `recipientId` from the client without policy validation.
3. Do not leak whether an out-of-scope user exists.
4. Keep initiation policy stricter than reply policy.
5. Prefer omission over verbose denial in recipient search results.

---

## Rollout Plan

### Phase 1

- implement `GET /api/v3/messages/recipients`
- add shared send policy
- FE `Tin nhan moi` modal / sheet
- recent + class/course scoped results

### Phase 2

- support/admin scope if product wants it exposed for students
- better ranking / badges
- analytics on empty-search and no-result states

### Phase 3

- teacher-to-teacher or co-instructor discovery only if a proper co-instructor relation is added to the domain

---

## Final Decisions

- **Do not build global user search.**
- **Do build scoped recipient discovery.**
- **Use the same authorization policy for search and send.**
- **Treat existing conversations as a special carry-forward case.**
- **Keep V1 aligned with current class/course/enrollment data instead of inventing social features.**
