# Course Delivery Modes: Industry Research

> **Date**: 2026-03-03 | **Purpose**: Research how major LMS/EdTech platforms implement Self-Paced vs Instructor-Led course delivery

---

## Executive Summary

All major platforms recognize the fundamental split between **self-paced** and **instructor-led** delivery. However, the naming, feature sets, and implementation depth vary significantly:

| Platform | Self-Paced Name | Instructor-Led Name | Hybrid Support |
|----------|----------------|---------------------|----------------|
| **Open edX** | Self-Paced | Instructor-Paced | No (binary choice, locked after start) |
| **Canvas LMS** | Course Pacing (rolling enrollment) | Standard (fixed dates) | Yes (Mastery Paths + Sections) |
| **Moodle** | Topics Format + Activity Completion | Weekly Format | Yes (format is flexible) |
| **Coursera** | On-Demand | Session-Based | Yes (suggested deadlines in both) |
| **Google Classroom** | Practice Sets + Differentiated | Standard Class-Based | Partial (per-student assignment) |
| **Udemy** | On-Demand (marketplace) | Cohort/Live Events (Business only) | Yes (Business Leadership Academy) |

---

## 1. Open edX (Most Formally Defined)

### Mode Names
- **Self-Paced** (explicit setting in Studio)
- **Instructor-Paced** (default)

### Feature Comparison

| Feature | Self-Paced | Instructor-Paced |
|---------|-----------|------------------|
| **Content Access** | All content available immediately on enrollment | Content released on scheduled dates (section-level) |
| **Due Dates** | No fixed due dates; Personalized Learning Schedule (PLS) assigns suggested dates based on enrollment date | Fixed due dates visible in LMS, set by instructor |
| **PLS (Personalized Learning Schedule)** | Default pacing: evenly distributed. Custom pacing: instructor sets specific offsets. Mix of both supported. | N/A |
| **Deadline Enforcement** | Suggested only; learners submit anytime before course end | Enforced; late submissions may not count |
| **Content Release Dates** | Cannot set release dates | Instructor sets section/subsection release dates |
| **Discussion Forums** | Available but less active (async timing) | Active cohort discussions, shared deadlines drive engagement |
| **Certificates** | Issued on-demand as soon as passing grade achieved | Issued after course end date |
| **Grading** | Same grading policy, but no late penalties | Same grading policy, late penalties possible |
| **Progress UI (Learner)** | Shows graded assignments WITHOUT due dates in nav | Shows graded assignments WITH due dates in nav |
| **Course Outline (Instructor)** | Pacing indicator badge shown | Pacing indicator badge shown |
| **Enrollment** | Open/rolling enrollment typical | Cohort-based, fixed start dates typical |
| **Pacing Change** | Cannot change after course start date | Cannot change after course start date |
| **Peer Interaction** | Limited; less frequent instructor/peer contact | Regular interactions, shared deadlines foster collaboration |

### Key Design Decisions
- Binary choice: self-paced OR instructor-paced, set before course starts, immutable after
- PLS is the standout feature: auto-generates suggested deadlines from enrollment date
- Converting instructor-paced to self-paced preserves deadline data (allows reversion)
- Self-paced courses still have a course end date (after which no credit can be earned)

---

## 2. Canvas LMS (Flexible, Module-Centric)

Canvas does NOT have a single "self-paced vs instructor-led" toggle. Instead, it offers a combination of features that together create either experience.

### Mode Names
- **Standard Course** (fixed dates, traditional)
- **Course Pacing** (rolling enrollment, auto-generated due dates)
- **Mastery Paths** (adaptive, competency-based progression)

### Feature Comparison

| Feature | Standard Course | Course Pacing | Mastery Paths |
|---------|----------------|---------------|---------------|
| **Content Access** | Available per module prerequisites | All modules available; due dates auto-calculated | Conditional: unlocked based on prior assignment scores |
| **Due Dates** | Fixed dates set by instructor | Auto-calculated per student based on enrollment date + "days to complete" per assignment | N/A (progress-gated) |
| **Sections** | Same dates for all students in a section | Each section/student can have different start dates | Score ranges determine which content path a student follows |
| **Rolling Enrollment** | Not supported natively | Primary use case; students join anytime | Compatible with rolling enrollment |
| **Module Prerequisites** | Instructor sets; same for all | Compatible | Enhanced: conditional items auto-assigned |
| **Completion Requirements** | View page, submit assignment, score threshold | Same requirements, different timelines | Automated based on mastery demonstration |
| **Student UI** | Standard calendar with fixed dates | Personalized calendar with individualized due dates | Modules page shows conditionally unlocked items |
| **Instructor UI** | Standard gradebook | Course Pacing page: set "days" per assignment, manage individual student paces | Mastery Paths config: set score ranges and conditional content |
| **Grading** | Standard | Standard (same rubrics, different timelines) | Adaptive: different assignments based on performance |
| **Peer Review** | Difficult with staggered dates | Difficult with staggered dates | N/A |

