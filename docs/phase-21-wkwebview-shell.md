# Phase 21: WKWebView Shell (iOS + tvOS)

| Field    | Value                                                            |
|----------|------------------------------------------------------------------|
| Phase    | 21 (post-V1, platform delivery)                                  |
| Status   | Draft                                                            |
| Date     | 2026-05-15                                                       |
| Author   | ariadne                                                          |
| Impl     | misaka                                                           |
| Depends  | Phase 20.1 (Horizon overlap fix, shipped 2026-05-13). V1 feature set frozen. |
| Unblocks | Apple TV deployment. iPad TestFlight install path that survives Safari lifecycle. |

## 1. Goal

Ship Solari as a native iOS app and a native tvOS app without forking the web codebase. Two thin `WKWebView` shells load the same `index.html` bundle. The web codebase remains canonical; the shells exist to escape Safari's lifecycle limits (tab eviction, background throttling, Add-to-Home-Screen brittleness), to put Solari on Apple TV at all (tvOS has no Safari), and to eliminate the iPadOS status bar -- a 22 px strip of system-rendered time, wifi, and battery glyphs that iPadOS keeps visible in every PWA configuration, no meta tag or accessibility lever overrides it. A native shell can set `prefersStatusBarHidden = true` and own the full 1180x820 stage. For an ambient display whose first design rule is "no dashboard," the status bar is a structural contradiction; the shell is the only fix.

This is a delivery-channel phase, not a feature phase. No new web pixels ship. No new modules ship in `app.js`. The web bundle that lands inside the shell is the same `index.html / app.js / style.css / clockface.html / clockface.js / sw.js / lib/ / data/` tree that GitHub Pages serves. The shells add three things and only three things: full-screen presentation, sleep prevention, and a picker-entry affordance for the Siri Remote on tvOS.

Distribution is TestFlight internal-tester only, single developer, two devices (iPad Air M4, Apple TV 4K). No App Store submission. No external testers.

## 2. SDD References

- SDD Section 9 (burn-in protection, eight layers) -- shell must not regress any of the eight.
- SDD Section 22 (acceptance criteria) -- 7-day continuous runtime, 250 KB bundle target. The shell adds a few KB of native code that does not count against the web bundle; the 250 KB target still applies to the web layer.
- SDD Section 5 (technology constraints) -- vanilla HTML/CSS/JS, no build step, no npm. The shell does not introduce a build step for the web layer; Xcode builds the native shell, the web bundle is copied in as static resources.

## 3. Scope Handoff (from ripley, 2026-05-14)

The following is ripley's scope handoff, embedded verbatim. Sections 4 onward of this spec resolve the open questions, add structure, and translate the handoff into an implementation plan.

### 3.1 Goal (ripley)

Ship Solari as native iOS and tvOS apps without forking the web codebase. One bundle, two thin WKWebView shells, distributed via TestFlight to the user's own iPad Air M4 and Apple TV. The web codebase remains canonical; the shells exist only to escape Safari's lifecycle limits (tab eviction, background throttling, Add-to-Home-Screen brittleness) and to put Solari on Apple TV at all (no Safari on tvOS).

### 3.2 In scope (ripley)

- Single `WKWebView` per target, full-screen, no chrome
- Loads bundled `index.html` (decision pending; see Open Questions)
- `UIApplication.isIdleTimerDisabled = true` (iOS) and tvOS equivalent to prevent sleep
- Reachability monitoring; on network loss the web layer's existing ResilienceManager handles fallback. Shell does not intervene
- tvOS focus engine: Siri Remote long-press substitute for picker entry (long-press on moon/face element)
- Lifecycle hooks: forward `applicationDidBecomeActive` to a JS bridge so `location.reload()` can run after long backgrounding if needed
- WKWebView config: persistent data store, JavaScript enabled, allow inline media, disable text selection and callouts
- Two Info.plist targets diverging on: launch image, icon assets, focus engine entitlements

### 3.3 Out of scope (ripley)

No native UI beyond the WKWebView. No settings screen, native push, IAP, analytics, telemetry, crash reporting, or auto-update beyond TestFlight's built-in mechanism. No App Store submission. No external testers. No keychain, no native storage migration (web localStorage is sufficient via WKWebView persistent data store).

### 3.4 Non-coding prerequisites (ripley)

User must complete before first upload:

- Apple Developer Program enrollment ($99/yr)
- App Store Connect account active
- Two bundle IDs registered (e.g. `com.neocode.solari.ios`, `com.neocode.solari.tvos`)
- Distribution certificate, two provisioning profiles (iOS + tvOS, TestFlight internal)
- iOS app icons: full set per Apple HIG (1024 marketing, plus device sizes)
- tvOS layered icon: front, middle, back layers at 1280x768 and 400x240 (App Icon + Top Shelf)
- tvOS top-shelf image (1920x720 static, or layered)
- Launch screen storyboard (iOS) and launch image (tvOS)
- App Privacy answers (declare: no data collection)
- Export compliance: standard HTTPS only, no custom crypto, file ITSAppUsesNonExemptEncryption=false
- Two App Store Connect app records (one per platform)

### 3.5 Effort estimate (ripley)

For a developer new to native iOS:

- Prerequisites setup: 4-8 h (much of it waiting on Apple)
- Xcode project creation (both targets): 2-4 h
- iOS shell implementation: 4-8 h
- tvOS shell + focus engine wiring: 6-12 h (focus engine is the unfamiliar piece)
- App Store Connect provisioning: 2-4 h
- First TestFlight upload (both targets): 2-6 h (first upload always surfaces signing surprises)
- On-device verification (both devices, 24 h soak): 4-8 h

Total: 24-50 h. With prior native iOS experience, halve everything except prerequisites: 14-28 h.

### 3.6 Open questions for ariadne (ripley)

1. Bundle source: loaded from app bundle resources (offline-first, ship a frozen copy each release) or fetched from `joshuascottpaul.github.io/solari` (live updates, but TestFlight build still needs reinstall every 90 d)? Tradeoff: bundled = deterministic, fetched = no rebuild for web changes.
2. tvOS picker entry: Siri Remote has no long-press-on-element. Options: (a) dedicated Menu/Play-Pause button gesture, (b) focus + long-press on a focusable DOM element, (c) settings deferred to iOS-only. Needs a UX decision.
3. Wake behaviour: on `applicationDidBecomeActive` after long background, reload immediately, or trust the existing 24 h soft-reload? Affects shell-to-JS bridge surface.
4. TestFlight 90 d expiry: is reinstall purely manual, or does the shell surface an in-app reminder near expiry? Recommend manual; flagging for confirmation.
5. Storage parity: confirm WKWebView's persistent data store survives app updates and TestFlight rebuilds, so face selection and observance state are not lost on each quarterly reinstall.

End of ripley's handoff.

## 4. Resolved Open Questions

