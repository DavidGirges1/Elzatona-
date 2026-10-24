> Historical launch policy. Superseded by [COMMUNITY_ROLES.md](COMMUNITY_ROLES.md); the old global switch and grant endpoints are retired.

# Controlled material publishing

The launch default is **restricted publishing**. Existing and new students have no publishing or organization approval until an administrator explicitly grants it. Administrators can publish and organize without a student grant. No real student was automatically approved by the migration.

## Approve a student

1. Sign in to the administrator dashboard and open **الطلبة** (`/admin/users`).
2. Find the student by name, username or email; select **صلاحيات المصادر** on their row.
3. Select either or both permissions:
   - **نشر لينكات وملفات PDF وتعديل إضافاته**: add materials and edit the student's own published material.
   - **تنظيم المصادر المنشورة**: create course topics and change titles, descriptions and topic placement of published materials, including other authors' contributions.
4. Enter a reason, confirm, and select **احفظ الصلاحيات**. The change is recorded in the administration audit log. The student must still have a confirmed, active account and complete academic onboarding.

Organization does not grant administrative, moderation, deletion or hiding privileges. Organizers cannot change attribution, resource ownership, files, source URLs, publication status or the course associated with a resource. Cross-course topic assignment is rejected. Organization grants currently cover active courses throughout the platform; grant them only to trusted students.

## Revoke access

Open the same student's permissions, clear the relevant checkboxes, enter a reason and confirm. Subsequent requests immediately use the database decision, even with an existing login session. An already opened submission page cannot bypass revocation. Private pending uploads cannot be newly uploaded or finalized after publishing access is revoked. A student can still remove their own pending object for cleanup; already published material remains available for reading.

If general publishing is open, removing a publisher's explicit approval does not override the global setting. Close general publishing to return to approved-only mode. Organization of other authors' contributions always needs its separate explicit approval.

## Open publishing to everyone later

At the top of **الطلبة**, choose **فتح النشر للجميع**, read the confirmation, enter a reason and confirm. This allows active, confirmed, academically onboarded students to publish and edit their own materials. It does not grant organization of other students' work. **قفل النشر العام** returns to approved-only mode and preserves individual approvals. No redeployment is needed.

## Technical and verification notes

- Migration `20261023232446_controlled_material_publishing.sql` is applied to the hosted project; the local filename matches the hosted migration version. It was initially created through the CLI, then aligned with the MCP-applied version.
- Permission/configuration tables have RLS and SELECT-only grants to authenticated users. Only administrators read configuration; permission records are visible to their owner or an administrator. All writes go through checked, audited admin RPCs. Never use profile metadata for approval.
- The restriction is independent of `can_contribute`, which continues to govern ordinary community interactions. Publishing RPCs, checked edits, Storage INSERT and privileged PDF finalization each enforce the relevant approval.
- Private parameterized authorization helpers are in `elzatona_private`, with no anonymous/authenticated schema access. Public permission reads only return the caller's effective booleans and the public launch-mode flag. Public writes explicitly authenticate and authorize their actor.
- Security advisors report intentional callable `SECURITY DEFINER` entrypoints: the two permission-read wrappers and three checked write RPCs. These are narrowly scoped and covered by denied-access tests; table writes and private helpers remain inaccessible. Advisor references: [anonymous entrypoints](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated entrypoints](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Existing RPC-only/no-policy and password-protection advisory notices remain separate.
- Reopening was tested against the real project inside an isolated transaction that rolled back; the public committed mode stayed restricted. Temporary QA grants/accounts/content are removed after browser verification. Production tests must never open general publishing just to exercise the toggle.
- `tests/material-publishing-hosted.mjs` and `tests/e2e/material-publishing.spec.ts` require explicitly provisioned temporary QA accounts through `TEST_PUBLISHING_ACCOUNTS` and a private `TEST_PUBLISHING_STATE` file. The hosted script also requires `TEST_ALLOW_WRITES=1`. No credentials or test accounts are checked into the repository.
