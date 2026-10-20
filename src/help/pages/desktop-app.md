# Desktop app (Windows and Linux)

The desktop app is the same Card Maker as the website, but your projects are saved as folders of ordinary files on your computer instead of inside a browser. It never goes online.

## Download and install

Download the app from the project's [Releases page](https://github.com/hollywoodenspoon/Card-Marker-Holly/releases). Pick the file for your system:

- **Windows**: the file ending in `-portable.exe`. There is nothing to install: put it anywhere (for example a _Card Maker_ folder on your desktop) and double-click it.
- **Linux**: the file ending in `.AppImage`. Make it executable (right-click → **Properties** and tick the option to allow running it as a program, or `chmod +x` in a terminal), then double-click it.
- **Arch Linux and CachyOS**: the file ending in `.pkg.tar.xz`. Install it with `sudo pacman -U` followed by the file name.

### Windows protected your PC

The first time you start the Windows app, Windows may show a blue box saying **Windows protected your PC**. This happens because the app isn't signed with a paid certificate. Click **More info**, then **Run anyway**. Windows remembers your choice for that file.

### Updating

The app doesn't update itself. When a new version comes out, download it from the Releases page and use it instead of the old one. Your projects are separate from the app, so they're all still there.

> **Note:** The Windows app keeps its settings and Recent list in a folder called **Card Maker data** next to the `.exe`. If you move the `.exe`, move that folder with it. Nothing goes into AppData.

## Where your projects are saved

New projects go into **Documents/Card Maker/**, one folder per project, named after the project. The **New project** box shows exactly where (_Saved in …_). Press **Change…** there to pick another place for new projects. You can also change it on the Home screen: ☰ → **Projects folder…**.

Each project folder holds:

- `project.json`: cards, templates, styles and settings
- `project.json.bak`: the version before the last save
- `images`: your uploaded pictures (PNG, JPG, WebP, SVG), unchanged
- `fonts`: your uploaded fonts

Saving is automatic. The app writes a complete new file first and only then swaps it in, so a crash or power cut never leaves a half-written project.

To back a project up, or move it to another computer or a USB stick, just copy its folder.

## The Home screen in the app

- **Open folder**: adds a project folder from anywhere, for example one you copied from another computer.
- Each project shows where its folder is. ⋯ → **Show in folder** opens it in your file manager.
- ⋯ → **Remove…** takes a project off the list. Tick **Also move the folder to the Trash** to remove the files too (Recycle Bin on Windows).
- A project whose folder was moved or renamed shows **Folder not found · click to locate it**. Click it and choose the folder's new place.

In the editor, ☰ → **Show project folder** opens the open project's folder.

## Exports

PDFs, card images, Tabletop Simulator files, CSV files and backups open a normal **Save as** window, so you choose where they go. The message afterwards has a **Show in folder** button.

## Settings

Theme, units and other preferences are kept with the app:

- Windows: in the **Card Maker data** folder next to the `.exe`
- Linux: in `~/.config/card-maker`

The version number is shown at the bottom of the ☰ menu.

## See also

- [Projects, saving and backups](help:projects)
- [Website and offline use](help:website)
- [Troubleshooting and questions](help:troubleshooting)
