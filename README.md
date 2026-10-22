# Noble Houses — Dynastic Family Tree

A local-first family tree app for fictional noble houses, designed for GitHub Codespaces. It is a React + Vite project and needs no database or API keys.

## Features

- Add and edit people, titles, birth/death years, and historical notes.
- Upload optional portraits and personal coats of arms.
- Create noble houses with names, mottos, notes, and house arms.
- Link spouses (reciprocal automatically) and connect parent/child relationships.
- Navigate between related people, search the register, and view a compact tree overview.
- Autosaves in the current browser using `localStorage`.
- Export and import a JSON backup.

## Run in GitHub Codespaces

1. Create or open a GitHub repository.
2. Upload/extract these files into the repository so `package.json` is in the root.
3. Open the repository in Codespaces.
4. In the terminal, run:

   ```bash
   npm install
   npm run dev
   ```

5. Codespaces should offer to open the forwarded port (usually **5173**). Click **Open in Browser**.

If the preview does not appear automatically, open the **Ports** tab and forward port `5173`.

## Important data notes

- Your records are stored in the browser's local storage for the preview URL you use. They are not automatically synced across browsers or devices.
- Use **Export backup** regularly. The JSON backup includes uploaded images.
- Images are resized to a maximum dimension of 900 px and saved as JPEG data URLs to help keep the project manageable. Use smaller images if the browser reports that storage is full.
- Importing a backup replaces the current data, so export a backup first.
- The initial example people are sample data. Delete or edit them to begin your own canon.
- The tree overview is intentionally a compact, searchable overview rather than a full-size printable genealogy chart. The relationship panel is the source of truth for exact links.

## Project structure

```text
noble-houses-family-tree/
├── index.html
├── package.json
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    └── styles.css
```

## Suggested next improvements

For a very large genealogy, a later version could add dedicated generation columns, a zoomable/pannable canvas, branch filtering, and GEDCOM import/export. Keep JSON backups in the meantime.
