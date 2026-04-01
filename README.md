# Project Check-in Plugin for Obsidian

A sidebar plugin for tracking weekly check-ins with project groups — built for teachers, coaches, and mentors who supervise multiple teams.

---

## What it does

The plugin gives you a dashboard in Obsidian's sidebar where you can track whether each project group has had their weekly check-in. It also lets you open and write structured notes for each individual check-in meeting.

**Key features:**

- **Registers** — create one register per course or cohort (e.g. "Social Impact Apps 2025"), each stored as a Markdown file in your vault
- **Check-in grid** — a table of groups × weeks where you tick off completed check-ins at a glance
- **Coverage stats** — see the overall check-in rate (e.g. `Coverage: 72% · 26/36`) at the bottom of the dashboard
- **Weekly notes** — open a structured note for any group/week cell directly from the table; the note is auto-created with your configured sections and questions
- **Fully customisable sections** — edit the sections and questions that appear in every weekly note from the plugin settings

---

## Getting started

### Installation

This plugin is not yet listed in the Obsidian Community Plugins directory. To install it manually:

1. Download or clone this repository
2. Copy the folder into your vault's `.obsidian/plugins/` directory
3. In Obsidian, go to **Settings → Community plugins**, disable Safe mode if needed, and enable **Project Check-in**

### Basic workflow

1. Click the **clipboard icon** in the left ribbon (or run the command `Open project check-in dashboard`) to open the sidebar panel
2. Click **+ New register** and give it a name and optional folder (e.g. `Courses/Social Impact`)
3. Add your groups with the **+ Group** button
4. Each week, click **+ Week (Wxx)** to add the current ISO week column
5. Tick the checkbox for each group you've checked in with
6. Click the note icon on any cell to open (or create) the structured meeting note for that group and week

---

## Weekly notes

When you open a note for the first time, the plugin creates a Markdown file at:

```
<register folder>/<group name>/<weekly notes subfolder>/<group> - <week>.md
```

The note is pre-filled with all your configured sections and questions, ready to fill in during or after the meeting.

The note file is linked back into the register's frontmatter so the note icon in the grid turns highlighted once a note exists.

---

## Settings

Open **Settings → Project Check-in** to configure:

| Setting | Description |
|---|---|
| **Weekly notes subfolder** | The subfolder created inside each group's folder for weekly notes. Defaults to `Weekly notes`. |
| **Sections** | The sections and reflection questions generated in every new weekly note. Add, remove, reorder, and rename sections and their questions freely. Changes apply to newly created notes only. |

The default sections and questions are written in Dutch and cover progress, collaboration, client contact, technical choices, reflection, and risk — but you can replace them with anything that fits your context.

---

## Data storage

Registers are plain Markdown files with YAML frontmatter. All check-in data (groups, weeks, ticked cells, note links) lives in the frontmatter of the register file, so it is fully portable and version-controllable.

```yaml
---
type: project-checkin
name: "Social Impact Apps 2025"
groups:
  - Booomtech
  - Team Falcon
weeks:
  - W14
  - W15
data:
  Booomtech:
    W14: true
    W14_note: "[[Booomtech - W14]]"
    W15: false
  Team Falcon:
    W14: true
    W15: true
---
```

---

## Development

```bash
# Install dependencies
npm install

# Build once
npm run build

# Watch for changes
npm run dev
```

Requires Node.js. Built with TypeScript and the Obsidian Plugin API.
