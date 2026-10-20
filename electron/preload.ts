import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge } from '../src/platform/desktop'

/** The page's only way to the file system (see src/platform/desktop.ts). */
const bridge: DesktopBridge = {
  platform: process.platform,
  paths: () => ipcRenderer.invoke('fs:paths'),
  readFile: (p) => ipcRenderer.invoke('fs:read', p),
  writeFile: (p, data, opts) => ipcRenderer.invoke('fs:write', p, data, opts),
  exists: (p) => ipcRenderer.invoke('fs:exists', p),
  list: (dir) => ipcRenderer.invoke('fs:list', dir),
  remove: (p) => ipcRenderer.invoke('fs:remove', p),
  removeProjectFolder: (dir) => ipcRenderer.invoke('fs:removeProject', dir),
  pickFolder: (opts) => ipcRenderer.invoke('dialog:pickFolder', opts),
  saveFile: (name, data) => ipcRenderer.invoke('dialog:save', name, data),
  reveal: (p) => ipcRenderer.invoke('shell:reveal', p),
  onBeforeClose(fn) {
    ipcRenderer.removeAllListeners('app:before-close')
    ipcRenderer.on('app:before-close', () => {
      void fn()
        .catch((e) => console.error('Saving before close failed', e))
        .finally(() => ipcRenderer.send('app:close-ready'))
    })
  },
}

contextBridge.exposeInMainWorld('cardMaker', bridge)
