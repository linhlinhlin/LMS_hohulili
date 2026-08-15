# Maritime LMS / HoLiLiHu licensing

This repository is being prepared for a split-license model. The intended
public policy for source distributions made on or after the licensing
transition is:

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

## Rights-clearance gate

No repository-wide license file existed before this transition, and the Git
history contains multiple human contributor identities. A license notice
cannot grant rights that its issuer does not own or control.

Therefore the first public AGPL release is blocked until the checklist in
[`docs/legal/RIGHTS-REVIEW.md`](docs/legal/RIGHTS-REVIEW.md) is complete.
Until then, the AGPL text expresses the intended license only for material
whose copyright holder or authorized licensor has approved that grant. It
does not override third-party rights.

## AGPL source availability

If you modify the AGPL-covered program and let users interact with that
modified version over a network, AGPL section 13 requires a prominent offer of
the Corresponding Source. Official web and API releases should point to the
exact source tag or commit used to build them.

## Commercial dual licensing

The AGPL-covered material may also be offered under a separate written
commercial agreement by the applicable copyright holder or an authorized
licensor. The public repository does not itself grant that commercial
license. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

The Apache SDK does not require a commercial license for uses already allowed
by Apache-2.0.

## Contributions and trademarks

Contributions to the dual-licensed core must follow
[CONTRIBUTOR-LICENSE-POLICY.md](CONTRIBUTOR-LICENSE-POLICY.md). Code licenses
do not grant rights to the HoLiLiHu, Maritime LMS, or The Wiii Lab names,
logos, or branding; see [TRADEMARKS.md](TRADEMARKS.md).