Each of ripley's five open questions is resolved below with a recommended default and reasoning. The user may override; the defaults stand unless they say otherwise.

### 4.1 Q1: Bundle source -- bundled, not fetched

**Decision: bundle a frozen copy of the web tree into the app's resources. Do not fetch from `joshuascottpaul.github.io/solari` at runtime.**

Reasoning:

- The shell exists to escape Safari's network-dependent lifecycle. Fetching the bundle over the network at boot reintroduces the network as a single point of failure for first paint. The existing `ResilienceManager` handles fetch failure for data APIs, not for the bundle itself.
- TestFlight rebuilds every 90 days anyway. The reinstall cadence already defines a release cadence. Promote that cadence to a feature: each rebuild captures a snapshot of master, and the version overlay (tap the moon disc) shows the bundled build hash and date. This makes "what version am I running" a single source of truth across web and shell.
- A bundled copy makes the app honest about its offline behaviour. The display has never needed the network for first paint on Safari (service worker caches everything); a fetched-bundle shell would weaken that property in the name of avoiding a rebuild that is already required every 90 days for unrelated reasons.
- Bundle size: the entire web tree is well under 1 MB including fonts (`app.js` ~180 KB, `style.css` ~24 KB, `clockface.html/js` ~37 KB, `lib/` ~11 KB, `data/` JSON files). The native shell adds negligible code (one Swift file per target, plus assets). The TestFlight upload is a few MB total.
- Fetched-from-github.io leaks an Apple-platform identifier into GitHub's web logs every boot. Trivial privacy cost, but a real one.

Implementation: the Xcode project's "Copy Bundle Resources" build phase includes the web tree as a folder reference (not a group), so subdirectories like `lib/` and `data/` are preserved. The shell loads `index.html` via `WKWebView.loadFileURL(_:allowingReadAccessTo:)` rooted at the bundled web tree.

What the shell does NOT do: it does not run a local HTTP server. `loadFileURL` reads from the bundle directly. `fetch('data/tides.json')` works against the `file://` origin because the read-access URL covers the full web subtree.

What about live web updates between rebuilds? Acceptable. The user has been running V1 on GitHub Pages and can continue to use Safari on the iPad if they want live updates between rebuilds. The shell intentionally trades that off for lifecycle robustness on tvOS and ATTHS-equivalent stability on iOS.

### 4.2 Q2: tvOS picker entry -- Menu button long-press

**Decision: long-press on the Siri Remote Menu button opens the picker. Single-press of Menu does nothing (intentionally suppressed). The picker is `clockface.html`, the same page the iPad picker uses.**

Reasoning:

- The Siri Remote's focus engine is designed for grids of focusable cards. The Solari display has no focusable elements; the whole stage is a single ambient render. Plumbing the focus engine just to make a DOM element long-pressable is more work than the affordance is worth, and risks introducing focus rings or hover artefacts that violate the calm aesthetic.
- The Menu button is the conventional "go up / settings / back" affordance on tvOS. A long-press is uncommon enough to not collide with system gestures (single-press goes to the tvOS home screen by default; the shell suppresses that single-press behaviour to keep the display in-app).
- Play/Pause was considered. Rejected: Play/Pause has stronger system-level connotations (media playback) and is more likely to be hit accidentally when the remote is in a couch cushion.
- Option (b), focus engine plus long-press on a DOM element, was rejected for the reasons above.
- Option (c), iOS-only picker access, was rejected: the user has stated the Apple TV is a target device, and being unable to change faces on the tvOS install would force them to drive the picker from the iPad and rely on cross-device storage parity that we do not have. The Apple TV install must be self-sufficient.

Implementation: `UIPressesEvent` handling at the view controller level. A 600 ms press on `.menu` opens the picker by calling `webView.evaluateJavaScript("location.href = 'clockface.html';")`. The Solari picker already exists and is keyboard-friendly enough for the Siri Remote's swipe + select model (the picker has touch targets large enough to land on swipe-to-focus). Single-tap of Menu inside the picker page returns to the main display (`location.href = 'index.html';`); the shell intercepts `.menu` short-press inside the picker to do this.

Picker apply: the picker writes to localStorage and the storage event listener triggers `location.reload()`. That mechanism is unchanged. The Siri Remote's swipe-and-click on a face card writes the localStorage key, the listener fires, the page reloads, the new face mounts.

A future V2 may revisit this if the picker proves awkward on the Siri Remote. The fallback is to add a single focusable DOM ring on the moon disc and accept the visual cost on tvOS only. Not in scope for Phase 21.

### 4.3 Q3: Wake behaviour -- trust the existing 24 h soft-reload

**Decision: on `applicationDidBecomeActive`, do nothing in the shell. The web layer's existing 24 h soft-reload (`RefresherCycle` and the daily reload at 03:00) is sufficient. No JS bridge is exposed for wake events.**

Reasoning:

- `WKWebView` with `WKWebsiteDataStore.default()` and `isIdleTimerDisabled = true` keeps the page alive in memory. Foregrounding from background does not unload the page; the rAF loop resumes, the `setTimeout` chain in `ClockModule` self-corrects against `Date.now()` on its next tick. There is no documented case where the web layer becomes wedged after backgrounding inside a WKWebView shell with idle timer disabled on iOS 18.
- The iPad and the Apple TV are both wall-powered and the screens are intended to stay on. Backgrounding only happens if the user explicitly switches apps. Apple TV in particular returns to the last-running app on power-on; the shell will resume in whatever state the web layer was in.
- Adding a JS bridge for wake events expands the shell's surface area. Every additional bridge method is a future failure surface (versioning, message-handler lifetimes, security boundary). The minimum-viable shell has zero bridges.
- The existing `ResilienceManager` already revalidates stale caches on its own poll cadence (15 m weather, 30 m AQI, 6 h tides, 15 m alerts). After even a long background, the next poll catches the data layer up.
- A real bug in this area, if one emerges, has a clear escalation path: add a `WKScriptMessageHandler` that calls `location.reload()` on wake. The escalation is cheap; pre-emptively adding it is feature creep.

Implementation: the shell's `applicationDidBecomeActive` handler is empty (or omitted entirely; the default no-op is fine). The iPad's `RefresherCycle` continues to handle the 03:00 daily refresher; the 24 h soft-reload continues to handle multi-day uptime. The shell adds no wake-time logic.

### 4.4 Q4: TestFlight 90-day expiry -- manual reinstall, no in-app reminder

**Decision: no in-app expiry reminder. The user manages the 90 d TestFlight reinstall cadence manually via TestFlight's own push notifications and the user's calendar.**

Reasoning:

