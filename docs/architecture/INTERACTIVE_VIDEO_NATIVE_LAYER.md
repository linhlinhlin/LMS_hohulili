# Interactive Video Native Layer

Date: 2026-05-06

## Decision

Use a native interactive-video layer on top of the existing Shaka Player runtime.
H5P stays a compatibility and authoring reference, not the learner playback core.

This keeps HoliLihu aligned with the current video stack:

- Adaptive playback remains Shaka Player over HLS/DASH.
- Interactions are stored as a sidecar JSON spec on lesson sections.
- Learner events are captured as LMS learning events, shaped so they can later map to xAPI or Caliper.
- Offline packages keep the interaction spec with the downloaded section.

## Rationale

H5P Interactive Video is still useful as a known UX benchmark, but it carries an older PHP/plugin-centric runtime model. The project already has Angular 20, Shaka Player, offline Dexie storage, signed playback, and a dedicated video pipeline. A native sidecar runtime avoids adding a second playback system and lets us control accessibility, offline sync, analytics, and future branching behavior inside our existing architecture.

Open-source projects can still help:

- H5P can be an import/export target later.
- Shaka Player remains the media engine.
- xAPI Video Profile and IMS Caliper can guide event naming and analytics mapping.

## H5P Boundary

HoliLihu does not load the H5P runtime, H5P editor, or H5P learner player in the
course playback path. H5P support lives at the teacher authoring boundary:

- JSON export writes a HoliLihu bundle plus an H5P Interactive Video parameter subset.
- `.h5p` export writes a zip package with `h5p.json`, `content/content.json`, and a
  HoliLihu sidecar for lossless round-trip of native fields such as graph node targets.
- `.h5p` import reads the HoliLihu sidecar when present, then falls back to standard
  `content/content.json` H5P Interactive Video parameters.

This avoids playback conflicts with Shaka. Shaka still owns DASH/HLS loading, ABR,
offline media, and signed playback. The interactive layer only observes the media
timeline and renders Angular overlays above the existing player.

## Spec V1

`InteractiveVideoSpec` is intentionally small:

```json
{
  "version": 1,
  "enabled": true,
  "timeline": [
    {
      "id": "checkpoint-1",
      "type": "single_choice",
      "atSeconds": 42,
      "title": "Quick check",
      "body": "What should the learner do next?",
      "pause": true,
      "required": true,
      "choices": [
        {
          "id": "a",
          "label": "Check the chart first",
          "isCorrect": true,
          "feedback": "Correct."
        }
      ]
    }
  ]
}
```

Supported initial interaction types:

- `checkpoint`: pause and continue.
- `single_choice`: learner chooses an answer and can see feedback.
- `branch`: learner chooses a target time or target interaction.
- `hotspot`: reserved in the data model for spatial overlays.

## Implemented Slice

- Backend persists `INTERACTIVE_VIDEO` learning events.
- Backend publication snapshots pass `interactiveVideoSpec` from section data to learner responses.
- Frontend API, learning model, offline section model, and download mapping carry the spec.
- Adaptive video player evaluates timeline interactions, pauses when needed, records events online, and queues them offline when browser storage is available.
- Teacher authoring is available in Course Editor -> Curriculum -> VIDEO section -> "Video tương tác".
- The authoring panel supports checkpoints, single-choice prompts, and time-based branch choices for Spec V1.
- Teacher preview reuses the learner overlay inside the editor's video preview without recording learning events.
- Teacher authoring can import/export HoliLihu JSON bundles and `.h5p` zip packages with an H5P Interactive Video parameter subset for interoperability.
- Branch choices can target another interaction node, not only a raw timestamp, which gives the first graph-authoring baseline.
- Learner event payloads include xAPI Video Profile and Caliper-style analytics projections for later LRS/warehouse export.
- The runtime overlay has dialog semantics, ARIA labels, keyboard escape handling for non-required prompts, and focus handoff.
- SSR route extraction is protected from partial `localStorage` shims.

## Non-Goals For This Slice

- Bundling H5P JavaScript library code into exported `.h5p` files.
- Quiz-grade integration.
- Advanced visual novel state graphs.
- SCORM/xAPI LRS export.

## Next Phase

Add richer teacher analytics dashboards, graded quiz integration, a visual graph canvas for large branching scenarios, and optional H5P-host export profiles for sites that require bundled library folders.
