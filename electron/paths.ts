import nodePath from 'node:path'

type PathApi = Pick<typeof nodePath, 'resolve' | 'relative' | 'isAbsolute'>

/** True when `target` is `root` or somewhere inside it (no `..` escapes, no other drive). */
export function isInside(root: string, target: string, p: PathApi = nodePath): boolean {
  const rel = p.relative(p.resolve(root), p.resolve(target))
  return rel === '' || (!rel.startsWith('..') && !p.isAbsolute(rel))
}

/** The folders the app may read and write: its data folder plus the ones the user chose. */
export class AllowedRoots {
  private roots = new Set<string>()
  constructor(
    private real: (p: string) => string,
    private p: PathApi = nodePath,
  ) {}
  add(dir: string | undefined | null) {
    if (dir) this.roots.add(this.real(dir))
  }
  /** The real path when allowed; throws otherwise. */
  check(target: unknown): string {
    if (typeof target !== 'string' || !target) throw new Error('A file path is needed.')
    const full = this.real(target)
    for (const r of this.roots) if (isInside(r, full, this.p)) return full
    throw new Error(`The app is not allowed to use ${target}`)
  }
}
