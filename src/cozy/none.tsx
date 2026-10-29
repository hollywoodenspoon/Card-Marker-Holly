/**
 * Cozy Edition stand-ins: the build (vite.config.ts, cozyStubs) puts these in place of
 * the parts Cozy Edition leaves out, so that code isn't in its bundle at all.
 */
export const GamePackDialog = () => null
export const UpdateMenuItems = () => null
export const UpdateButton = () => null
export default function Nothing() {
  return null
}
