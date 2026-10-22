# Management refinement and application debugging

Four scoped reviewers covered management design, dashboard workflows, field routes, and API access. A separate security pass reproduced two account-switch races before verifying their fixes.

## Result

- Management sections are grouped by daily work, team and coverage, resources, settings, and field tools. The finder accepts task terms such as password reset, GroupMe, and unassigned inspections. A current-section toolbar explains the destination and offers Book inspection.
- Phones and tablets use a Sections drawer with focus containment, Escape and close controls, search feedback, and focus return. Desktop navigation remains visible and scrollable.
- Coach, feature, scheduling, and account destinations run their loaders. Failed reads have usable retry controls. Invalid hashes fall back safely; browser Back/Forward restores dashboard and nested document views.
- Auth hydration is deferred outside the Supabase auth lock and deduplicated. Account invalidation clears caches and detaches pending refreshes. Late account responses, including impersonation links, cannot be rendered after an identity change.
- Invalid coordinates cannot enter map selections, appended routes, or timed assistant routes. Rejected address saves restore changed fields and optimistic aliases without recording a successful activity.
- Management incoming-message alerts exclude other managers' outgoing replies. Disabled message/shift features skip their underlying field-status reads. Unavailable permission verification fails closed with a retryable 503 response and a bounded timeout.

## Validation

- `npm test`: all 68 scripts passed, including browser, database, permission, rollback, and account-switch regressions.
- `npm run test:management`: passed all sections at 320, 390, 768, and 1440 pixels; search/clear/no-results; drawer/focus/Escape; Back/Forward; malformed links; settings deep links; initial and settings load recovery; and non-admin redirects.
- `npm run test:navigation`: passed setter, sales rep, and admin navigation, permission refresh, return paths, and screen fit.
- `npm run test:scheduling`: passed inspection validation/save/reset, admin-only GroupMe settings, notification audience checks, and address status saves on desktop/phone.
- `npm run test:assistant`: passed authenticated button/voice route build and clear, duplicate tool-call protection, mobile fit, projected mesh fallback, and audio response handling.
- Focused independent security recheck and `git diff --check` passed. Desktop and phone screenshots were visually inspected using synthetic records.

Browser API fixtures use local synthetic accounts and records. Gemini Live protocol tests simulate provider events rather than making a production voice call. Software rendering was used for stable screenshots in the headless environment. No production records were changed and no Supabase migration is required.
