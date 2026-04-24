# Video Worker And Playback Scale Plan

Last updated: 2026-03-20

## Executive summary

The current `R2 + ffmpeg + Shaka` stack is functionally correct for production LMS video, but it has two different scaling problems:

1. `upload -> READY` latency is dominated by worker-side transcoding.
2. many concurrent learners on the same asset are limited by the current backend-mediated playback path.

These are different problems and should be solved with different infrastructure choices.

## What a dedicated video worker VM helps with

A dedicated `video-worker` VM is not only for the upload HTTP request itself.

It primarily helps:

- `ffprobe` / `ffmpeg` / `Shaka` processing after upload finishes
- upload-to-ready latency for teachers
- ingest queue throughput when multiple videos are waiting
- protecting the web/API container from CPU starvation during transcoding
- future async media jobs such as thumbnails, waveform extraction, offline package generation, and bulk exports

It does not materially solve by itself:

- many learners watching the same `READY` video at the same time
- per-segment playback control-plane overhead
- edge caching of adaptive playback assets

## Root cause from production measurements

Production measurements on the current VM show:

- sample input: about `156 MB`, `1080p`
- `Shaka` package local step: about `10s`
- adaptive package upload: about `40s`
- dominant cost: `ffmpeg` transcode

Measured timeline evolution:

- baseline: about `21m22s`
- after `superfast`: about `16m43s`
- after one-pass multi-rendition transcode: about `14m19s`

Conclusion:

- the main bottleneck is CPU-bound transcoding, not learner upload bandwidth
- `Shaka` is part of the stack but not the primary reason the pipeline is slow

## SOTA reference patterns

Official references align with splitting media processing from user-facing serving:

- Google Cloud documents `Managed instance groups (MIGs)` and autoscaling for scalable identical VM workers, rather than packing all workloads onto one instance.
- Google Cloud documents `compute-optimized` machine families as the fit for compute-heavy workloads.
- AWS MediaConvert documents separate queues and concurrent job quotas for media processing, reinforcing the queue/worker separation model.
- Cloudflare documents that `R2 presigned URLs` are tied to the S3 API path, which is why large-concurrency playback eventually needs a different edge-auth design if we want stronger shared caching.

## Recommended target architecture

### Now

- keep web/API and reverse proxy on the current app VM
- keep `video-worker` as a separate runtime role
- dedicated `video-worker` VM is now live on GCP and is the current production truth
- current production topology is:
  - app VM: `e2-medium`
  - worker VM: `e2-standard-4`

Current compromise / debt:

- the production PostgreSQL instance still lives inside the app VM Docker topology
- worker VM connectivity is currently provided through a private-IP host binding / forwarding path on the app VM
- this is acceptable for the current stage, but Cloud SQL or another private managed DB endpoint is still the cleaner long-term direction

### Later

- keep ingest workers as queue-driven compute workers
- move large-concurrency playback toward edge-auth + cacheable media delivery
- keep upload/ingest scale and playback scale as separate concerns

## Recommended worker VM strategy

### Option A — best next step

Create a dedicated VM for `video-worker`.

Suggested starting size:

- `4 vCPU / 8 GB RAM`

Recommended if:

- teachers upload videos regularly
- upload-to-ready latency matters
- the web app must stay responsive during transcodes

### Option B — stronger media box

Use a larger dedicated worker:

- `8 vCPU / 16 GB RAM`

Recommended if:

- multiple long `1080p` videos may ingest at once
- you want headroom to move back from `superfast` toward `veryfast`
- future batch media work is expected

### Option C — temporary budget path

Keep one VM, but increase CPU and memory on that VM and reserve more of it for the worker.

Use only as a short-term step because:

- web and media still compete for CPU
- transcode spikes can still hurt API latency
- this does not create a clean operational boundary

## What should run on the worker VM

Good fits:

- `video-worker`
- future thumbnail/background media tasks
- offline package generation
- other async CPU-bound batch jobs

Not recommended:

- PostgreSQL
- public web backend
- frontend
- latency-sensitive synchronous APIs

## Quality plan

The current `superfast` preset improves teacher wait time, but inflates `SAVER` and `STANDARD`.

Production rule of thumb:

- if worker capacity is tight, keep `VIDEO_FFMPEG_PRESET=superfast`
- once worker CPU is upgraded, benchmark and try moving back toward `veryfast`

Do not change quality policy by intuition.

Use a fixed sample corpus and compare:

- total ingest time
- output file size
- HLS average bandwidth
- visual checks on lecture content and motion-heavy content

## Playback scale plan

### Phase 1 — already started

- short-lived backend cache for manifest reads
- short-lived backend cache for presigned object redirects
- keep tokenized adaptive playback contract stable

This reduces repeated control-plane work but does not remove backend from the hot path.

### Phase 2 — next major step

- introduce a custom media delivery domain
- move authorization closer to the edge
- stop requiring backend participation for every media object fetch

Goal:

- allow stronger shared caching
- reduce backend request amplification during concurrent viewing

### Phase 3 — large concurrency

- move from backend-mediated per-object redirects toward edge-verifiable authorization
- keep manifests and media cacheable under short private policies
- optionally move workers into a managed/autohealed pool

## Concrete rollout plan

### Phase A — infrastructure split

1. provision a dedicated worker VM
2. establish private PostgreSQL connectivity for that VM
3. deploy only `video-worker` there
4. keep the web app on the current VM
5. point both runtimes at the same PostgreSQL and R2 buckets

### Phase B — worker tuning

1. start with:
   - `VIDEO_WORKER_CPU_LIMIT=3.0`
   - `VIDEO_WORKER_MEMORY_LIMIT=3072M`
2. keep `VIDEO_FFMPEG_PRESET=superfast`
3. rerun the same production smoke asset
4. record `upload -> READY` time

### Phase C — quality rebalancing

1. benchmark `superfast` vs `veryfast` on a sample corpus
2. if ingest time stays acceptable on the bigger worker, move toward `veryfast`
3. keep one preset as the production default and document the benchmark

### Phase D — playback scale

1. keep backend cache short-lived and safe
2. design custom media domain + edge-auth path
3. only then load-test concurrent viewing on one asset

## Decision summary

If budget allows only one immediate infrastructure change, the best next move is:

- a dedicated `video-worker` VM

Reason:

- it directly improves the real bottleneck today
- it protects the web app
- it creates the right boundary for future scaling

But it should be treated as:

- an ingest/processing optimization

not as:

- the final answer for large concurrent playback

## Production note as of 2026-03-20

- the dedicated `video-worker` VM has now been rolled out and is the current production truth
- current machine split is:
  - app VM: `e2-medium`
  - worker VM: `e2-standard-4`
- the current DB connectivity path is a private-IP host binding / forwarding path on the app VM
- that compromise is acceptable for the current phase, but Cloud SQL or another private managed DB endpoint is still the cleaner long-term move
- the next infrastructure upgrade, if ingest latency still matters, should be a more compute-heavy worker machine rather than moving media work back onto the web VM

## References

- Google Cloud, `General-purpose machine family`:
  https://docs.cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud, `Compute-optimized machine family`:
  https://docs.cloud.google.com/compute/docs/compute-optimized-machines
- Google Cloud, `Instance groups`:
  https://cloud.google.com/compute/docs/instance-groups/
- Google Cloud, `Autoscaling groups of instances`:
  https://docs.cloud.google.com/compute/docs/autoscaler
- AWS MediaConvert, `Working with on-demand queues`:
  https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-on-demand-queues.html
- Cloudflare R2, `Presigned URLs`:
  https://developers.cloudflare.com/r2/api/s3/presigned-urls/
