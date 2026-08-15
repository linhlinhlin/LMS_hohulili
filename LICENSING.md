# Maritime LMS / HoLiLiHu licensing

Effective for source distributions made from this repository on or after
2026-08-16, Maritime LMS / HoLiLiHu uses a split-license model.

## Ownership record

On 2026-08-16, the project owner confirmed that **Meiiie** owns and controls
the rights needed to license Maritime LMS / HoLiLiHu. **The Wiii Lab** is the
project and brand identity operated by Meiiie. This record does not replace or
remove third-party licenses, contributor attribution, or rights that remain
with their respective owners.

## License map

| Scope | Public license |
| --- | --- |
| Original project material outside `sdk/`, unless a file says otherwise | GNU Affero General Public License v3.0 only (`AGPL-3.0-only`) |
| Material inside `sdk/` with an Apache SPDX header or covered by `sdk/LICENSE` | Apache License 2.0 (`Apache-2.0`) |
| Third-party, vendored, generated, exported, or externally sourced material | Its own license and notices |

The `sdk/` path is a hard licensing boundary. The Spring backend, Angular
application, deployment code, and their internal API clients are part of the
AGPL-covered product unless a file carries an explicit different license.
There is no separately published Apache SDK yet.

Future Apache SDK code must be independently usable as a client/protocol
library, must not import LMS implementation modules, must carry
`SPDX-License-Identifier: Apache-2.0`, and must ship its own `LICENSE` and
`NOTICE` files.

## Rights record

The owner attestation above clears the repository-level ownership gate for
the split-license transition. Supporting private records should still be
retained for commercial diligence, and third-party material remains governed
by its own licenses. See
[`docs/legal/RIGHTS-REVIEW.md`](docs/legal/RIGHTS-REVIEW.md).

## AGPL source availability

If you modify the AGPL-covered program and let users interact with that
modified version over a network, AGPL section 13 requires a prominent offer of
the Corresponding Source. Official web and API releases should point to the
exact source tag or commit used to build them.

## Commercial dual licensing

The AGPL-covered material may also be offered under a separate written
commercial agreement by Meiiie or an expressly authorized representative of
Meiiie. The public repository does not itself grant that commercial license.
See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

The Apache SDK does not require a commercial license for uses already allowed
by Apache-2.0.

## Contributions and trademarks

Contributions to the dual-licensed core must follow
[CONTRIBUTOR-LICENSE-POLICY.md](CONTRIBUTOR-LICENSE-POLICY.md). Code licenses
do not grant rights to the HoLiLiHu, Maritime LMS, or The Wiii Lab names,
logos, or branding; see [TRADEMARKS.md](TRADEMARKS.md).