### Key Design Decisions
- Course Pacing requires assignments to be in Modules
- Student's pace begins on "effective start date" (enrollment creation date, section date, course date, or term date -- whichever is most recent)
- Account-level feature flag; admin enables, then instructors opt-in per course
- Mastery Paths: a pre-test determines which content path a student follows (remedial, standard, advanced)
- No single binary toggle -- Canvas gives building blocks, instructor assembles the experience

---

## 3. Moodle (Format-Driven, Highly Configurable)

Moodle does not have explicit "self-paced" vs "instructor-led" modes. Instead, the **course format** combined with **activity completion** and **restrict access** rules create the desired behavior.

### Mode Names (Course Formats)
- **Weekly Format** (instructor-led equivalent)
- **Topics Format** (self-paced equivalent)
- **Social Format** (discussion-driven)
- **Single Activity Format** (one activity per course)
- **Custom/Plugin Formats** (Card, Tiles, Designer, etc.)

### Feature Comparison

| Feature | Weekly Format | Topics Format | Social Format |
|---------|--------------|---------------|---------------|
| **Structure** | Sections = calendar weeks (auto-generated from course start date) | Sections = named topics (no time association) | Single main forum |
| **Pacing** | Time-driven: current week highlighted | Content-driven: no time pressure | Discussion-driven |
| **Content Access** | Can restrict by date (current week only) | All topics available by default | All posts available |
| **Activity Completion** | Manual or conditional (view, submit, grade threshold) | Same | Same |
| **Restrict Access** | By date, grade, activity completion, group, profile field | Same conditions available | Limited |
| **Progress Tracking** | Completion progress bar per section | Completion progress bar per section | N/A |
| **Self-Paced Progression** | Possible via "restrict access" on future weeks | Natural fit: restrict access by prior activity completion | N/A |
| **Current Section Highlight** | Current WEEK auto-highlighted | No auto-highlight (manual) | N/A |
| **Best For** | Semester courses, synchronized cohorts | Self-paced, objective-based, variable-length units | Community learning, Q&A |

### Activity Completion + Restrict Access (Self-Paced Engine)
Moodle's self-paced capability comes from combining two features:

1. **Activity Completion**: Defines what "done" means (viewed, submitted, scored above threshold)
2. **Restrict Access**: Gates content behind conditions (prior completion, date, grade, group)

Together, they create sequential progression: Student completes Activity A -> Activity B unlocks -> Student completes B -> Section 2 unlocks.

### Visibility Control
- **Eye OPEN**: Students see locked activity name + reason ("Complete Quiz 1 first")
- **Eye CLOSED**: Activity completely hidden until conditions met

### Key Design Decisions
- No binary toggle; instructor builds self-paced behavior from primitives
- Topics format is the natural fit for self-paced (no time association)
- Weekly format can still be made self-paced via restrict access
- Plugin formats (Tiles, Cards) add visual appeal for self-paced catalog-style courses
- Completion tracking provides students a linear guided progression

---

## 4. Coursera (Session-Based with On-Demand Flexibility)

### Mode Names
- **On-Demand** (self-paced, always available)
- **Session-Based** (cohort-based, recurring sessions)

### Product Types

| Product | Pacing | Duration | Cost | Key Feature |
|---------|--------|----------|------|-------------|
| **Guided Project** | Self-paced | 1-2 hours | $9.99 fixed | Browser-based, step-by-step, no deadlines |
| **Course** | On-Demand or Session-Based | 4-12 weeks | $49+/mo (Coursera Plus) | Video lectures, quizzes, peer review |
| **Specialization** | On-Demand (series of courses) | 3-6 months | $49+/mo | 4-10 courses + capstone project |
| **Professional Certificate** | On-Demand (series of courses) | 1-8 months | $49+/mo | Industry-aligned, employer-recognized |
| **Degree** | Session-Based | 1-4 years | $9,000-$45,000 | University-issued degree, cohort model |

### Feature Comparison (Course Level)

