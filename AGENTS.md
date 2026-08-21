# Project settings for Codex

This file stores persistent project-specific instructions and preferences for
future Codex sessions. Update it when the user asks to remember or change a
project setting.

## Build and release

- Do not build or rebuild the Android APK during routine development.
- Build the Android APK only after the user explicitly says the project is
  ready for release or directly requests an APK build.
- When the user asks to build an APK or publish a production release, commit
  all current project changes on `master`, run the relevant checks, build the
  APK, push `master` and the release tag, and publish the APK in a GitHub
  Release with release notes. Generate `update-manifest.json` with
  `npm run release:manifest` after copying the versioned APK, and upload both
  the APK and manifest as assets of the same GitHub Release.
- Keep release notes user-facing and concise. When a release only changes UI,
  colors, or internal algorithms, avoid technical implementation details and
  use a short general description such as improved interface, minor fixes,
  and increased stability.
- On this workstation, use the Android Studio JBR at
  `C:\Program Files\Android\Android Studio\jbr` for Gradle builds. If
  `JAVA_HOME` is missing, set it to this path for the build command only.
- Never connect to production servers, including over SSH. The local backend
  repository may be inspected and modified when it is within the user's task.
- Development database migrations may be applied in the local Docker
  environment without asking for approval. Production migrations must always
  be left for the user to run manually.
- Never perform deployments. When the user asks about deployment, provide the
  required steps and commands for the user to run themselves.

## Responsive UI

- Keep the interface usable on small mobile screens.
- On extra-small screens, compact secondary labels when they compete with
  important values for horizontal space.

## Vue and Vuetify implementation

- Prefer built-in Vue/Vuetify components, directives, composables, and other
  framework helpers over custom reactive plumbing.
- Avoid `watch` when the same behavior can be expressed declaratively or with
  a framework helper. Add a watcher only when no simpler built-in mechanism
  fits the requirement.

## Linting and formatting

- Keep the standard `lint` command read-only: it must report code-quality
  problems without rewriting source files.
- Do not make whitespace or other formatting-only rules a release blocker.
- Do not spend task time on formatting-only changes unless the user explicitly
  asks for formatting.

## Camera integration

- Use the official `@capacitor/camera` plugin as the baseline camera
  implementation.
- Keep a custom native CameraX screen as a possible fallback only when the user
  explicitly asks to guarantee that the front camera opens by default.
- Do not change camera implementations automatically. Notify the user when an
  official plugin or Android API release adds reliable Android support for
  opening the front camera by default.

## Brand colors

- Never combine blue hues with yellow in brand assets or product UI.
- Treat the blue-and-yellow combination as a critical prohibited color pairing
  for all future design and release work.