- TestFlight already sends a push notification to the user's iPhone (linked Apple ID) before each build expires. Apple operates this; we do not need to replicate it.
- An in-app banner near expiry would require: a build date written into the bundle, a date check in `app.js`, a banner element in the DOM, CSS for the banner, and a dismissal mechanism. All of that is feature creep on a phase whose explicit goal is to be a thin shell.
- The version overlay already exists (tap the moon disc). It already shows the bundled build hash and deploy date. A user who is curious about expiry can read the build date there. That is sufficient self-service.
- Solari is a single-user app. The user is the same person who manages the Apple Developer enrollment and uploads new TestFlight builds. They will know when 90 days is up.

Implementation: nothing. The shell does not surface an expiry reminder. The web layer's version overlay (`VersionOverlay`) is unchanged.

### 4.5 Q5: Storage parity -- acceptance criterion, not a design decision

**Decision: this is an empirical question, not a design question. The expected behaviour is that `WKWebsiteDataStore.default()` persists localStorage across app updates and TestFlight rebuilds. Verify on-device before merge.**

Reasoning:

- Apple documents `WKWebsiteDataStore.default()` as a persistent store. Non-default (`.nonPersistent()`) data stores are ephemeral; the default store is not. Both iOS and tvOS use the same `WKWebsiteDataStore` API.
- The storage survives app foregrounding, app termination, device reboot, and OS updates. The behaviour on TestFlight reinstall (90 d cycle) is the empirical question: TestFlight uninstalls and reinstalls the app on rebuild. App-container data is preserved across updates from the same App Store Connect record; this includes the `WKWebsiteDataStore` default backing store.
- The risk case is a bundle-ID change or signing-identity change between rebuilds, which would cause iOS to treat the new build as a different app and start a fresh container. The fix is to keep the bundle ID stable across all rebuilds. This is a discipline rule for the developer, not a design decision.

Implementation: written as an acceptance criterion (see Section 11). Manual test: install build N, change face from Calm to Mechanical via the picker, install build N+1 from TestFlight (a fresh upload, not a delta update), launch, confirm Mechanical is still active. Repeat with a tweak (accent change) and an observance custom date. Test on both iPad and Apple TV separately.

## 5. Architecture

The shell is a single full-screen `WKWebView` in a single view controller. No native UI. No tab bars, navigation bars, status bars, or system chrome. The web layer is identical to what runs on Safari today; nothing in `app.js` or `style.css` or any other web file changes for this phase.

```
+-------------------------------------------------+
|  iOS / tvOS app process                         |
|                                                 |
|  +-------------------------------------------+  |
|  |  Native shell (Swift, ~200 LOC per target)|  |
|  |  - SolariViewController                   |  |
|  |  - WKWebView (full screen, no chrome)     |  |
|  |  - isIdleTimerDisabled = true             |  |
|  |  - tvOS only: UIPressesEvent handling for |  |
|  |               Menu long-press -> picker   |  |
|  +-------------------+-----------------------+  |
|                      |                          |
|                      | loadFileURL              |
|                      v                          |
|  +-------------------+-----------------------+  |
|  |  Bundled web resources (folder reference) |  |
|  |  - index.html                             |  |
|  |  - clockface.html                         |  |
|  |  - app.js (180 KB)                        |  |
|  |  - clockface.js (26 KB)                   |  |
|  |  - style.css (24 KB)                      |  |
|  |  - sw.js (service worker, registers but   |  |
|  |    has no role inside WKWebView; harmless)|  |
|  |  - lib/{suncalc.js, perlin.js}            |  |
|  |  - data/{almanac.json, tides.json,        |  |
|  |    alerts.json}                           |  |
|  |  - manifest.json                          |  |
|  +-------------------------------------------+  |
|                                                 |
+-------------------------------------------------+
```

The shell does not run an HTTP server. `WKWebView.loadFileURL(indexURL, allowingReadAccessTo: webRootURL)` serves files directly from the bundle. The origin inside the WebView is `file://` rooted at the bundled web tree.

A note on the service worker: `sw.js` registers on `index.html` boot and provides Safari's network-first cache for the GitHub Pages install. Inside `WKWebView`, service workers are supported (iOS 14+, tvOS supports `WKWebView` service workers as well), but the cache layer is redundant because the web tree is already in the bundle and loaded via `file://`. The service worker registration is harmless; it caches `file://` responses to an extent and provides no benefit. Leave it. Removing the registration is a `app.js` edit, which is out of scope for Phase 21.

## 6. File Layout

The Xcode project lives in a new sibling repository or a sibling top-level directory. Recommendation: keep it in the same repository under `ios/`, with the web tree continuing to live at the repo root. This keeps the version overlay's "build hash" honest -- the same git SHA covers both the web bundle and the shell that wraps it.

```
solari/                              <- existing repo root
  index.html                         <- web entry (unchanged)
  app.js
  style.css
  clockface.html
  clockface.js
  sw.js
  lib/
  data/
  manifest.json
  icons/
  docs/
    phase-21-wkwebview-shell.md      <- this spec
  ios/                               <- NEW Phase 21
    Solari.xcworkspace/              <- workspace containing both targets
    Solari-iOS/
      Solari-iOS.xcodeproj
      Solari-iOS/
        AppDelegate.swift
        SceneDelegate.swift
        SolariViewController.swift   <- ~80 LOC, WKWebView setup
        Info.plist
        LaunchScreen.storyboard
        Assets.xcassets/
          AppIcon.appiconset/        <- iOS icon set
        Solari-iOS.entitlements
    Solari-tvOS/
      Solari-tvOS.xcodeproj
      Solari-tvOS/
        AppDelegate.swift
        SolariViewController.swift   <- ~120 LOC, adds Menu long-press
        Info.plist
        LaunchImage.png
        Assets.xcassets/
          App Icon & Top Shelf Image.brandassets/   <- tvOS layered icon
        Solari-tvOS.entitlements
    SharedShell/                     <- shared Swift sources
      WebViewConfiguration.swift     <- WKWebViewConfiguration factory
      WebRootURL.swift               <- resolves the bundled web tree URL
    README.md                        <- build, sign, upload instructions
```

`SharedShell/` is included via "Add files to project" in both Xcode targets, not as a static library. A static library is more apparatus than this code volume justifies. The whole native codebase is on the order of 400 LOC; sharing source files directly is cleaner than maintaining a library target.

The web tree is referenced from each Xcode target as a *folder reference* (blue folder in Xcode), not a group (yellow folder). Folder references preserve the directory structure under `lib/` and `data/` at copy time, which is required for `fetch('data/tides.json')` to resolve. To set this up: in Xcode, drag the repo root's web files into the target, choose "Create folder references" rather than "Create groups". The target's "Copy Bundle Resources" build phase will then mirror the directory structure at build time.

Risk: a folder reference picks up any new file added to the directory. Acceptable: the repo's top-level is already curated and the `.gitignore` covers transient state. Screenshot directories under `screenshots/` should NOT be added to the target -- exclude them at the folder-reference step by referencing individual files (`index.html`, `app.js`, etc.) plus the `lib/` and `data/` folders, rather than the repo root.

