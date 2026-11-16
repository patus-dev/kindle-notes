# Kindle Notes

A tiny notes website built to run on the **Kindle's experimental web browser**.

This solves a very small problem: I wanted a place to write down short notes and
read them on an e-ink screen, from any of my devices. It is a minuscule problem,
but the result turned out to be a genuinely useful little tool, so here it is.

## Why

- The Kindle browser is old, slow and e-ink only: no fancy frameworks, no
  animations, no modern JS syntax.
- I use several devices, with the Kindle mostly as a **display**, so everything
  lives on the **server** and every device sees the same notes.
- Notes are short on purpose, shown one card at a time in big monospace text,
  which is easy to read on e-ink.

## Features

- **One note at a time**, with previous / next arrows (they only show up when
  there is a note on that side).
- **Create, edit and delete** short notes.
- **Trash on the server**: deleted notes are kept for a configurable time
  (1 day by default), can be **restored**, and are removed for good after that
  or when deleted from the trash. Every device shares the same trash.
- **Manual refresh**: the page updates when you press the refresh button, with
  no polling and no automatic redraws, which is friendlier to e-ink.
- **Flip mode**: rotates the note card and the header icons so you can use the
  Kindle lying down. The header stays fixed at the top.
- **E-ink friendly UI**: high contrast, thick borders, square pixel-art icons,
  and dashed borders to show the "trash" and "new note" modes.
- **Kindle browser compatible front-end**: plain HTML, CSS and ES5 JavaScript
  using `XMLHttpRequest`, in a single file, with no build step and no
  dependencies.
- **No external database**: the `data/` folder *is* the database. Notes and
  trash live in two small JSON files (`notes.json` and `trash.json`), written
  atomically (write to a temp file, then rename).

## Planned

Things I intend to add:

- [ ] **Error notices**: show clear messages on the page (server offline,
  failed save, etc.) instead of silent failures or `alert()` pop-ups.
- [ ] **Automatic refresh timer**: periodic `GET`s so the Kindle stays up to
  date without pressing the refresh button.
- [ ] **Smarter `GET`**: only receive the full list when something actually
  changed (for example with a version/ETag check and a `304 Not Modified`
  response), to save bandwidth and avoid pointless e-ink redraws.
- [ ] **Notes counter**: show the current position and total (e.g. `3/12`).

## Header buttons

| Button  | Action |
| ------- | ------ |
| New     | Opens an empty note to write |
| Refresh | Fetches the latest notes (or trash) from the server |
| Flip    | Rotates the interface for lying-down use |
| Trash   | Opens / closes the trash |

Inside a note: **edit / save / restore** on the right, and
**trash / cancel / delete forever** on the left, depending on the mode.

## Tech stack

- **Server:** Node.js + Express (`cors`, `express.json`), JSON files for storage.
- **Front-end:** one static `public/index.html`, served by the same server.
- **Container:** `node:22-alpine`, running as the unprivileged `node` user.

## API

| Method   | Endpoint                 | Description |
| -------- | ------------------------ | ----------- |
| `GET`    | `/api/notes`             | List notes |
| `POST`   | `/api/notes`             | Create a note (`{ "text": "..." }`) |
| `PUT`    | `/api/notes/:id`         | Edit a note (`{ "text": "..." }`) |
| `DELETE` | `/api/notes/:id`         | Move a note to the trash |
| `GET`    | `/api/trash`             | List trashed notes |
| `POST`   | `/api/trash/:id/restore` | Restore a note from the trash |
| `DELETE` | `/api/trash/:id`         | Permanently delete a note |

All responses are sent with `Cache-Control: no-store`, because the Kindle
browser caches aggressively. Text longer than the limit is truncated by the
server.

## Configuration

Everything is optional and set through environment variables:

| Variable          | Default      | Description |
| ----------------- | ------------ | ----------- |
| `PORT`            | `3000`       | Port the server listens on |
| `DATA_PATH`       | `data`       | Data folder, relative to the app folder |
| `NOTES_FILE`      | `notes.json` | Notes file name inside `DATA_PATH` |
| `TRASH_FILE`      | `trash.json` | Trash file name inside `DATA_PATH` |
| `MAX_TEXT_LENGTH` | `200`        | Max characters per note |
| `TRASH_DAYS`      | `1`          | Days a deleted note stays in the trash |

## Running

### With Node

```bash
npm install
node server.js
```

On start, the server prints the local network addresses you can open from the
Kindle, for example `http://192.168.0.10:3000`.

### With Docker

A `Dockerfile` is included to bring everything up quickly, build and run it:

```bash
# build the image
docker build -t kindle-notes .

# run it
docker run -d --name kindle-notes -p 3000:3000 kindle-notes
```

Then open `http://<your-server-ip>:3000` in the Kindle browser.

### Where the data lives

The database is the `data/` folder (`notes.json` and `trash.json`), and it
stays **inside the container**. The `data/` folder from the repository is
copied into the image, and the server reads and writes it there.

- Stopping, starting or restarting the container keeps your notes.
- Removing the container (`docker rm`) or rebuilding the image and creating a
  new container starts again from the `data/` that was in the repository.

If you want the notes to survive that too, mount a volume on `/app/data`
(optional):

```bash
docker run -d --name kindle-notes \
  -p 3000:3000 \
  -v kindle-notes-data:/app/data \
  kindle-notes
```

On the first run, Docker fills the volume with the `data/` folder that ships
with the image. From then on the volume is the source of truth.

The same commands work with Podman: just replace `docker` with `podman`.

> Using a host folder instead (`-v ./data:/app/data`)? It must be writable by
> the container user (UID 1000): `sudo chown -R 1000:1000 ./data`. With
> rootless Podman, add `:U` to the mount instead.

## Using it on the Kindle

1. Make sure the Kindle and the server are on the same network (or expose the
   server through a reverse proxy / tunnel).
2. Open the Kindle's **Experimental Browser**.
3. Go to the server address and bookmark it.

## Project structure

```
.
├── Dockerfile
├── README.md
├── package.json
├── server.js        # Express API + static file server
├── public/
│   └── index.html   # the whole front-end: HTML + CSS + JS
└── data/            # the database: notes.json and trash.json
```

## License

Free for anyone to download, use, modify and share. Released under the MIT License.
