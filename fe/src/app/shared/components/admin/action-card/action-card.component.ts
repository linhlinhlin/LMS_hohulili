import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shared action card for the admin portal — Stripe / Linear / Vercel pattern.
 *
 * Sibling of `<app-kpi-card>` (PR #174). Where the KPI card is a passive
 * read-only metric, the action card is a clickable navigation tile that pairs
 * a focal number with a labelled CTA (e.g. "Khóa học chờ duyệt → Xem danh
 * sách"). Surfaces previously each had bespoke `.action-card.accent-{warning,
 * primary,success}` markup; this component ends that drift (CC-01 follow-up
 * for the org-admin variant — F-OA-1 in 2026-04-26 mega audit).
 *
 * Anatomy: value (large) + label + CTA link line. Accent only changes the
 * hover border + CTA color; the audit explicitly bars decorative brand icons
 * inside metric cards.
 *
 * The card itself is the `<a>` element so the entire surface is clickable and
 * a single Tab stop receives focus — keyboard users get the same affordance
 * as mouse users (WCAG 2.4.7 + 2.5.8).
 *
 * Usage:
 * ```html
 * <app-action-card
 *   [value]="3"
 *   label="Khóa học chờ duyệt"
 *   linkLabel="Xem danh sách"
 *   routerLink="/org-admin/courses/review"
 *   accent="warning" />
 * ```
 */
export type ActionCardAccent = 'primary' | 'warning' | 'success' | 'error';

@Component({
  selector: 'app-action-card',
  imports: [RouterLink],
  templateUrl: './action-card.component.html',
  styleUrl: './action-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionCardComponent {
  // Caller passes the formatted value (so the card doesn't need to know about
  // pipes or i18n number formatting). Accepts `null` because Angular's
  // `| number` pipe is typed `string | null` even when the source signal is
  // non-nullable.
  value = input.required<string | number | null>();

  // The metric label, e.g. "Khóa học chờ duyệt".
  label = input.required<string>();

  // CTA text rendered with a trailing arrow ("→"). Keep ≤ 4 words so the
  // line stays on a single row at $breakpoint-sm.
  linkLabel = input.required<string>();

  // Target route. Forwarded directly to RouterLink, so an array form is
  // accepted as well at the template binding site (TS-side this stays string
  // for the common case).
  routerLink = input.required<string>();

  // Accent drives the hover border + CTA color. `primary` is the default for
  // neutral / on-brand actions; `warning` for attention-required counts;
  // `success` for healthy state; `error` reserved for destructive surfaces
  // (kept available so future surfaces don't drift).
  accent = input<ActionCardAccent>('primary');
}
