# Users GPS

Open Management → Users GPS. Only an authenticated, active admin or manager can request GPS history. The roster includes active administrators and field staff. Select a user and an Eastern calendar date for visits, sample coverage gaps, and map markers. Historical visits remain reviewable after clock-out; current location sharing does not.

All working roles can clock in to their own account after agreeing to the location notice. Precise GPS is requested while a shift is open and the web app is visible, with fresh readings uploaded about every five seconds. Clock-out, logout, page hiding and permission withdrawal stop the tracker. Browsers and operating systems can pause location while backgrounded or locked; this web implementation cannot guarantee continuous locked-screen tracking. No location is fabricated to fill gaps.

House times are estimates based on actual observations. Current matching defaults: nearest house within 30 metres, GPS accuracy no worse than 25 metres, at least 30 seconds and three observations, and no gap longer than 20 seconds. A second neighboring house within the GPS uncertainty leaves the reading unmatched; a nearby explicit door action can identify the house. Durations end at the last supporting sample rather than assuming time until a later exit or refresh. Coordinates and reported accuracy cannot prove a door knock, conversation or exact property entry. The API pages individual-user history and reports an error rather than silently truncating excessive readings.

The Travis Mackie admin has a separate **View example visits** action for October 23, 2026: six verified existing Mansfield/Lexington houses, 53 example minutes. It does not insert shifts, GPS readings, attendance or productivity records, and cannot be confused with recorded visits. Fixture address evidence is in `gps-address-sources.md`. `GPS_PREVIEW_REP_ID` can explicitly select a different preview admin; otherwise the active admin named Travis Mackie is selected.

## Release order

1. Deploy the API/client changes first. Location writes use `Prefer: return=minimal` so management-only GPS SELECT does not prevent field users from saving locations.
2. Apply `supabase/migrations/20261023222511_users_gps_shift_capture.sql`. It updates own-shift role checks, capture-time validation, locking, history RLS and the history index. Existing member clients remain compatible; admin clock-in requires this migration.
3. Confirm the deployed commit and role-specific access. The migration adds no synthetic records.

`supabase/setup_all.sql` includes the migration for new installations. Existing projects should apply only the new migration.

## Verification

Run `npm run test:gps` for matching, API access, database/RLS and tracker tests. `npm run test:gps:browser` uses mocked auth and API responses without touching production accounts or recording production GPS. It checks roster → user → visits → map, example isolation, mobile navigation, authorization loss and address escaping. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when using an existing Chromium binary.

A phone field check is still needed for real-world accuracy, battery consumption and OS-specific GPS pauses: clock in with permission, remain near one known address over 30 seconds, move to another, then clock out. Check that management receives observations, excludes long gaps and removes the current location on clock-out. Do not use simulated visits as evidence of this field check.
