# Maritime LMS / HoLiLiHu licensing

This revision licenses original project material under the MIT License.
On 2026-09-26, the project owner reaffirmed licensing authority and requested
this transition. The license map below applies to revisions containing this
notice; it does not rewrite earlier distributions or third-party licenses.

## Ownership record

On 2026-08-16, the project owner confirmed that **Meiiie** owns and controls
the rights needed to license Maritime LMS / HoLiLiHu. **The Wiii Lab** is the
project and brand identity operated by Meiiie. The 2026-09-26 MIT authorization
covers original material within that authority. It does not remove
third-party rights, contributor attribution, or existing copyright notices.
See [docs/legal/RIGHTS-REVIEW.md](docs/legal/RIGHTS-REVIEW.md).

## License map

| Scope | Public license |
| --- | --- |
| Original project material outside `sdk/`, unless a file says otherwise | MIT License (`MIT`); see [LICENSE](LICENSE) |
| Material inside `sdk/` with an Apache SPDX header or covered by `sdk/LICENSE` | Apache License 2.0 (`Apache-2.0`) |
| Third-party, vendored, generated, exported, or externally sourced material | Its own license and notices |

The Spring backend, Angular application, deployment code, and internal API
clients are covered by MIT unless a file carries an explicit different license.
The frontend distributes the MIT text in `fe/public/LICENSE.txt`; the backend
includes it in `backend/src/main/resources/META-INF/LICENSE`.

The `sdk/` directory remains the Apache-2.0 boundary. There is no separately
published Apache SDK yet. Future SDK code must be independently usable as a
client/protocol library, must not import LMS implementation modules, must carry
`SPDX-License-Identifier: Apache-2.0`, and must ship its own `LICENSE` and
`NOTICE` files. Reused MIT material retains its MIT notices.

## Earlier distributions

Earlier revisions distributed under `AGPL-3.0-only` remain available under
the grants made with those copies. Their recipients' existing rights are not
revoked. The previous root license text is preserved unchanged in
[LICENSES/AGPL-3.0-only.txt](LICENSES/AGPL-3.0-only.txt) as a historical reference;
that archive does not impose AGPL on the current MIT-covered material.

Users deploying or redistributing an earlier AGPL revision must follow the
license of that revision, including the source-offer requirement when applicable.
Use the source revision and notices accompanying a distribution to identify its
terms, rather than assuming every historical release uses the latest license.

## Commercial use and trademarks

MIT permits commercial use and redistribution under its terms; no separate
commercial agreement is required for uses already permitted by MIT.
Optional support or other written agreements are described in
[COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md). Existing agreements remain
subject to their own terms.

Contributions follow [CONTRIBUTOR-LICENSE-POLICY.md](CONTRIBUTOR-LICENSE-POLICY.md).
Code licenses do not grant rights to the HoLiLiHu, Maritime LMS, or The Wiii Lab
names, logos, or branding; see [TRADEMARKS.md](TRADEMARKS.md).
