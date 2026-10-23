**Beta.** Things may still change, and there may be bugs. Keep backups of projects you care about (☰ → Export backup file, or copy the project folder).

## Download

The desktop app is the **Arch Linux / CachyOS** package. Add the app's pacman repository once, then `sudo pacman -Syu` keeps it up to date. Add to the end of `/etc/pacman.conf`:

```
[cardworks]
SigLevel = Optional TrustAll
Server = https://github.com/hollywoodenspoon/Card-Marker-Holly/releases/download/pacman-repo
```

and run `sudo pacman -Syu hearthside-cardworks` (it replaces the older `card-maker` package). Or install the `hearthside-cardworks-…-x64.pkg.tar.xz` below with `sudo pacman -U`.

Windows and AppImage downloads have stopped. **Hearthside Cardworks Cozy Edition** will replace the Windows app. The website works on any computer or phone and needs no install.

**Updates:** at first start the desktop app asks whether to check for updates. If you say yes, it asks GitHub once at each start and sends nothing else, and says when a new version is out; `sudo pacman -Syu` installs it.

In the desktop app, projects are saved as ordinary folders, by default in `Documents/Hearthside Cardworks`. The app works fully offline.
