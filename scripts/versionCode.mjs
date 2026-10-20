/**
 * Android versionCode for a package.json version. Android only installs an update
 * whose code is larger, so every later version must give a larger number:
 *   major·1 000 000 + minor·10 000 + patch·100 + stage
 *   stage: alpha.N → N (1–39), beta.N → 40 + N, rc.N → 80 + N, final release → 99
 * e.g. 0.1.0-alpha.1 → 10001, 0.1.0 → 10099, 1.0.0 → 1000099.
 */
export function versionCode(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/.exec(version)
  if (!m) throw new Error(`Version ${version} must look like 1.2.3 or 1.2.3-alpha.4`)
  const [, major, minor, patch, pre, n] = m
  const limits = { major: 2000, minor: 99, patch: 99 }
  if (+major >= limits.major || +minor > limits.minor || +patch > limits.patch)
    throw new Error(`Version ${version} is too large for an Android versionCode`)
  let stage = 99
  if (pre) {
    const max = pre === 'rc' ? 18 : 39
    if (+n < 1 || +n > max) throw new Error(`${pre}.${n}: use ${pre}.1 to ${pre}.${max}`)
    stage = { alpha: 0, beta: 40, rc: 80 }[pre] + +n
  }
  return +major * 1_000_000 + +minor * 10_000 + +patch * 100 + stage
}
