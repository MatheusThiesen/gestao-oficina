import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi } from '@shared/ipc'

const api: AppApi = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (event, listener) => {
    const wrapped = (_e: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) => listener(payload)
    ipcRenderer.on(event, wrapped)
    return () => ipcRenderer.removeListener(event, wrapped)
  }
}

contextBridge.exposeInMainWorld('api', api)