| Feature | On-Demand | Session-Based |
|---------|-----------|---------------|
| **Start Date** | Anytime | Fixed (sessions run ~monthly) |
| **Deadlines** | Suggested, adjustable, can be turned off | Suggested, reset each session |
| **Late Penalty** | None (no enforced deadlines) | No penalty for individual deadlines, but session has end date |
| **Peer Review** | Available but slow (learners at different stages) | ~33% faster feedback (cohort on same schedule) |
| **Discussion Forums** | Available but less active | ~40% more likely to post (shared schedule) |
| **Completion Rate** | Lower | ~60% higher completion rate |
| **Session Transfer** | N/A | If behind, transfer to next session; completed work carries over |
| **Enrollment Window** | Always open | Closes a few days after session start |
| **Certificate** | Earned on completion (anytime) | Earned on completion (within or across sessions) |
| **Progress Reset** | Can reset deadlines | Deadlines auto-reset on session transfer |

### Key Design Decisions
- Coursera moved FROM pure on-demand TO session-based because peer review and forums suffered with fully async learners
- Sessions run monthly; never more than a few weeks wait
- No penalty for missing individual deadlines in either mode
- Session transfer preserves all completed work
- Guided Projects are always self-paced (short, browser-based)
- Degrees are always session-based (university semester model)

---

## 5. Google Classroom (Class-First, Limited Self-Paced)

Google Classroom is fundamentally designed for **class-based, instructor-led** learning (K-12 / higher ed). It does not have an explicit self-paced mode, but offers features that enable differentiation.

### Mode Names
- **Standard Class** (instructor-led, the only real mode)
- No formal "self-paced" mode

### Assignment Types

| Type | Grading | Auto-grade | Self-Paced Potential |
|------|---------|------------|---------------------|
| **Assignment** | Manual (rubric) | No | Low (fixed due date) |
| **Quiz Assignment** | Auto + manual | Yes (Google Forms) | Medium (can be self-paced with no due date) |
| **Question** | No points | No | Medium (discussion-style) |
| **Practice Set** | Auto-graded | Yes (with hints, video suggestions) | High (interactive, immediate feedback) |
| **Material** | N/A | N/A | High (reference, no deadline) |

### Differentiation Features

| Feature | Description | Self-Paced Relevance |
|---------|-------------|---------------------|
| **Assign to specific students** | Teacher selects individual students or groups | Enables personalized paths |
| **Scheduled posts** | Release assignments at specific times | Enables drip content |
| **Practice Sets** | Interactive, auto-graded, hints, immediate feedback | Best self-paced feature |
| **Learning Paths (2025)** | Auto-assign different task versions based on performance | Adaptive, quasi-Mastery-Paths |
| **Grade all (2025)** | Completion-based grading | Reduces manual overhead |

### Grading Systems
- **Total points**: Direct sum of all assignment points
- **Weighted by category**: Categories (homework, exams, participation) with percentage weights
- **No overall grade**: Individual assignment grades only

### Key Design Decisions
- No self-paced mode; everything is class/cohort-based
- Practice Sets are the closest to self-paced (auto-graded, hints, immediate feedback)
- Differentiation via "assign to specific students" is manual, not automated
- Learning Paths (2025) add some adaptive capability
- No rolling enrollment; classes have fixed rosters
- No content gating or prerequisite system natively

---

## 6. Udemy (Marketplace On-Demand + Business Cohort)

### Mode Names
- **On-Demand Course** (marketplace, the standard model)
- **Cohort Learning / Live Events** (Udemy Business only, Leadership Academy)

### Feature Comparison

| Feature | On-Demand (Marketplace) | Cohort / Live Events (Business) |
|---------|------------------------|----------------------------------|
| **Access** | Purchase once, lifetime access | Organization subscription |
| **Pacing** | Fully self-paced | Mix of self-paced modules + scheduled live events |
| **Deadlines** | None | Cohort schedule with module deadlines |
| **Live Interaction** | None (Q&A forum only) | Live capstone events, moderator-facilitated discussions |
| **Content** | Pre-recorded video + quizzes + practice tests | Pre-recorded + live events at end of each module |
| **Instructor Role** | Content creator only (no live teaching) | Content creator + live moderator/facilitator |
| **Peer Interaction** | Q&A forum (async) | Collaborative discussion forums + live cohort events |
| **Certificates** | Completion certificate (Udemy-issued) | Completion certificate (organization-branded) |
| **Progress Tracking** | Lecture completion percentage | Module completion + cohort progress dashboard |
| **Enrollment** | Open (anyone can purchase) | Organization-managed (groups of 25+) |
| **Pricing** | Per-course ($10-$200) | Per-seat subscription |
| **Availability** | Global | Business: Leadership Academy currently North America only |

