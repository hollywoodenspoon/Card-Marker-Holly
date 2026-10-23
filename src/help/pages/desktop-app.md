# Desktop app (Arch Linux and CachyOS)

The desktop app is the same Hearthside Cardworks as the website, but your projects are saved as folders of ordinary files on your computer instead of inside a browser. It never goes online.

## Download and install

The desktop app comes as a package for **Arch Linux and CachyOS**. Add the app's package repository once, and then your normal `sudo pacman -Syu` keeps it up to date. Add these lines to the end of `/etc/pacman.conf` (for example with `sudo nano /etc/pacman.conf`):

```
[cardworks]
SigLevel = Optional TrustAll
Server = https://github.com/hollywoodenspoon/Card-Marker-Holly/releases/download/pacman-repo
```

Then run `sudo pacman -Syu hearthside-cardworks`. (You can also download the file ending in `.pkg.tar.xz` from the [Releases page](https://github.com/hollywoodenspoon/Card-Marker-Holly/releases) and install it with `sudo pacman -U`, but then it won't update.)

Windows and AppImage downloads have stopped. **Hearthside Cardworks Cozy Edition** will replace the Windows app. On any other computer, use the website.

### Updates

The first time you start the app, it asks **Check for updates automatically?**

- **Yes, check**: at each start the app asks GitHub (where the downloads live) whether a newer version exists. Nothing else is sent: no projects, no names, no tracking.
- **No, stay offline**: the app never goes online, as before.

Change it any time in ☰ → **Settings**: **Automatic update checks** turns checking on or off, and **Check for updates** checks right now.

When there's a new version, the app says **Version … is out. Update with: sudo pacman -Syu**, with a button that copies the command.

Your projects are separate from the app, so updating never touches them.

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
- ⋯ → **Remove…** takes a project off the list. Tick **Also move the folder to the Trash** to remove the files too.
- A project whose folder was moved or renamed shows **Folder not found · click to locate it**. Click it and choose the folder's new place.

In the editor, ☰ → **Show project folder** opens the open project's folder.

## Exports

PDFs, card images, Tabletop Simulator files, CSV files and backups open a normal **Save as** window, so you choose where they go. The message afterwards has a **Show in folder** button.

## Settings

Theme, units and other preferences are kept with the app, in `~/.config/card-maker`.

The version number is shown at the bottom of the ☰ menu.

## See also

- [Projects, saving and backups](help:projects)
- [Website and offline use](help:website)
- [Troubleshooting and questions](help:troubleshooting)