Concrete list of files to include in the iOS and tvOS targets' "Copy Bundle Resources" phase:

- `index.html`
- `clockface.html`
- `app.js`
- `clockface.js`
- `style.css`
- `sw.js`
- `data.js`
- `manifest.json`
- `lib/` (folder reference)
- `data/` (folder reference)
- `icons/` (folder reference, even though it is currently empty)

Notably excluded:

- `screenshots/`, `tests/`, `design_handoff_clockface/`, `docs/`, `.github/`, `.claude/`, `.git/`, the SDD `.docx`, `CLAUDE.md`, `README.md`, `todo.md`.

## 7. Implementation Plan

The plan is sequenced so each step is independently verifiable. Misaka picks up from Section 7 forward.

### 7.1 Prerequisites (user, not misaka)

These must be complete before the implementation pass starts. They are listed in ripley's Section 3.4 and are restated here for sequencing:

- Apple Developer Program enrollment active.
- App Store Connect account active, two app records created (one for iOS, one for tvOS).
- Two bundle IDs registered: `com.neocode.solari.ios` and `com.neocode.solari.tvos`. The exact strings are not load-bearing; the discipline rule is that they remain stable across all rebuilds (see Section 4.5).
- Distribution certificate issued and installed in the developer's keychain.
- Two TestFlight internal-test provisioning profiles downloaded and installed.
- Asset set prepared:
  - iOS: full app icon set per Apple HIG, plus a 1024 px marketing icon. Launch screen storyboard (a black background suffices; Solari's first paint is already near-black, so a black launch screen avoids a flash).
  - tvOS: layered App Icon (front, middle, back layers at 1280x768 and 400x240), top-shelf image (1920x720, can be a static black or a frozen render of the Calm face).
- App Privacy answers prepared: no data collection. Solari does not collect, store, or transmit user data of any kind.
- Export compliance: `ITSAppUsesNonExemptEncryption = false` in both Info.plist files. Solari uses only standard HTTPS for the public APIs (Open-Meteo, DFO IWLS, EC weather.gc.ca); no custom crypto.

### 7.2 Xcode project creation

Create a workspace at `ios/Solari.xcworkspace` containing two app targets. Each target has its own `.xcodeproj`, its own bundle ID, its own Info.plist, its own asset catalog, and its own provisioning profile.

Target settings (both iOS and tvOS, except where noted):

| Setting                             | Value                                             |
|-------------------------------------|---------------------------------------------------|
| Deployment Target (iOS)             | iOS 18.0                                          |
| Deployment Target (tvOS)            | tvOS 18.0                                         |
| Device Family (iOS)                 | iPad only (do NOT include iPhone)                 |
| Supported Orientations (iOS)        | Landscape Left, Landscape Right (NOT portrait)    |
| Status Bar Style                    | `.lightContent`, hidden                           |
| Requires Full Screen (iOS)          | YES                                               |
| Allow Multi-Window (iOS)            | NO                                                |
| Hide Status Bar (iOS)               | YES                                               |
| Background Modes                    | None                                              |
| Entitlements                        | None (no push, no background fetch, no iCloud)    |

Note on iOS device family: iPhone is explicitly excluded. The Solari layout is a fixed 1180x820 stage and is calibrated for the iPad Air M4 in landscape. An iPhone install would render the stage at a small scale with letterboxing, which is not a supported use case. Excluding iPhone from the device family avoids the App Store Connect record needing iPhone screenshots (which we do not have) and prevents the user from accidentally installing the build on an iPhone.

Note on orientations: portrait is excluded. The stage scaling code in `app.js` (`Stage` module) computes `--stage-scale` from viewport dimensions on boot and resize. In portrait, the 1180x820 stage would be downscaled aggressively, producing tiny type. This is not a supported orientation.

### 7.3 SharedShell sources

Two Swift files in `ios/SharedShell/`, added to both targets:

**`WebRootURL.swift`** -- resolves the bundled web tree URL.

```swift
import Foundation

enum WebRootURL {
    static func indexURL() -> URL? {
        // index.html lives at the bundle root because the web files are
        // added as folder references at the top level of the bundle.
        return Bundle.main.url(forResource: "index", withExtension: "html")
    }

    static func readAccessRoot() -> URL? {
        // Read access must cover the entire bundle so file:// fetches of
        // app.js, style.css, lib/*, and data/* succeed.
        return Bundle.main.bundleURL
    }
}
```

**`WebViewConfiguration.swift`** -- builds the `WKWebViewConfiguration` used by both targets.

```swift
import WebKit

enum WebViewConfiguration {
    static func make() -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()

        // Persistent data store. localStorage and IndexedDB survive
        // app updates and TestFlight rebuilds via this store.
        config.websiteDataStore = WKWebsiteDataStore.default()

        // Allow JS (default true; stated explicitly for the record).
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        // Disable iOS-style text selection and callouts (long-press
        // selection menus). Solari's long-press on the moon disc is a
        // picker affordance, not text selection; the system callout
        // would compete with it.
        config.preferences.isElementFullscreenEnabled = false
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        // Inline media (not strictly needed; no video in V1, but harmless).
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        return config
    }
}
```

The text-selection disable is reinforced via CSS in the view controller's setup step (apply `user-select: none; -webkit-touch-callout: none;` to the body via a `WKUserScript`). This is cleaner than editing `style.css` for an iOS-shell concern.

### 7.4 iOS shell (`Solari-iOS`)

`SolariViewController.swift` (iOS target):

```swift
import UIKit
import WebKit

final class SolariViewController: UIViewController {
    private var webView: WKWebView!

    override func loadView() {
        let config = WebViewConfiguration.make()

        // Inject a user script to disable text selection and callouts.
        let css = "html, body { -webkit-user-select: none; -webkit-touch-callout: none; }"
        let js = """
        (function() {
          var style = document.createElement('style');
          style.innerHTML = '\(css)';
          document.documentElement.appendChild(style);
        })();
        """
        let userScript = WKUserScript(
            source: js,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(userScript)

        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Prevent iPad from sleeping. This is the core of the shell.
        UIApplication.shared.isIdleTimerDisabled = true

        if let indexURL = WebRootURL.indexURL(),
           let accessRoot = WebRootURL.readAccessRoot() {
            webView.loadFileURL(indexURL, allowingReadAccessTo: accessRoot)
        }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
}
```

`AppDelegate.swift` is standard scene-based UIKit boilerplate. `SceneDelegate.swift` instantiates `SolariViewController` as the root view controller. No deep links, no state restoration, no URL handlers.

Background colour: the WKWebView background is set to `.black` and `isOpaque = false`. This prevents the white flash that WebKit sometimes paints during the file-URL load. The web layer paints `#0a0a0a` near-black via `style.css` body rule; the moment the page lays out, the WebView background is hidden under the web layer.

Scroll: explicitly disabled (`scrollView.isScrollEnabled = false`, `bounces = false`). The display has no overflow content; disabling scroll prevents accidental rubber-band drag at the edges.

### 7.5 tvOS shell (`Solari-tvOS`)

`SolariViewController.swift` (tvOS target) adds Siri Remote handling. The base setup is otherwise the same as iOS:

```swift
import UIKit
import WebKit

final class SolariViewController: UIViewController {
    private var webView: WKWebView!
    private var menuPressStart: Date?
    private let longPressThresholdSec: TimeInterval = 0.6

    override func loadView() {
        // Same WKWebView setup as iOS (shared logic could move to a
        // helper to reduce duplication; left explicit for clarity).
        let config = WebViewConfiguration.make()
        // (text-selection script injection identical to iOS)
        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        UIApplication.shared.isIdleTimerDisabled = true
        if let indexURL = WebRootURL.indexURL(),
           let accessRoot = WebRootURL.readAccessRoot() {
            webView.loadFileURL(indexURL, allowingReadAccessTo: accessRoot)
        }
    }

    // tvOS press handling.

    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        for press in presses {
            if press.type == .menu {
                menuPressStart = Date()
                return  // do NOT call super; suppress default menu behaviour
            }
        }
        super.pressesBegan(presses, with: event)
    }

    override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        for press in presses {
            if press.type == .menu, let start = menuPressStart {
                let duration = Date().timeIntervalSince(start)
                menuPressStart = nil
                handleMenuRelease(durationSec: duration)
                return  // suppress default menu behaviour
            }
        }
        super.pressesEnded(presses, with: event)
    }

    override func pressesCancelled(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        for press in presses {
            if press.type == .menu {
                menuPressStart = nil
                return
            }
        }
        super.pressesCancelled(presses, with: event)
    }

    private func handleMenuRelease(durationSec: TimeInterval) {
        if durationSec >= longPressThresholdSec {
            openPicker()
        } else {
            returnFromPickerIfNeeded()
        }
    }

    private func openPicker() {
        let js = "window.location.href = 'clockface.html';"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func returnFromPickerIfNeeded() {
        // Short-press of Menu inside the picker returns to the display.
        // Outside the picker, short-press is a no-op (we are not
        // returning to the tvOS home screen; that is the whole point
        // of suppressing the default).
        let js = """
        (function() {
          if (window.location.pathname.indexOf('clockface.html') !== -1) {
            window.location.href = 'index.html';
          }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
```

Press handling subtleties:

- `pressesBegan / pressesEnded / pressesCancelled` for `.menu` must always be intercepted and never forwarded to `super`. Forwarding `.menu` to super calls `dismiss(animated:)` or exits to the tvOS home screen, which is not what we want.
- The 600 ms threshold matches the iPad picker's long-press threshold for parity. The user's muscle memory is one mental model across both devices.
- `.select` (the click-touch on the Siri Remote trackpad) is forwarded to super by default, which lets the WebView translate it into a tap on whatever DOM element is under the focused position. Inside the picker, this is how face cards are selected. On the main display, there is nothing focusable, so `.select` does nothing visible -- which is the desired behaviour.
- `.playPause`, `.upArrow`, `.downArrow`, `.leftArrow`, `.rightArrow` are all forwarded to super. The picker may eventually want to interpret arrow keys as card navigation; for now, the WebView's default behaviour is adequate.

Focus engine: `WKWebView` on tvOS participates in the focus engine. Focusable DOM elements (links, buttons, elements with `tabindex >= 0`) become focusable cards. The picker page already has clickable face cards (`<div class="face-card">` etc.); these need `tabindex="0"` added so the focus engine sees them. This is a small `clockface.html` edit and is the only web-layer change Phase 21 makes. The edit is:

```html
<!-- clockface.html: each face card gains tabindex="0" -->
<div class="face-card" data-face-id="calm" tabindex="0">...</div>
```

`tabindex="0"` is harmless on iPad Safari (it makes the element keyboard-focusable, which is invisible in normal touch use). On tvOS, it makes the element navigable via the Siri Remote's swipe gesture. This is the cleanest possible focus integration: a five-attribute edit that does nothing on iOS and is essential on tvOS.

The picker's existing CSS hover styles already provide focus feedback. If the focus ring is visually distracting on tvOS, the picker's CSS can suppress `:focus { outline: none }` on a tvOS-specific media query (the picker can read the user agent to detect tvOS, but a simpler approach is to leave the focus ring in place; the picker is rarely visited and the focus ring is functional). This is a follow-up tuning item, not a Phase 21 gate.

### 7.6 Info.plist and asset catalog

iOS `Info.plist` highlights:

- `UIRequiresFullScreen` = YES
- `UISupportedInterfaceOrientations` = `UIInterfaceOrientationLandscapeLeft`, `UIInterfaceOrientationLandscapeRight`
- `UIStatusBarHidden` = YES
- `UIStatusBarStyle` = `UIStatusBarStyleLightContent`
- `UILaunchStoryboardName` = `LaunchScreen`
- `ITSAppUsesNonExemptEncryption` = NO
- `NSAppTransportSecurity` = (default; allows HTTPS, denies cleartext HTTP -- all Solari external APIs are HTTPS)
- No `NSAppleMusicUsageDescription`, no camera/mic/location strings -- the shell does not request any of these permissions.
- No URL schemes, no document types, no associated domains.

tvOS `Info.plist` highlights:

- `UIRequiresFullScreen` = YES (implicit on tvOS)
- No orientation keys (tvOS is landscape-only by definition)
- `TVTopShelfImage` (if using a static top-shelf image) or `TVTopShelfImageWide` for layered top-shelf
- `ITSAppUsesNonExemptEncryption` = NO

Asset catalogs:

- iOS `AppIcon.appiconset`: full set (20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt at 2x and 3x, plus 1024pt marketing icon).
- tvOS `App Icon & Top Shelf Image.brandassets`: layered icon at small (400x240) and large (1280x768), top shelf image (1920x720 static or layered).

The user supplies all icon assets. Recommendation for the icon design: a flat black square with a single off-white circle at upper-right (echo of the moon disc on the Calm face). Minimal, recognisable, calm.

### 7.7 Build, sign, upload

For each target:

1. Archive: Product > Archive in Xcode. The archive should validate without errors. Common first-time issues: missing provisioning profile (re-download from developer.apple.com), missing icon size (Xcode reports specifically which size), code-signing identity mismatch (select the distribution certificate in target settings).
2. Distribute: Window > Organizer > Archives > Distribute App > App Store Connect > Upload. Choose the matching app record. The upload runs Apple's automated checks (notarization-equivalent for iOS apps).
3. TestFlight: in App Store Connect, navigate to the app record, TestFlight tab. The new build appears within 10-30 minutes. Add it to the internal test group (the developer themselves is the only tester). The build status moves from "Processing" to "Ready to Test".
4. Install: on the iPad and Apple TV, the TestFlight app shows the new build. Install.

First-time signing surprises (per ripley's estimate, this is the 2-6 h "first upload" budget) typically include:

- Bundle ID typo between Xcode and App Store Connect (the strings must match exactly).
- Provisioning profile not refreshed after adding the device UDID.
- Asset catalog complaints about missing icon sizes (especially tvOS's layered icon; Apple is strict).
- Export compliance prompt at first upload; answer "No" to "uses non-standard crypto".

### 7.8 On-device verification

After install, verify in this order on each device:

1. App launches. First paint within 3 s on iPad Air M4 (the same target as Safari). The launch storyboard is a black screen, so there is no visible flash.
2. Default face renders (Calm, since fresh install has no localStorage).
3. Tap the moon disc on iPad (or long-press the trackpad-equivalent area on tvOS, focused on the moon-disc element). Version overlay appears, shows build hash and date.
4. Long-press the moon disc on iPad: picker opens. Long-press the Menu button on tvOS: picker opens.
5. Pick Mechanical, tap Apply. Picker writes localStorage, storage event fires, page reloads, Mechanical face renders.
6. Tap moon disc again. Version overlay shows the same build hash (no rebuild happened).
7. Force-quit the app. Relaunch. Mechanical is still active (storage parity, first-quit case).
8. Wait 24 h with the app active. Verify the 03:00 refresher runs (the screen fades to mid-grey for 30 s, then returns to the active face).
9. Wait 7 d. Verify the soft reload at 24 h boundaries continues to function (page state is fresh; uptime resets in the version overlay).
10. Upload a second build (no changes, just an incremented build number). Install via TestFlight. Confirm face selection survives (Section 4.5).

## 8. AppState and Web Layer Changes

The web layer is unchanged for Phase 21 except for one five-attribute edit:

- `clockface.html`: each `<div class="face-card">` gains `tabindex="0"` so the tvOS focus engine can navigate them.

That is the entire web-layer surface for Phase 21. No `app.js` edit. No `style.css` edit. No new modules. No new AppState slices. No new CONFIG entries.

The `VersionOverlay` (tap moon disc) continues to read the build hash from the GitHub API. On a bundled-shell install with no network, the GitHub API call fails and the overlay falls back to "unknown" or the cached value. This is acceptable: the bundled build's identity is the TestFlight build number visible inside the TestFlight app, not the web-layer git hash. If the user wants a stable in-app version string for the bundled build, a follow-up phase can add a `window.SOLARI_BUILD = { ... }` constant injected at bundle time. Not in scope for Phase 21.

## 9. Burn-in Protection Implications

The eight burn-in protection layers (SDD Section 9) are all entirely web-layer behaviours. The shell does not regress any of them, because the shell does not render anything except the WebView. Specifically:

| Layer | Mechanism                                | Status under Phase 21 shell                                  |
|-------|------------------------------------------|--------------------------------------------------------------|
| 1     | Per-element Perlin drift                 | Unchanged. Runs inside WKWebView identically to Safari.      |
| 2     | Pixel-shift safety net (+/- 4 px / 6 min)| Unchanged.                                                   |
| 3     | Kinetic slot churn                       | Unchanged.                                                   |
| 4     | Macro position shifts                    | Unchanged.                                                   |
| 5     | Sky-color modulation                     | Unchanged.                                                   |
| 6     | Luminance breath                         | Unchanged. CSS `filter: brightness(var(--lum-mod))` works in WKWebView identically to Safari. |
| 7     | Daily refresher at 03:00                 | Unchanged. The `setTimeout`-based scheduler runs inside the WebView; the shell's `isIdleTimerDisabled = true` is what makes this possible 24/7 on the iPad. |
| 8     | Rendering hygiene                        | Unchanged.                                                   |

One Phase-21-specific risk to flag: tvOS has known historical issues with `WKWebView` and `requestAnimationFrame` throttling when the WebView is partially occluded or backgrounded. Inside a full-screen single-WebView app this should not occur, but if `DriftEngine`'s rAF loop is observed to drop ticks on the Apple TV under load (e.g. during a system update download), the fallback is to widen the `setTimeout` self-correction tolerance in `ClockModule`. This is a "if it happens" fix, not a pre-emptive one.

## 10. Reliability and Failure Modes

What can go wrong over 7+ days and how the shell responds:

| Failure                                              | Web-layer response             | Shell response                                                    |
|------------------------------------------------------|--------------------------------|-------------------------------------------------------------------|
| Network drops for hours or days                      | ResilienceManager serves cache | No action. WebView stays loaded; the next poll catches up.        |
| iPad backgrounds itself (user accidentally swipes up)| N/A                            | `applicationDidBecomeActive` returns; rAF resumes; clock self-corrects.|
| Apple TV reboots overnight (system update)           | N/A                            | tvOS auto-relaunches the foreground app. Solari boots fresh, reads localStorage, mounts the active face. |
| WebView crashes (out-of-memory)                      | N/A                            | iOS reloads the WebView automatically (`WKWebView` has built-in process-recovery in iOS 18). Solari boots fresh, reads localStorage.|
| TestFlight build expires (90 d)                      | App becomes unlaunchable       | User reinstalls from TestFlight. App-container data preserved (assuming bundle ID stable).|
| User accidentally taps Menu on tvOS                  | N/A                            | Short-press: no-op. Long-press: picker opens. Either is recoverable. |
| WebView fails to load index.html (bundle corruption) | N/A                            | Blank black screen. Reinstall required. Detectable: the screen stays black past 3 s, which is past every observed first-paint time. |
| Apple removes the app from TestFlight                | N/A                            | User reinstalls a previous build from local archive, or rebuilds from source. Not in our control. |

Known limits the shell does not solve:

- The web layer's 24 h soft-reload assumes wall-clock progress. If the iPad's clock is manually skewed (e.g. by a stale NTP sync), the reload schedule shifts. Not a shell problem.
- Service worker inside a `file://` origin behaves differently than inside an `https://` origin; specifically, `Cache API` may behave differently. The web layer does not depend on the service worker for first paint inside the shell (the bundle is local), so this is harmless.

## 11. Acceptance Criteria

Phase 21 ships when all of the following are verified on the actual iPad Air M4 and Apple TV 4K target devices.

1. iOS shell builds, archives, and uploads to TestFlight without warnings. Build version is incremented from any prior build. Bundle ID is stable at the chosen value.
2. tvOS shell builds, archives, and uploads to TestFlight without warnings. Build version is incremented. Bundle ID is stable at the chosen value (distinct from the iOS bundle ID).
3. Both apps install via TestFlight on their target devices within 10 minutes of upload completion.
4. iOS launch-to-first-paint is under 3 s. tvOS launch-to-first-paint is under 5 s. (tvOS has a slightly slower file-system seek profile; the higher target reflects this.)
5. Both apps stay awake indefinitely. The iPad does not auto-lock; the Apple TV does not enter screen saver. (Apple TV screen saver is a separate concern handled by tvOS settings; the shell's `isIdleTimerDisabled` may not fully override the system screen-saver timeout. Pre-acceptance check: set the Apple TV screen-saver timeout to "Never" in Settings > General > Screen Saver. Document this as a one-time device configuration step.)
6. On iPad: tap the moon disc opens the version overlay; long-press (600 ms) opens the picker.
7. On Apple TV: short-press Menu inside the display does nothing visible (no exit to home screen). Long-press Menu (600 ms) opens the picker. Short-press Menu inside the picker returns to the display.
8. Face selection from the picker writes localStorage and reloads the page on both platforms.
9. Face selection survives:
   - app foreground/background cycle
   - device reboot
   - app update (bump build number, re-upload, reinstall)
   - 90 d TestFlight reinstall (verified on the second reinstall cycle, or simulated by uninstalling and reinstalling from the same TestFlight build record)
10. The version overlay (tap moon disc) renders. On the bundled-shell install with no network or after the GitHub API call fails, the overlay shows the cached/last-known hash gracefully (no crash, no infinite spinner).
11. 72 h yuki endurance soak on iPad: heap stable, DOM count stable, no fetch failures unhandled by ResilienceManager, burn-in oscillation visibly active (drift visible to a 5-frame-difference compare).
12. 72 h yuki endurance soak on Apple TV: same heap/DOM/fetch/oscillation checks, repeated on tvOS. tvOS is a new platform for Solari; this run is non-optional.
13. Hermione's review confirms the shell does not regress any of the eight burn-in layers (Section 9).
14. The web bundle inside the shell is byte-identical to the master branch at the time of build, except for the `tabindex="0"` addition to face cards in `clockface.html`. This is the only intentional difference.
15. Bundle size: the web bundle remains under the 250 KB SDD target (the `tabindex` edit is a few bytes). The native shell adds approximately 50-100 KB of compiled Swift code, which is a separate ledger and does not count against the 250 KB web target.
16. App Privacy nutrition label declares "no data collected" on both platforms.

## 12. Pipeline Plan

Phase 21 is not a face-level phase, so chihiro and coraline are not invoked.

| Agent      | Runs? | What they produce / verify                                                                |
|------------|-------|-------------------------------------------------------------------------------------------|
| ripley     | Done  | This phase's scope handoff (Section 3).                                                   |
| chihiro    | No    | No new web pixels. No design decisions to lock.                                           |
| ariadne    | Done  | This spec.                                                                                |
| misaka     | Yes   | Xcode workspace, two targets, SharedShell sources, `tabindex` edit. Builds and uploads to TestFlight. |
| mikasa     | Yes   | Simplifies the Swift sources. Targets: shared logic deduplication, unused imports, premature abstractions. |
| hermione   | Yes   | Code review on the Swift shell. Verifies the burn-in layer table (Section 9) holds under WKWebView. Audits bundle size of the web tree (the `tabindex` edit alone). |
| shizuku    | Yes   | Updates CLAUDE.md to add Phase 21 to the Phase Status list. Adds a "Native shell" subsection under Architecture noting the iOS/tvOS targets. Updates README.md with TestFlight install instructions. |
| coraline   | No    | No new web pixels.                                                                        |
| yuki       | Yes   | 72 h endurance on iPad + 72 h endurance on Apple TV, separately. tvOS is a new platform; this is the first time yuki runs there. |
| leia       | Yes   | Tags `phase-21` on master after merge. Note: the merge is the source merge; the TestFlight builds are uploaded from feature branch before merge (see Section 12.1).|

Optional verification:

- clarice: live-page diagnostic inside the shell. Useful for the first iOS install; can confirm no console errors, no failed fetches, picker functional. Run once on iPad and once on Apple TV.
- motoko: not triggered. Face-level only.
- sentry: subsumed by yuki for this phase.

### 12.1 Branch and merge sequence

Feature branch: `phase-21-wkwebview-shell`.

Sequence:

1. ariadne writes this spec (done; current step).
2. misaka creates `ios/` directory, Xcode workspace, two targets, SharedShell sources, `tabindex` edit.
3. misaka builds, archives, uploads first TestFlight build for both platforms (signing surprises resolved here, per ripley's estimate).
4. user verifies install on iPad and Apple TV.
5. yuki kicks off 72 h endurance runs on both devices in parallel.
6. mikasa simplifies the Swift sources during the endurance window (does not block).
7. hermione reviews after mikasa's pass.
8. shizuku updates docs.
9. leia merges to master with `--no-ff`, tags `phase-21`.
10. master auto-deploys to GitHub Pages (web layer); the TestFlight builds are already live.

The TestFlight uploads happen pre-merge so that the on-device verification (the long pole) overlaps the rest of the pipeline. The risk is that a hermione-flagged change requires a rebuild and a re-upload. Acceptable: TestFlight upload-to-tester time is on the order of 30 minutes, much shorter than the 72 h endurance.

## 13. Effort Estimate

Restated from ripley's Section 3.5 in tabular form. Assumptions: solo developer with no prior native iOS experience; user handles prerequisites in parallel with misaka's work.

| Task                                          | Hours (new) | Hours (experienced) | Critical path? |
|-----------------------------------------------|-------------|---------------------|----------------|
| Prerequisites setup (user; not misaka)        | 4-8         | 2-4                 | Blocks all     |
| Xcode workspace + two target scaffolds        | 2-4         | 1-2                 | Yes            |
| SharedShell sources                           | 1-2         | 0.5-1               | Yes            |
| iOS shell (`SolariViewController.swift`)      | 4-8         | 2-4                 | Yes            |
| tvOS shell + Menu press handling              | 6-12        | 3-6                 | Yes            |
| Asset catalog (icons, launch screens)         | 2-4         | 2-4                 | Parallel       |
| App Store Connect app records, provisioning   | 2-4         | 1-2                 | Parallel       |
| First TestFlight upload (both platforms)      | 2-6         | 1-3                 | Yes            |
| On-device verification (initial smoke)        | 2-4         | 2-4                 | Yes            |
| Yuki 72 h endurance (elapsed; not effort)     | 72 h elapsed| 72 h elapsed        | Yes (gates merge) |
| Hermione review + mikasa simplify             | 2-4         | 2-4                 | Parallel       |
| Shizuku doc updates                           | 1-2         | 1-2                 | Parallel       |
| **Total active hours (excluding 72 h soak)**  | **24-50**   | **14-28**           |                |

Critical-path elapsed time, including the 72 h soak, is approximately 4-5 days. The active developer time is the 24-50 h range from ripley's estimate.

If a 90 d TestFlight expiry happens before merge (unlikely but possible if the phase drags), the same procedure repeats. Add 1-2 h to the upper estimate for that contingency.

## 14. Alternatives Considered

Not "use a framework" or "add a build step to the web layer" -- both are constitutionally out of scope for Solari. The alternatives considered are within the platform-delivery space.

**Capacitor / Cordova / Ionic native shell.** Rejected. These frameworks add a substantial native runtime, a JS bridge with their own conventions, and a build pipeline. The Solari web layer is 250 KB; a Capacitor shell adds several MB and a JS bridge surface we do not need. The whole point of Phase 21 is a minimum-viable wrapper.

**React Native / Flutter rewrite.** Rejected. Solari is vanilla web by constitution (CLAUDE.md, SDD Section 5). A rewrite is a different product.

**Run as a Safari Web App via "Add to Home Screen" only, no native shell.** This is the V1 deployment model. It is what we are leaving behind for two reasons: (a) ATTHS-installed pages on Safari are evicted from memory when other tabs grow; the iPad does not stay running for 7 days reliably without periodic full reloads under load. (b) Apple TV has no Safari, so ATTHS is not available there at all. The native shell solves both.

**Single shared codebase compiled to iOS and tvOS via Catalyst.** Rejected. Catalyst is iOS-to-macOS, not iOS-to-tvOS. The Catalyst model does not apply.

**One codebase that runs on iOS phone and iPad with different layouts.** Rejected as in scope, in scope, but explicitly omitted. iPhone is excluded from the iOS device family (Section 7.2). The web layer is calibrated for a 1180x820 stage; the picker assumes touch targets sized for an iPad. A phone-friendly layout is a different design problem.

**A Mac Catalyst build for running Solari on a Mac.** Out of scope. Could be added in a future phase if the user wants Solari on a Mac display. Not requested.

**Use `WKWebView`'s `loadHTMLString` to inline the index.html instead of `loadFileURL`.** Rejected. `loadHTMLString` does not support `file://`-relative subresource fetching; all the `<script src="app.js">` and `fetch('data/tides.json')` calls would fail. `loadFileURL` is the correct API.

**Run a local HTTP server inside the shell (e.g. GCDWebServer) and serve the bundle over `http://localhost:NNNN`.** Rejected. Adds a dependency, opens a socket, runs background threads, and bypasses the file:// origin's security model for no functional gain. `loadFileURL` works.

## 15. Phase Dependencies

- **Requires:** Phase 20.1 (Horizon overlap fix, shipped 2026-05-13). V1 feature set frozen at master HEAD.
- **Requires:** non-coding prerequisites from Section 7.1 complete before misaka's implementation pass starts.
- **Unblocks:**
  - Apple TV deployment as a supported delivery target.
  - iPad install path that survives Safari's lifecycle limits for 7+ days.
  - A versioned release artefact (the TestFlight build) that captures the web bundle at a known git SHA.
  - A future Phase 22 (if needed) for a Mac Catalyst build, native settings screen, or a `window.SOLARI_BUILD` constant injected at bundle time.

## 16. Open Questions (post-handoff)

The five open questions from ripley's handoff are resolved in Section 4. Any new open questions surfaced by this spec:

1. **Icon design.** The user supplies the iOS and tvOS app icons. The spec recommends a minimal off-white circle on black (echo of the moon disc), but the user makes the final call. The icon does not affect the running display; it only affects the home-screen / app-launcher representation.
2. **Bundle ID strings.** The spec uses `com.neocode.solari.ios` and `com.neocode.solari.tvos` as placeholders. The user confirms the exact strings before Section 7.1 starts. They must be stable across all rebuilds (Section 4.5).
3. **Top-shelf image content.** A static black image is the simplest; a rendered Calm-face screenshot is more on-brand. Either works; the user picks. Not a Phase 21 gate.
4. **Apple TV screen saver timeout.** The shell's `isIdleTimerDisabled` may not override the tvOS screen saver. Acceptance criterion 5 documents this as a one-time device-configuration step (Settings > General > Screen Saver > Start After > Never). Confirmation needed: does the user accept setting the screen-saver timeout to Never as a manual device-setup step, or do they want the shell to attempt to disable the screen saver programmatically? Recommendation: accept the manual step. Programmatic screen-saver override on tvOS is not a public API.
5. **Service worker behaviour under `file://` origin.** Not a blocker. If `sw.js` registration logs errors inside the shell, document and ignore. If it causes functional regression, remove the registration in a follow-up phase (a single-line `app.js` edit).

## 17. References

- `2026 04 27 10 15 PM - SDD - Ambient Display V0.5.docx` -- frozen specification.
- `docs/phase-20-horizon-face.md` -- last face phase; precedent for face-level scope.
- `docs/phase-20.1-horizon-overlap-fix.md` -- precedent for non-face phase spec format.
- `CLAUDE.md` -- project constraints, agent pipeline, architecture summary.
- `README.md` -- public install instructions; will be updated by shizuku to include TestFlight install instructions.
- Apple `WKWebView` documentation: https://developer.apple.com/documentation/webkit/wkwebview
- Apple `WKWebsiteDataStore`: https://developer.apple.com/documentation/webkit/wkwebsitedatastore
- Apple `UIApplication.isIdleTimerDisabled`: https://developer.apple.com/documentation/uikit/uiapplication/1623070-isidletimerdisabled
- Apple Human Interface Guidelines, tvOS, "Remote and Controllers": https://developer.apple.com/design/human-interface-guidelines/remotes-and-controllers
- Apple TestFlight documentation: https://developer.apple.com/testflight/

## 18. Out of Scope (explicit non-goals)

- Native UI of any kind beyond the WKWebView.
- Settings screen, native preferences, or any non-web configuration surface.
- Native push notifications, in-app purchase, analytics, telemetry, crash reporting, or auto-update beyond TestFlight's built-in mechanism.
- App Store submission. TestFlight internal-tester only.
- External testers. Single-user, two-device deployment.
- Keychain access. localStorage via `WKWebsiteDataStore.default()` is sufficient.
- Native storage migration. The web layer's localStorage is the only persistent state; the WKWebView persistent data store carries it.
- A Mac Catalyst build.
- An iPhone build (iOS target excludes iPhone from device family).
- An Android shell, a Windows shell, or any non-Apple-platform delivery.
- Live web bundle updates between rebuilds. The bundle is frozen at each TestFlight build; the next bundle ships with the next rebuild.
- An in-app TestFlight expiry reminder.
- A wake-time JS bridge for `applicationDidBecomeActive`.
- Focus engine plumbing on tvOS beyond the single `tabindex="0"` edit on picker face cards.
- Any change to `app.js`, `style.css`, `sw.js`, or `lib/`. The only web-layer edit is the `tabindex` attribute on `clockface.html` face cards.
- A V2 face. Editorial restoration (CLAUDE.md notes Editorial is partial / V2) remains a separate future phase.
- Latitude / location override. Coordinates remain Vancouver. Same constraint as the rest of V1.
