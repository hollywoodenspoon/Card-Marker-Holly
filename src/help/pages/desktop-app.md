# Desktop app (Windows and Linux)

The desktop app is the same Hearthside Cardworks as the website, but your projects are saved as folders of ordinary files on your computer instead of inside a browser. It never goes online.

## Download and install

Download the app from the project's [Releases page](https://github.com/hollywoodenspoon/Card-Marker-Holly/releases). Pick the file for your system:

- **Windows**, two choices:
  - **`Hearthside-Cardworks-Setup-….exe`** (recommended): double-click it and it installs in a few seconds, for you only, without admin rights. It can update itself.
  - **`…-portable.exe`**: there is nothing to install. Put it anywhere (for example a _Hearthside Cardworks_ folder on your desktop or a USB stick) and double-click it.
- **Linux**: the file ending in `.AppImage`. Make it executable (right-click → **Properties** and tick the option to allow running it as a program, or `chmod +x` in a terminal), then double-click it.
- **Arch Linux and CachyOS**: add the app's package repository once, and then your normal `sudo pacman -Syu` keeps it up to date. Add these lines to the end of `/etc/pacman.conf` (for example with `sudo nano /etc/pacman.conf`):

  ```
  [cardworks]
  SigLevel = Optional TrustAll
  Server = https://github.com/hollywoodenspoon/Card-Marker-Holly/releases/download/pacman-repo
  ```

  Then run `sudo pacman -Syu hearthside-cardworks`. (You can also download the file ending in `.pkg.tar.xz` and install it with `sudo pacman -U`, but then it won't update.)

### Windows protected your PC

The first time you start the Windows app, Windows may show a blue box saying **Windows protected your PC**. This happens because the app isn't signed with a paid certificate. Click **More info**, then **Run anyway**. Windows remembers your choice for that file.

### Updates

The first time you start the app, it asks **Check for updates automatically?**

- **Yes, check**: at each start the app asks GitHub (where the downloads live) whether a newer version exists. Nothing else is sent: no projects, no names, no tracking.
- **No, stay offline**: the app never goes online, as before.

Change it any time in ☰ → **Settings**: **Automatic update checks** turns checking on or off, and **Check for updates** checks right now.

What happens when there's a new version depends on which download you use:

- **Windows Setup and the Linux AppImage** download it in the background and say **Version … is ready**. It installs when you close the app, or press **Restart now** (☰ → **Settings** also shows **Restart to update**). Your work is saved first.
- **The portable `.exe`** can't replace itself. It says **Version … is out** with a **Download** button that opens the Releases page.
- **The Arch package** is updated by pacman. It says **Version … is out. Update with: sudo pacman -Syu**, with a button that copies the command.

Your projects are separate from the app, so updating never touches them.

> **Note:** Versions before 0.1.0-alpha.2 can't update themselves. Download a newer version by hand once; from then on it's automatic.

> **Note:** The Windows app keeps its settings and Recent list in a folder called **Hearthside Cardworks data** next to the `.exe`. If you move the `.exe`, move that folder with it. Nothing goes into AppData.

## Where your projects are saved

New projects go into **Documents/Hearthside Cardworks/**, one folder per project, named after the project. The **New project** box shows exactly where (_Saved in …_). Press **Change…** there to pick another place for new projects. You can also change it on the Home screen: ☰ → **Projects folder…**.

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

- Windows: in the **Hearthside Cardworks data** folder next to the `.exe`
- Linux: in `~/.config/card-maker`

The version number is shown at the bottom of the ☰ menu.

## See also

- [Projects, saving and backups](help:projects)
- [Website and offline use](help:website)
- [Troubleshooting and questions](help:troubleshooting)
