# ADR-004: Angular Signals-first Adoption for Frontend

## Status

Accepted — 2026-04-24 (retroactive; pattern adopted through S60+, documented now).

## Context

Frontend sử dụng Angular 20.3 với 215+ components và state management phân tán. Trước khi adopt Signals, team gặp các vấn đề sau:

- Zone.js change detection rộng → mỗi event trigger rerender toàn tree → degrade UX trên course editor god components
- RxJS Observable + BehaviorSubject trộn lẫn → memory leak khó trace (`subscribe` quên unsubscribe)
- `@Input` decorator không reactive — phải `ngOnChanges` manual
- Form state split giữa `FormGroup` (RxJS) và local component state → single source of truth không rõ

Angular 17 introduced Signals as experimental; 20 làm stable + toàn bộ reactive primitives.

## Decision

Áp dụng **Signals-first** cho toàn bộ frontend, bao gồm:

1. **Component state**: `signal<T>()` thay vì primitive + manual setter
2. **Derived state**: `computed(() => …)` thay vì RxJS `combineLatest`
3. **Side effects**: `effect(() => …)` thay vì `ngAfterViewInit` + subscriptions
4. **Inputs/outputs**: `input()` / `input.required()` / `output()` thay decorator `@Input`/`@Output`
5. **Queries**: `viewChild()` / `viewChildren()` thay `@ViewChild`
6. **Change detection**: `ChangeDetectionStrategy.OnPush` BẮT BUỘC 100% (đã đạt)
7. **Control flow**: `@if` / `@for` / `@switch` thay `*ngIf`/`*ngFor`/`*ngSwitch`
8. **Standalone components**: mặc định trong Angular 20+ — KHÔNG viết `standalone: true` explicit

## Rationale

| Before | After | Benefit |
|---|---|---|
| Manual `markForCheck()` để trigger rerender | Signal write tự trigger | Ít bug forgot-to-update |
| `combineLatest` + `map` cho derived | `computed(() => a() + b())` | Diff-only recompute |
| `subscribe` + `unsubscribe` trong `ngOnDestroy` | Signal scope tự clean | Không memory leak |
| `@Input` + `ngOnChanges` | `input.required<T>()` | Compile-time required check |
| Zone.js change detection | OnPush + signals → no Zone dependency (future) | Bundle smaller, rerender ít |

## Consequences

### Positive

- 0 legacy pattern còn (100% conversion qua session S60-S80)
- OnPush 100% coverage → rerender nhỏ nhất khi signal thay đổi
- `inject()` thay constructor DI → dễ test, dễ compose
- Template `@if`/`@for`/`@empty` sạch hơn structural directive syntax
- Code-quality markers: 0 TODO/FIXME/HACK trong fe/src (theo audit 2026-04-24)

### Negative

- Learning curve cho dev mới join (khác hẳn Angular pre-17 convention)
- Một số 3rd-party library vẫn export Observable — cần `toSignal()` wrapper
- Test với signal phải `TestBed.flushEffects()` thay `tick()` trong fakeAsync

### Risks

- Angular Signals API còn evolving (20.x → 21.x có thể breaking). Tuy stable nhưng phải theo release notes.
- Coordination với RxJS: RxJS không biến mất — HTTP client, router, form vẫn Observable. `toSignal()` + `toObservable()` là bridge.

## Compliance check khi code review

Reviewer (human hoặc CodeRabbit qua `.coderabbit.yaml`) check:

- [ ] Không có `@Input()` / `@Output()` / `@ViewChild()` decorator trong file mới
- [ ] Không có `standalone: true` trong `@Component` decorator
- [ ] `ChangeDetectionStrategy.OnPush` có trong mọi `@Component`
- [ ] Template không có `*ngIf`/`*ngFor`/`*ngSwitch`
- [ ] State được quản lý bằng `signal()` / `computed()` / `effect()`, không có local `private _foo = false` cho reactive state
- [ ] `CommonModule` chỉ import khi template dùng pipe (`| date`, `| number`) hoặc `[ngClass]` / `[ngStyle]`

## References

- Angular docs: https://angular.dev/guide/signals
- CLAUDE.md §"ANGULAR CONVENTIONS (CRITICAL)" — full list rules
- `.coderabbit.yaml` — path_instructions cho `fe/src/app/**/*.ts`
- Migration story: session S60–S80 (archived in `docs/archive/`)

## Supersedes

Không supersede ADR nào.

## Superseded by

Chưa có — ADR này đang là current standard.
