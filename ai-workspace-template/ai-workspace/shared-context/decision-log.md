# DECISION LOG - LMS

Architecture Decision Records

---

## Template

```markdown
## ADR-XXX: [Title]

Date: YYYY-MM-DD
Status: Proposed | Accepted | Deprecated
Deciders: [Who]

### Context
[What is the issue?]

### Decision
[What was decided?]

### Consequences
[Positive and negative outcomes]
```

---

## Accepted Decisions

### ADR-001: Payment System Design

**Date**: 2025-12-23
**Status**: Accepted
**Deciders**: Navigator, Backend, Frontend

#### Context
Cần implement hệ thống thanh toán cho khóa học với model:
- 2 bài đầu miễn phí
- Full access sau khi thanh toán

#### Decision
- Dùng Payment entity với status (PENDING, COMPLETED, FAILED, REFUNDED)
- Tự động record TeacherRevenue khi payment success
- Frontend check `hasPaid` signal để hiển thị UI phù hợp

#### Consequences
- ✅ Đơn giản, dễ maintain
- ✅ Tích hợp sẵn revenue tracking
- ❌ Chưa tích hợp real payment gateway

---

### ADR-002: Teacher Revenue Model (Udemy-style)

**Date**: 2025-12-23
**Status**: Accepted
**Deciders**: Navigator, Backend

#### Context
Teacher cần theo dõi thu nhập và rút tiền từ các khóa học bán được.

#### Decision
Theo mô hình Udemy:
- TeacherRevenue: gross_amount, platform_fee, net_amount, sale_type
- TeacherPayout: request → approve → complete workflow
- Admin approval required for payouts

#### Consequences
- ✅ Minh bạch cho teacher
- ✅ Control cho admin
- ❌ Manual approval (chưa tự động)

---

### ADR-003: Teacher Hierarchy (CourseInstructor)

**Date**: 2025-12-23
**Status**: Proposed
**Deciders**: Navigator

#### Context
Cần phân cấp: Course Owner (Teacher Master) vs Co-instructors (Teacher Sub)

#### Decision
- Tạo CourseInstructor entity với granular permissions
- Permissions: can_manage, can_view_performance, is_visible, can_grade_assignments
- Revenue share percent per instructor

#### Consequences
- ✅ Flexible permissions
- ✅ Phù hợp SOTA (Udemy model)
- ❌ Backend implementation pending

---

## Pending Decisions

> None - all current decisions accepted.