### Key Design Decisions
- Marketplace Udemy is 100% on-demand, no live features whatsoever
- Udemy Business added cohort learning for enterprise (Leadership Academy)
- Live events are "capstones" at end of async modules, not full live courses
- No instructor-led live teaching on the standard marketplace platform
- VILT (Virtual Instructor-Led Training) launched for Business in 2025
- The split is product-level (marketplace vs business), not course-level

---

## Cross-Platform Comparison Matrix

### Delivery Mode Architecture

| Aspect | Open edX | Canvas | Moodle | Coursera | Google Classroom | Udemy |
|--------|---------|--------|--------|----------|-----------------|-------|
| **Explicit toggle** | Yes (binary) | Partial (Course Pacing opt-in) | No (format choice) | Yes (on-demand vs session) | No | No (product-level split) |
| **Granularity** | Course-level | Course-level | Course-level + activity-level | Course-level | Assignment-level | Product-level |
| **Immutable after start** | Yes | No | No | No (can switch sessions) | N/A | N/A |
| **Rolling enrollment** | Self-paced only | Course Pacing feature | Any format (manual) | On-demand only | No | On-demand only |
| **Personalized schedule** | PLS (auto-calculated) | Course Pacing (days-based) | Restrict Access (manual) | Suggested deadlines | Per-student assignment | None |

### Content Access

| Aspect | Open edX | Canvas | Moodle | Coursera | Google Classroom | Udemy |
|--------|---------|--------|--------|----------|-----------------|-------|
| **All content at once (self-paced)** | Yes | Depends on modules | Depends on restrict access | Yes (on-demand) | N/A | Yes |
| **Drip/scheduled release (instructor-led)** | Section release dates | Module prerequisites | Weekly format + date restrictions | Session schedule | Scheduled posts | Cohort module schedule |
| **Adaptive paths** | No | Mastery Paths | Restrict access by grade | No | Learning Paths (2025) | No |

### Assessment & Grading

| Aspect | Open edX | Canvas | Moodle | Coursera | Google Classroom | Udemy |
|--------|---------|--------|--------|----------|-----------------|-------|
| **Same grading policy both modes** | Yes | Yes | Yes | Yes | N/A | N/A |
| **Late penalties** | Instructor-paced only | Standard courses | Configurable | No penalties either mode | Teacher discretion | N/A |
| **Peer review** | Both modes (better in instructor-paced) | Both (harder with pacing) | Both | Both (better in session-based) | No | No |
| **Auto-grading** | Yes | Yes | Yes | Yes | Practice Sets only | Quizzes only |

### Student Experience

| Aspect | Open edX | Canvas | Moodle | Coursera | Google Classroom | Udemy |
|--------|---------|--------|--------|----------|-----------------|-------|
| **Visible due dates (self-paced)** | No (suggested via PLS) | Yes (personalized) | Depends on setup | Suggested, adjustable | Per assignment | None |
| **Progress bar** | Yes | Yes | Yes (with completion tracking) | Yes | Limited | Yes (% lectures) |
| **Current section highlight** | No | No | Weekly format only | N/A | N/A | N/A |
| **Certificate on completion** | Immediate (self-paced) | Same both modes | Same both modes | Same both modes | N/A | Same |

### Instructor Experience

| Aspect | Open edX | Canvas | Moodle | Coursera | Google Classroom | Udemy |
|--------|---------|--------|--------|----------|-----------------|-------|
| **Setup complexity** | Low (one toggle) | Medium (enable pacing, set days) | High (configure per activity) | Low (platform decides) | Low (no mode to set) | N/A (platform-level) |
| **Per-student management** | PLS auto-manages | Individual pace management | Manual restrict access | Auto (session transfer) | Assign to specific students | N/A |
| **Analytics** | Standard | Standard | Standard + completion reports | Coursera analytics | Classroom analytics | Instructor dashboard |

---

## Key Takeaways for LMS Design

### 1. The Two Core Patterns

**Pattern A: Binary Toggle (Open edX model)**
- Simple: one setting, two behaviors
- Clean separation of concerns
- Limitation: cannot mix modes within a course

**Pattern B: Building Blocks (Canvas/Moodle model)**
- Flexible: combine features to create any experience
- More complex setup
- Advantage: supports hybrid (some content scheduled, some self-paced)

### 2. Critical Features by Mode

**Self-Paced courses MUST have:**
- All content available immediately (or progressively via completion gates)
- No enforced deadlines (suggested/soft deadlines OK)
- Individual progress tracking
- Rolling enrollment support
- On-demand certificate issuance

