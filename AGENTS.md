# Project settings for Codex

This file stores persistent project-specific instructions and preferences for
future Codex sessions. Update it when the user asks to remember or change a
project setting.

## Build and release

- Do not build or rebuild the Android APK during routine development.
- Build the Android APK only after the user explicitly says the project is
  ready for release or directly requests an APK build.
- On this workstation, use the Android Studio JBR at
  `C:\Program Files\Android\Android Studio\jbr` for Gradle builds. If
  `JAVA_HOME` is missing, set it to this path for the build command only.
- Never connect to backend or production servers, including over SSH.
- Never perform deployments. When the user asks about deployment, provide the
  required steps and commands for the user to run themselves.
- Do not inspect or modify the backend repository unless the user explicitly
  asks for backend work.

## Responsive UI

- Keep the interface usable on small mobile screens.
- On extra-small screens, compact secondary labels when they compete with
  important values for horizontal space.

## Brand colors

- Never combine blue hues with yellow in brand assets or product UI.
- Treat the blue-and-yellow combination as a critical prohibited color pairing
  for all future design and release work.
