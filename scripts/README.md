# Scripts Guide

This folder contains operational helpers that are useful locally but are not part of the application runtime.

## Folders

- `db/`: database export/import helpers.
- `dev/`: local development convenience scripts.
- `debug/`: one-off debugging helpers such as browser automation capture.

## Usage Notes

- Treat scripts here as operator utilities, not production entrypoints.
- If you add manual verification helpers again, keep them current with the live API version and place them under a dedicated subfolder.
- Generated artifacts from these scripts should stay out of the repository root.
