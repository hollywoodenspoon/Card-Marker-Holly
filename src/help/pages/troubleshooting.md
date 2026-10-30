# Troubleshooting and questions

Answers to the problems people run into most. If something isn't covered here, the page for that part of the app usually helps.

## Fonts look different in the PDF

Hearthside Cardworks puts real font files into the PDF so text prints sharp and exactly as shown. That needs the font file.

- **Inter**, **Alegreya** and **Alegreya SC** come with the app and are always embedded.
- Fonts you **upload** in Settings → **Fonts** (TTF or OTF) are embedded too.
- **Georgia**, **Arial**, **Times New Roman** and **Courier New** are fonts from your computer, and the app doesn't have their files. Text in them is printed as a 600 dpi picture instead. After the export, a message names the font.

To fix it, upload the font file in **Fonts** (or switch to a font that came with the app) and export again. If you opened a project on another device, make sure its fonts came with it: backup files and project folders carry uploaded fonts, but not fonts from your computer. See [Fonts](help:fonts).

## Blurry pictures and the low DPI warning

A picture with too few pixels for its printed size looks soft or blocky on paper. Hearthside Cardworks warns you when a picture would print below about **300 DPI** (dots per inch):

- an orange **!** badge at the top right of the picture on the canvas,
- _Prints at about … DPI_ in the picture's properties,
- and a list of the affected cards after you export the PDF.

To fix it:

- use a bigger image (at 300 DPI, a 54 mm wide art box needs about 640 pixels across),
- make the picture smaller on the card, or zoom it out inside its art box,
- or use an SVG, which stays sharp at any size.

## Backs don't line up with the fronts

1. In **Print**, set **Double-sided flip (match your printer)** to the same setting your printer uses: **Long edge** or **Short edge**. Most printers flip on the long edge by default.
2. Press **Alignment test** and print that page double-sided, at 100% (see the next section).
3. Hold the sheet up to the light. The crosshairs on both sides should sit on top of each other.
4. If they don't, read on the back's mm scales how far off the front's crosshair is, and type that into **Back offset X** and **Back offset Y**. Print the test again to check.

Feeding sheets by hand? The **Backs** option under **Sheets** makes a backs-only PDF that's still mirrored, to print on the back of your printed fronts. See [Double-sided printing](help:double-sided).

## Cards come out the wrong size

The PDF is made to the exact mm, but many print windows shrink pages to fit by default. When you print:

- choose **100%**, **Actual size** or **No scaling**,
- and turn off **Fit to page**, **Shrink to fit** or **Scale to fit**.

Then check a printed card with a ruler. See [Checking the print](help:checking-print).

## Windows protected your PC

The Windows app isn't signed with a paid certificate, so Windows warns you the first time. Click **More info**, then **Run anyway**. See [Desktop app (Windows and Linux)](help:desktop-app).

## Where are my files

- **Website**: your projects are stored inside the browser you made them in, on that device only. Exports (PDF, images…) go to your browser's **Downloads** folder.
- **Desktop app**: each project is a folder, by default in **Documents/Hearthside Cardworks/**. In the editor, ☰ → **Show project folder** opens it. Exports go wherever you chose in the **Save as** window.

## Folder not found

In the desktop app, a project shows **Folder not found · click to locate it** when its folder was moved, renamed or is on a drive that isn't plugged in. Click the project (or ⋯ → **Locate folder…**) and choose the folder where it is now. If you no longer have it, ⋯ → **Remove…** takes it off the list.

## Restored from backup message

If the app couldn't read a project's main file, for example because the computer lost power during a save, it opens the newest good copy instead and tells you: _project.json could not be read, so the project was restored from …_. Your project is fine; check your last few changes in case they're missing. The next save writes the main file again.

A message that **files are missing from the project folder** means some pictures or fonts are no longer in its `images` or `fonts` folder. Put them back with the same names, or upload them again.

## My projects are gone from the website

The website keeps projects in your browser. They disappear if the browser's data for this site is cleared, if you use a private window, or if you open the site in a different browser or on a different device.

If you have a backup file, press **Import** on the Home screen to bring the project back. If not, they can't be recovered. From now on:

- export a backup file now and then (**Export ▾** → **Project backup file**),
- or use the desktop app, which saves ordinary files you can copy.

## The save indicator says Not saved

Something stopped the save, such as a full disk or a folder the app can no longer reach. Export a backup file (**Export ▾** → **Project backup file**) straight away so nothing is lost, then sort out the cause and keep working.

## See also

- [Printing on paper](help:printing)
- [Double-sided printing](help:double-sided)
- [Checking the print](help:checking-print)
- [Projects, saving and backups](help:projects)
