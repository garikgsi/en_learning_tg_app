export type AppRelease = {
  versionCode: number
  versionName: string
  apkUrl: string
  sha256: string
  size: number | null
  releasedAt: string | null
  releaseNotes: string | null
  mandatory: boolean
}
