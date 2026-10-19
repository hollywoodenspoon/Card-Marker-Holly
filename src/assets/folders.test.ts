import { describe, expect, it } from 'vitest'
import type { Asset } from '@/core/model/types'
import { assetsInFolder, groupAssets, renameInList, uniqueFolderName } from './folders'

const asset = (id: string, createdAt: number, folder?: string) =>
  ({ id, name: id, createdAt, folder, tags: [] }) as unknown as Asset

describe('asset folders', () => {
  const list = [asset('a', 1), asset('b', 2, 'Icons'), asset('c', 3, 'Art'), asset('d', 4, 'Icons')]

  it('groups loose images first, then folders in list order, newest first', () => {
    const g = groupAssets(list, ['Icons', 'Frames'])
    expect(g.map((x) => x.folder)).toEqual([null, 'Icons', 'Frames', 'Art'])
    expect(g[0].assets.map((a) => a.id)).toEqual(['a'])
    expect(g[1].assets.map((a) => a.id)).toEqual(['d', 'b'])
    expect(g[2].assets).toEqual([])
    expect(g[3].assets.map((a) => a.id)).toEqual(['c'])
  })

  it('makes unique names', () => {
    expect(uniqueFolderName('Icons', ['Art'])).toBe('Icons')
    expect(uniqueFolderName(' Icons ', ['Icons', 'Icons 2'])).toBe('Icons 3')
    expect(uniqueFolderName('', [])).toBe('Folder')
  })

  it('renames in place and finds a folder’s images', () => {
    expect(renameInList(['A', 'B', 'C'], 'B', 'X')).toEqual(['A', 'X', 'C'])
    expect(assetsInFolder(list, 'Icons')).toEqual(['b', 'd'])
  })
})
