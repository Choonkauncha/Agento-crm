# Map clusters and Gemini assistant

Hover or right-click a numbered cluster for Select all addresses or Zoom into area. Tap opens the same menu on touchscreens. Selection respects the existing 80-stop route limit and reports how many homes remain unselected.

The floating mesh orb is available after cloud sign-in. Open it and tap Start voice; allow the browser microphone prompt. Pause disables microphone transmission; End releases microphone/audio resources. Minimize keeps the active conversation running. The sphere uses indexed 3D triangles plus wire edges; deformation follows microphone RMS and actual audio-output analyser levels. A static icon is used when WebGL is unavailable.

Supported map commands:
- “Build a route that takes about two hours.” Travel plus five minutes per house by default; selected addresses take priority, otherwise current filters. Road routing refines the estimate. Review the estimate before starting.
- “Remove [exact address] from my route.” Works while navigating.
- “Start/pause/resume/end navigation.”
- “Select the addresses on this map.” Subject to route capacity.
- “What areas of Ohio have had storms in the last three days?” Queries statewide NOAA/SPC report feeds and active NWS warnings, with source links, report times, missing-source status and preliminary-report caveats.
- “What is my current route?” Fetches fresh personal context and live map state on demand.

Use existing GEMINI_API_KEY, GEMINI_LIVE_MODEL and optional GEMINI_LIVE_VOICE on Vercel. The permanent key stays server-side; a one-use, short-lived constrained token connects the browser to Gemini Live. The same tool declarations are sent with token constraints and the WebSocket setup. No new serverless function or database migration is required.

All map tools re-authenticate using the current Supabase JWT. Map/Coach and relevant Routes/Weather permissions are enforced server-side. Personal context is scoped to the actor; tool-provided user IDs are ignored. Browser route execution checks the current account again after authorization. No arbitrary code, SQL, profile deletion or unrestricted command execution is exposed.

Validation: focused route budgeting, cluster membership, statewide weather parsing, UTC report-day rollover, missing feeds, command allowlisting, current-actor checks, feature denials, ephemeral-token setup, and audio lifecycle tests. Local browser and microphone end-to-end checks could not run because the Chromium download returned an invalid archive. Live Gemini audio still needs a signed-in microphone-capable browser check.


## Shared overlay
The orb loads on every HTML screen, including management, profile, forms, photos, shifts, training, public intake and sign-in. Signed-out visitors see the orb with disabled voice controls. It overlays app modals, while print output omits it. Drag the orb or use Shift + arrow keys; its normalized position is saved on this device and clamped after resize. Route commands on another page open the field map and reauthorize the queued command before execution. Full page navigation releases the current audio session; tap Start voice again on the destination page.
