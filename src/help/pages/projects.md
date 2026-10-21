# Projects, saving and backups

A project holds everything for one game: its cards, templates, images, fonts, styles, decks and print settings. You can have as many projects as you like.

## The Home screen

The Home screen lists your projects. To get there from the editor, open the ☰ menu and choose **All projects**.

Each project shows its name, card size and when it was last edited. Click a project to open it. The buttons at the top:

- **New project**: start a new one (see [Getting started](help:getting-started)).
- **Import**: add a project from a backup file.
- **Open folder** (desktop and Android apps only): add a project folder from anywhere.

The ⋯ button next to a project has:

- **Rename**
- **Show in folder** (desktop app only): opens the project's folder in your file manager.
- **Export backup file**
- **Delete** on the website, or **Remove…** in the desktop and Android apps.

![The Home screen](home.webp)

## Saving

You never need to press Save. Every change is saved a moment after you make it, and again when you switch to another app or close the window.

The indicator next to the project name in the top bar shows what is happening:

- **Saved** with a tick: everything is stored.
- **Saving…** with a spinner: a change is being written.
- **Not saved** in red: something went wrong. Export a backup file straight away (see below).

On a phone only the icon is shown.

## Backup files

A backup file is one file that contains the whole project: cards, templates, images and fonts. Its name ends in `.cardproject.json`.

To make one:

1. In the editor, open ☰ and choose **Export backup file**. (On the Home screen, use the project's ⋯ → **Export backup file**.)
2. Keep the file somewhere safe: a USB stick, cloud storage, or email it to yourself.

To bring one back, press **Import** on the Home screen and choose the file.

If the backup is of a project you already have on this device, the app asks what to do. It shows when each was last changed and how many cards each has:

- **Make a new copy** adds the backup as a separate project, with "(copy)" after its name. Nothing you have changes.
- **Overwrite…** replaces the project on this device with the backup: its cards, templates, images and fonts. The app asks once more first. Right after, a message offers **Undo**, which puts back the version you had.

A backup of a project you don't have yet is simply added.

Backup files also move work between places: from the website to the desktop app, from one browser to another, or to a friend.

> **Tip:** On the website, your projects live only in the browser you made them in. Export a backup now and then, so clearing your browser can never cost you your cards.

## Deleting a project

- **Website**: ⋯ → **Delete** removes the project and all its cards, templates, images and fonts from this browser. This can't be undone, so export a backup first if you might want it again.
- **Desktop app**: ⋯ → **Remove…** takes the project off the list. Its folder stays on disk unless you tick **Also move the folder to the Trash**.
- **Android app**: ⋯ → **Remove…** works the same way, but the box says **Also delete the folder and everything in it from this device**. Android has no Trash, so that deletes it for good.

## Project folders (desktop and Android)

In the apps, each project is a folder of ordinary files:

- `project.json`: cards, templates, styles and settings
- `project.json.bak`: the version before the last save
- `images`: your uploaded pictures, unchanged
- `fonts`: your uploaded fonts

You can copy the whole folder to back it up or move it to another computer. If the app ever can't read `project.json`, it loads the newest good copy instead and tells you so. See [Troubleshooting](help:troubleshooting#restored-from-backup-message).

## Templates on their own

To share a single layout rather than a whole project, export it from the **Templates** tab. See [Templates and fields](help:templates).

## See also

- [Desktop app (Windows and Linux)](help:desktop-app)
- [Android app](help:android-app)
- [Website and offline use](help:website)
- [Troubleshooting and questions](help:troubleshooting)
