**Early alpha.** Things will change, and there may be bugs. Keep backups of projects you care about (☰ → Export backup file, or copy the project folder).

## What's new

- **A new name:** Card Maker is now **Hearthside Cardworks**, and the playtest app is **Hearthside Table**, with a tavern-sign app icon. Your projects, settings and backups carry over as they are.
- **Fantasy icons** on the main buttons, from game-icons.net.
- **37 themes**, picked from ☰ → Settings → Theme…: the new **Hearthside** (moonlit night and candle glow, the new default), hearth themes, twelve job themes (Red Mage to Thief), Chocobo and Gold Chocobo, tabletop, pastel, bold dark and accessible themes.
- **Tidier menu:** ☰ sits at the top right everywhere, with Help, Units, Theme and updates under **Settings**. On a computer it no longer repeats what the left rail has.
- **Tabs follow the mode:** the Templates tab switches to Template mode and the Cards tab back to Card mode.
- **Import asks first** when the backup is of a project you already have: make a new copy, or overwrite it (with Undo).
- **Fronts paired with backs, and mixed card sizes:** every front prints with its own back at the same size, and one project can hold cards of different sizes. Printing, Tabletop Simulator export, card images and game packs handle each size.
- **Arch / CachyOS:** a pacman repository, so `sudo pacman -Syu` updates the app.

## Download

- **Windows:** two choices.
  - `Hearthside-Cardworks-Setup-….exe` (recommended): installs for you only, without admin rights, and can update itself.
  - `Hearthside-Cardworks-…-portable.exe`: a single file with nothing to install, which keeps its settings in a `Hearthside Cardworks data` folder next to the exe. It tells you when a new version is out, and you download that yourself.

  Windows may say "Windows protected your PC" because the app isn't code-signed. Click **More info → Run anyway**.

- **Linux (any distro):** `hearthside-cardworks-…-x86_64.AppImage`. Make it executable (`chmod +x`), then run it. It can update itself.
- **Arch / CachyOS:** add the app's pacman repository once, then `sudo pacman -Syu` keeps it up to date. Add to the end of `/etc/pacman.conf`:

  ```
  [cardworks]
  SigLevel = Optional TrustAll
  Server = https://github.com/hollywoodenspoon/Card-Marker-Holly/releases/download/pacman-repo
  ```

  and run `sudo pacman -Syu hearthside-cardworks` (it replaces the older `card-maker` package). Or install the `hearthside-cardworks-…-x64.pkg.tar.xz` below with `sudo pacman -U`.

**Updates:** at first start the desktop app asks whether to check for updates. If you say yes, it asks GitHub once at each start and sends nothing else. The installer and the AppImage then update themselves; the portable exe tells you about the new version, and the Arch package updates with `sudo pacman -Syu`. Versions before 0.1.0-alpha.2 can't update, so download this one by hand once.

In the desktop app, projects are saved as ordinary folders, by default in `Documents/Hearthside Cardworks`. The folders are the same on Windows and Linux, so you can copy a project between computers. The apps work fully offline.
