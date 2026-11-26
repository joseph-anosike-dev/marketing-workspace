# Quick save (share to Re-Search)

Share a screenshot, link or text from any Android app and Re-Search opens on
the **Quick save** page with it already filled in.

## How it works

- A shared link becomes the finding's **Source link**; the rest of the text
  becomes its **Notes**.
- Shared screenshots are shrunk like any other image and attached.
- **Title** is optional. Left blank, the finding is named by date and time
  (for example "Screenshot 2026-11-26 09:05").
- **Section** and **Project** start on what you used last time.
- After saving, **Back to what I was doing** returns you to the app you shared from.
- Nothing is linked, templated or filed for you. It is the same finding, saved faster.

## Testing on a phone

1. Install the new build over the old one.
2. Take a screenshot, tap **Share** and pick **Re-Search**. Check the image is attached.
3. Share a link from Chrome. Check it lands in **Source link**.
4. Select several screenshots in the gallery and share them together.
5. Share while Re-Search is closed, then again while it is already open.
6. Save, tap **Back to what I was doing**, then open the Vault and check the finding.

If sharing opens the app but the page is empty, the share arrived before the app
was listening. That is the first thing to report.

## Files

- `src/features/share/` holds the page, the share handling and the tests.
- `android/app/src/main/AndroidManifest.xml` has the three `intent-filter` blocks that make
  Re-Search appear in the share sheet.
- The plugin is `@capgo/capacitor-share-target` (version 8, to match Capacitor 8).