**Instructor-Led courses MUST have:**
- Scheduled content release (drip)
- Fixed deadlines with enforcement
- Cohort management (sections/groups)
- Discussion forums tied to cohort schedule
- Peer review with synchronized submissions

### 3. The Hybrid Trend
Most platforms are moving toward hybrid models:
- **Coursera**: On-demand with suggested session-like deadlines
- **Canvas**: Course Pacing adds self-paced to traditionally instructor-led
- **Udemy Business**: Added cohort/live to traditionally self-paced
- **Google Classroom**: Adding adaptive Learning Paths to class-based model

### 4. Personalized Learning Schedule (PLS)
Open edX's PLS is the gold standard for self-paced courses:
- Auto-generates suggested due dates from enrollment date
- Default pacing: evenly distributed across course duration
- Custom pacing: instructor sets specific day offsets per assignment
- Mix of both within a single course

### 5. Enrollment Model Implications

| Mode | Enrollment | Cohort | Certificate |
|------|-----------|--------|-------------|
| Self-Paced | Rolling/open | Individual or no cohort | On completion |
| Instructor-Led | Fixed window | Cohort-based | After course end |
| Hybrid | Rolling with soft cohorts | Optional grouping | On completion |

---

## Sources

- [Open edX Course Pacing Documentation](https://docs.openedx.org/en/open-release-sumac.master/educators/references/setting_course_pacing.html)
- [Open edX Learner Guide: Self-Paced Courses](https://edx.readthedocs.io/projects/open-edx-learner-guide/en/open-release-ficus.master/SFD_self_paced.html)
- [Edly: Difference Between Instructor-paced and Self-paced](https://help.edly.io/docs/difference-between-instructor-paced-and-self-paced-courses)
- [edX Support: Self-paced or Instructor-paced](https://support.edx.org/hc/en-us/articles/115011202847-What-is-self-paced-or-instructor-paced-Which-is-my-course)
- [Canvas Course Pacing Feature Overview](https://community.canvaslms.com/t5/Course-Pacing-Feature-Preview/Course-Pacing-Feature-Overview/ta-p/519334)
- [Canvas Course Pacing FAQ](https://community.canvaslms.com/t5/Course-Pacing-Feature-Preview/Feature-FAQ/ta-p/519317)
- [Canvas: How to Use Course Pacing](https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-use-Course-Pacing/ta-p/653666)
- [Canvas Mastery Paths Guide](https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-use-Mastery-Paths-in-course-modules/ta-p/906)
- [University of Pittsburgh: Course Pacing in Canvas](https://teaching.pitt.edu/resources/how-to-use-course-pacing-to-manage-due-dates-in-canvas/)
- [Moodle Docs: Course Formats](https://docs.moodle.org/501/en/Course_formats)
- [Moodle Docs: Restrict Access Settings](https://docs.moodle.org/501/en/Restrict_access_settings)
- [Moodle Docs: Using Restrict Access](https://docs.moodle.org/501/en/Using_restrict_access)
- [NC State: Activity Completion and Restrict Access in Moodle](https://news.delta.ncsu.edu/2022/03/15/utilizing-activity-completion-and-restrict-access-in-moodle/)
- [Coursera Blog: Striking a Balance with Start Dates and Deadlines](https://blog.coursera.org/coursera-update-striking-a-balance-with-start/)
- [Coursera Blog: Flexible Session-Based Schedules](https://blog.coursera.org/coming-soon-to-all-courses-flexible-session-based/)
- [Coursera Blog: Improvements to Sessions Experience](https://blog.coursera.org/improvements-to-sessions-experience-for-learners/)
- [Coursera: How Do Online Courses Work](https://www.coursera.org/articles/how-do-online-courses-work)
- [Google Classroom Guide 2026](https://www.structural-learning.com/post/google-classroom)
- [Google Classroom: Practice Sets](https://support.google.com/edu/classroom/answer/13455950?hl=en)
- [Google: Differentiated Instruction in Classroom](https://www.teachingwithgoogle.com/2018/12/differentiated-instruction-in-google.html)
- [Google Classroom Grades API](https://developers.google.com/workspace/classroom/guides/key-concepts/grades)
- [Udemy Business: Live Events / Leadership Academy](https://business-support.udemy.com/hc/en-us/articles/13315868612119-Course-Feature-Live-Events-Leadership-Academy)
- [Udemy Business: Leadership Academy](https://business.udemy.com/leadership-academy/)
- [Udemy Business: Cohort Collection](https://business.udemy.com/cohort-collection/)
