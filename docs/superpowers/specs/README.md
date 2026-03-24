# Specs Guide

This folder contains design and handoff specs created before implementation.

## Purpose

- capture decisions before code changes start
- preserve reasoning for review and cross-team handoff
- keep proposal-stage work separate from runtime truth

## Important rule

Specs do **not** automatically become source of truth.

Once a feature ships and is verified, the living parts should be promoted into:

- `docs/architecture/`
- `docs/reference/`
- `docs/runbooks/`

## Recent specs

- `2026-03-23-messaging-recipient-discovery-design.md` - scoped people picker, send authorization policy, API contract, and query strategy for LMS messaging
