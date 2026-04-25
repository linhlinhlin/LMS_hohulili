import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { trendOf, trendArrow, trendMagnitude } from '../../../utils/trend.util';

/**
 * Shared KPI card for the admin portal — Stripe / Linear / Vercel pattern.
 *
 * One visual language across every admin surface (CC-01 in 2026-04-25 mega
 * audit). Surfaces previously each had their own bespoke `.metric-cell`
 * markup with brand-colored decorative icons; this component ends that drift.
 *
 * Anatomy: value (large) + label + optional sub line + optional trend badge.
 * Variant only changes the accent border / value color, **not** the icon —
 * the audit explicitly bars decorative brand icons inside KPI cards.
 *
 * Usage:
 * ```html
 * <app-kpi-card label="Tổng người dùng" [value]="42 | number"
 *               [trend]="userGrowth.growthRate" trendLabel="so với tháng trước" />
 * <app-kpi-card label="Khóa học chờ duyệt" [value]="3" variant="warning" sub="Cần xử lý" />
 * ```
 */
export type KpiVariant = 'default' | 'warning' | 'success' | 'error';

@Component({
  selector: 'app-kpi-card',
  imports: [],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  // Caller passes the formatted value (so the card doesn't need to know about
  // pipes or i18n number formatting). Pass `'42'` or `'12.500.000đ'`. Accepts
  // `null` because Angular's `| number` pipe is typed `string | null` even
  // when the source signal is non-nullable.
  value = input.required<string | number | null>();
  label = input.required<string>();

  // Sub line — short status text (e.g. "Cần xử lý", "10 đã duyệt").
  // Mutually exclusive with `trend` in practice; if both provided, both render.
  sub = input<string>('');

  // Growth rate as a percentage. When provided (and not undefined), the card
  // renders the ▲ / ▼ / → trend pill before the trend label.
  trend = input<number | undefined>(undefined);
  trendLabel = input<string>('so với tháng trước');

  variant = input<KpiVariant>('default');

  // Computed presentation
  trendKind = computed(() => trendOf(this.trend()));
  trendArrowGlyph = computed(() => trendArrow(this.trend()));
  trendMag = computed(() => trendMagnitude(this.trend()));
  hasTrend = computed(() => this.trend() !== undefined && this.trend() !== null);
}
