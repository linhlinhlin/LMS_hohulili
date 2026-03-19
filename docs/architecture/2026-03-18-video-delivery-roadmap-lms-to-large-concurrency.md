# Video Delivery Roadmap: LMS-grade to Large-concurrency-grade

Date: 2026-03-18
Status: Implementation roadmap

## Goal

Keep the current `R2 + Shaka` stack as the product path for the LMS, then harden it in phases until it can serve larger concurrent viewing patterns with lower backend pressure.

## Principles

- stay on adaptive segmented playback, not direct MP4 delivery
- keep offline as LMS-managed MP4 profiles
- treat backend as control plane, not long-term media hot path
- move toward edge-cacheable media delivery for high concurrency
- prefer measurable phases over a one-shot rewrite

## Phase 1: LMS production hardening

Target:

- stable adaptive playback for normal LMS traffic
- better rendition ladder stability
- explicit player buffer policy

Scope:

- tighten FFmpeg ladder settings
- align keyframe cadence to packaging cadence
- make Shaka buffering / buffer eviction explicit
- keep current signed manifest + redirect model

Deliverables:

- improved encoding settings per rendition
- explicit `bufferBehind` and segment prefetch policy in the player
- regression tests for encoding profile selection

## Phase 2: Large cohort hardening

Target:

- reduce backend pressure when many learners watch the same asset

Scope:

- move media objects to a cache-friendly custom-domain delivery path
- authenticate at the edge instead of presigning every segment URL
- keep entitlement checks in backend only at session/bootstrap time

Deliverables:

- Cloudflare Worker or equivalent edge token validation
- stable media URLs suitable for shared edge caching
- backend removed from the per-segment hot path

## Phase 3: Stream-like operational posture

Target:

- tolerate larger spikes and make playback behavior observable

Scope:

- multi-instance backend deployment
- asset-level playback telemetry
- cache, redirect, and error-rate dashboards
- synthetic load testing and production burn-in

Deliverables:

- scalable runtime topology
- per-asset playback observability
- repeatable load-test scripts and thresholds

## Recommendation

Implement Phase 1 now inside the repo.

Do not claim Stream-grade scale until Phase 2 exists and has been load tested.
