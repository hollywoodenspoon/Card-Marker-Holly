/**
 * The Android app's native folder plugin (android/.../FoldersPlugin.java).
 * Paths are virtual: /app/... is the app's private storage, /tree/N/... is
 * inside the N-th folder picked with Android's folder picker.
 */
export interface FoldersPlugin {
  pickFolder(): Promise<{ path: string | null; label?: string }>
  roots(): Promise<{ roots: { path: string; label: string; granted: boolean }[] }>
  /** base64, or null when the file does not exist. */
  read(o: { path: string }): Promise<{ data: string | null }>
  write(o: {
    path: string
    data?: string
    text?: string
    atomic?: boolean
    backup?: boolean
  }): Promise<void>
  exists(o: { path: string }): Promise<{ exists: boolean }>
  list(o: { path: string }): Promise<{ names: string[] | null }>
  remove(o: { path: string }): Promise<void>
  removeProject(o: { path: string }): Promise<void>
  /** "Save as" dialog; the chosen file's name, or null when cancelled. */
  saveAs(o: { name: string; data: string }): Promise<{ name: string | null }>
}
