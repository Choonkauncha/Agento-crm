# Address actions and inspection scheduling

Every address in the list, map popup, phone sheet, lead drawer, and built route has Answered, No Answer, and Schedule in GroupMe actions. Answered uses the existing `Knocked` database status so reporting remains compatible.

Admins set or clear the team GroupMe link in Management → Scheduling settings (`/admin.html#scheduling`). Only active admin profiles can write that setting; field staff and managers can read it. Only HTTPS links on GroupMe domains are accepted. The schema is in `supabase/migrations/20261021151943_field_scheduling_settings.sql`.

The inspection form guides staff through contact, property, concerns, and schedule/review steps. Save inspection records the homeowner profile and appointment using the existing atomic endpoint. Schedule in GroupMe opens the configured chat and attempts to copy the inspection summary for the user to paste. It does not automatically send a message or save/confirm the appointment. A blank link shows a setup instruction.

Inspection alerts are filtered on the server by the active authenticated profile: admins/managers receive inspection updates, setters/canvassers receive appointments they booked, and sales reps receive appointments assigned to them. Disabled inspection access suppresses appointment alerts. Employee message alerts are restricted to their own thread; management can receive staff threads. Notification tracking resets on account changes and ignores historical appointments on initial load.

Enable browser alerts through Messages → Turn on alerts. In-app banners work while the app is running; background browser notifications depend on browser permission/support. This is not a closed-app push service. Updates poll every 15 seconds, subject to browser background throttling.

Run `npm run test:scheduling` for URL/audience unit checks, executable PostgreSQL RLS tests, authenticated API tests, and synthetic browser flows. The UI harness does not write to production accounts or send GroupMe messages.
