**Early alpha.** Things will change, and there may be bugs. Keep backups of projects you care about (☰ → Export backup file, or copy the project folder).

## Download

- **Windows:** two choices.
  - `Hearthside-Cardworks-Setup-….exe` (recommended): installs for you only, without admin rights, and can update itself.
  - `Hearthside-Cardworks-…-portable.exe`: a single file with nothing to install, which keeps its settings in a `Hearthside Cardworks data` folder next to the exe. It tells you when a new version is out, and you download that yourself.

  Windows may say "Windows protected your PC" because the app isn't code-signed. Click **More info → Run anyway**.
- **Linux (any distro):** `hearthside-cardworks-…-x86_64.AppImage`. Make it executable (`chmod +x`), then run it. It can update itself.
- **Android (phone and tablet, Android 7+):** `Hearthside-Cardworks-….apk`. Open it on the device, allow **Install unknown apps** for your browser or file manager when asked, then install. The first start asks for a folder for your projects (for example `Documents/Hearthside Cardworks`).
- **Arch / CachyOS:** add the app's pacman repository once, then `sudo pacman -Syu` keeps it up to date. Add to the end of `/etc/pacman.conf`:

  ```
  [cardworks]
  SigLevel = Optional TrustAll
  Server = https://github.com/hollywoodenspoon/Card-Marker-Holly/releases/download/pacman-repo
  ```

  and run `sudo pacman -Syu hearthside-cardworks` (it replaces the older `card-maker` package). Or install the `hearthside-cardworks-…-x64.pkg.tar.xz` below with `sudo pacman -U`.

**Updates:** at first start the desktop app asks whether to check for updates. If you say yes, it asks GitHub once at each start and sends nothing else. The installer and the AppImage then update themselves; the portable exe tells you about the new version, and the Arch package updates with `sudo pacman -Syu`. Versions before 0.1.0-alpha.2 can't update, so download this one by hand once.

Projects are saved as ordinary folders: on a computer by default in `Documents/Hearthside Cardworks`, on Android in the folder you pick. The folders are the same on every platform, so you can copy a project between phone and PC. The apps work fully offline.
