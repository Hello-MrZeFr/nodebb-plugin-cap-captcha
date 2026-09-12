# nodebb-plugin-cap-captcha 2.3.0

Cap.js protection for NodeBB 4.x login and registration only.

- Server-rendered Cap widget on login/register
- Explicit `<script type="module">` for the configured widget JS, so the browser requests it directly
- Frontend endpoint normalisation prevents duplicated site keys
- Backend verification: POST JSON `{ secret, response }`
- Fail closed: no token, verification failure, HTTP error, timeout, or invalid configuration blocks login/registration
- Post/reply/composer protection intentionally removed
- ACP settings use NodeBB settings.load/save and the standard save button

## 2.3.1
- Refined desktop Chromium widget containment and card sizing.
- Centered the shield icon inside a fixed flex box.
- Added mobile breakpoints without affecting the desktop layout.


## UI
The login and registration pages now render the Cap widget directly without an extra card/container title.
