# Four-layer quality control

This owner request supersedes the former restricted-publishing launch switch and separate global publisher/organizer grants.

| Effective role      | Publishing                                                                     | Review and organization                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary student    | Complete materials are submitted for review; quiz drafts remain private        | Browse, follow, save, vote, discuss and report under existing rules                                                                            |
| Trusted contributor | Own submissions publish immediately; own published metadata/quiz edits allowed | No approval, organization of other authors or admin access                                                                                     |
| Class leader        | Own submissions require another reviewer                                       | Approve/reject other students' submissions and create/rename/reorder topics or organize published metadata, **only in admin-assigned courses** |
| Administrator       | Direct publication and moderation                                              | Assign all four roles/course scopes, review across active courses, monitor accounts/audit/content and use the existing admin dashboard         |

These are four effective roles, not visible public badges. Signup and academic onboarding have no role selector and create no privileged assignment. Roles cannot come from user-editable Auth metadata. Only the administrator UI/checked admin RPC assigns them. An ordinary student is represented by absence of a privilege record. Legacy moderator records are not an effective fifth role; the old global-publishing/grant RPCs are revoked and old flags do not grant access.

## Administration

Open **Admin → الحسابات → تعيين الدور**. Choose the role; for a class leader select one or more explicit active courses. Add a reason and confirm. Current roles and scoped courses are visible only in the administrator account table. Every assignment/revocation is audited. Role/course changes take effect on the next database request, without waiting for JWT refresh. At least one active confirmed administrator must remain; concurrent role changes serialize around this check.

Courses are explicitly assigned; university/year/onboarding do not automatically grant leadership. No real student is promoted by the implementation. Existing explicit publisher grants migrate to trusted status; old organization grants do not invent course assignments.

## Contribution and review

- A normal/leader link is private and submitted immediately. A PDF is private while uploading, then enters the queue **only after managed byte/MIME/size verification**. A quiz has a private draft option; sending for review requires complete validated questions/keys and sharing rights. Trusted/admin submission publishes directly.
- Authors follow progress in **حسابك → إضافاتي وحالة المراجعة**. Rejection reasons are private to the author and eligible reviewers/admins. Authors can edit/re-submit pending metadata and links. Reviewed PDF bytes are immutable; replacing a rejected file means a new submission. Incomplete PDF uploads can be retried safely.
- Reviewers open **مراجعة الإضافات** from their course/profile; admins also have a console navigation link. The queue excludes private drafts, unfinished uploads, out-of-scope courses and a leader's own submissions. A leader can inspect submitted quiz answers and obtain a short-lived scoped PDF preview, without gaining admin access or access to private quiz drafts.
- The reviewer opens the resource, chooses approve/reject and writes a reason. An approval publishes the existing resource URL and preserves its author. A rejection returns it for changes. The reviewer submits the resource version they viewed; author edits invalidate stale approval forms.
- A class leader cannot approve their own post. Another assigned leader or an admin reviews it. This is an intentional quality-control interpretation; trusted status is the role that skips review.
- Approved contributions continue to use the ordinary resource page, guest sharing, secure PDF reader, quiz player, votes, saves, discussions and reports. Normal authors cannot change already approved public material into unreviewed content; trusted authors/admins and scoped metadata organizers retain the stated permissions.
- Leaders do not receive account management, role assignment, global moderation/deletion, cross-course rights, or permission to rewrite another author's quiz keys.

## Technical boundaries

`community_roles` and `class_leader_courses` have RLS and SELECT-only direct grants; checked admin RPCs perform mutations. Existing `user_roles` remains the protected administrator source. Helpers never trust JWT user metadata. Parameterized privileged helpers remain in the unexposed private schema; RLS uses caller-bound public predicates.

Resources carry `review_state` (draft/submitted/rejected/approved), a monotonically increasing submission version and submitted timestamp. `resource_reviews` is an append-only checked decision ledger; its latest-review view uses `security_invoker`. All direct resource/state/role/scope/review writes from browser clients remain denied.

Guest reads/quiz grading/export/open endpoints still require a published resource in an active course/university. Pending PDFs stay in the private bucket. Normal users can insert bytes only for their own prepared draft path; they cannot overwrite/delete a file already submitted for review. Managed finalization rechecks author readiness and current role, so a trusted user revoked during upload is queued rather than auto-published. The managed review service derives reviewer identity from the real access token and verifies an explicit database scope before signing. Already downloaded content/short-lived signed URLs cannot be recalled.

The old `open_to_all` flag stays false/ignored and its former client setters are revoked. This prevents a stale admin page or old API call from bypassing the four-layer system. Private quiz drafts remain available to eligible students.

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for actual migration/deployment identity, automated/hosted/browser results and known limitations. This document describes the implementation; it does not claim those external checks have already completed.
