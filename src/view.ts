import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import CheckinPlugin from "./main";
import { RegisterData } from "./types";
import { NewRegisterModal } from "./NewRegisterModal";
import { AddGroupModal } from "./AddGroupModal";

export const VIEW_TYPE_CHECKIN = "project-checkin-view";

function getISOWeek(d: Date): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const w1 = new Date(date.getFullYear(), 0, 4);
  return (
    "W" +
    String(
      1 +
        Math.round(
          ((date.getTime() - w1.getTime()) / 86400000 -
            3 +
            ((w1.getDay() + 6) % 7)) /
            7
        )
    ).padStart(2, "0")
  );
}

export class CheckinView extends ItemView {
  plugin: CheckinPlugin;
  currentFilePath: string | null = null;
  private isSaving = false;
  private renderTimeout: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: CheckinPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_CHECKIN;
  }
  getDisplayText() {
    return "Project Check-ins";
  }
  getIcon() {
    return "clipboard-list";
  }

  async onOpen() {
    await this.render();

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.isSaving) return;
        const current = this.getCurrentFile();
        if (current && file.path === current.path) {
          this.scheduleRender();
        }
      })
    );

    // Also re-render when files are created/deleted (registers may appear/disappear)
    this.registerEvent(
      this.app.vault.on("create", () => this.scheduleRender())
    );
    this.registerEvent(
      this.app.vault.on("delete", () => this.scheduleRender())
    );
    this.registerEvent(
      this.app.vault.on("rename", () => this.scheduleRender())
    );
  }

  async onClose() {}

  private scheduleRender() {
    if (this.renderTimeout !== null) clearTimeout(this.renderTimeout);
    this.renderTimeout = window.setTimeout(async () => {
      await this.render();
      this.renderTimeout = null;
    }, 150);
  }

  private getCurrentFile(): TFile | null {
    if (!this.currentFilePath) return null;
    const f = this.app.vault.getAbstractFileByPath(this.currentFilePath);
    return f instanceof TFile ? f : null;
  }

  private getRegisterFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles().filter((f) => {
      const cache = this.app.metadataCache.getFileCache(f);
      return cache?.frontmatter?.["type"] === "project-checkin";
    });
  }

  async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("checkin-view");

    const registers = this.getRegisterFiles();

    // ── Header ────────────────────────────────────────────────
    const header = container.createEl("div", { cls: "checkin-header" });
    const titleRow = header.createEl("div", { cls: "checkin-title-row" });
    titleRow.createEl("span", {
      text: "Project Check-ins",
      cls: "checkin-title",
    });
    const newBtn = titleRow.createEl("button", {
      text: "+ New register",
      cls: "checkin-btn-primary",
    });
    newBtn.addEventListener("click", () => {
      new NewRegisterModal(this.app, this.plugin, async (file) => {
        this.currentFilePath = file.path;
        await this.render();
      }).open();
    });

    if (registers.length === 0) {
      container.createEl("div", {
        text: 'No registers found. Click "+ New register" to create one.',
        cls: "checkin-empty",
      });
      return;
    }

    // Validate currentFile still exists
    const currentExists =
      this.currentFilePath &&
      registers.find((f) => f.path === this.currentFilePath);
    if (!currentExists) {
      this.currentFilePath = registers[0].path;
    }

    const currentFile = this.getCurrentFile()!;

    // Register switcher
    const switcherRow = header.createEl("div", { cls: "checkin-switcher-row" });
    switcherRow.createEl("label", { text: "Register", cls: "checkin-label" });
    const select = switcherRow.createEl("select", { cls: "checkin-select" });
    registers.forEach((f) => {
      const opt = select.createEl("option", {
        text: f.basename,
        value: f.path,
      });
      if (f.path === this.currentFilePath) opt.selected = true;
    });
    select.addEventListener("change", async () => {
      this.currentFilePath = select.value;
      await this.render();
    });

    // ── Read frontmatter ──────────────────────────────────────
    const cache = this.app.metadataCache.getFileCache(currentFile);
    const fm = cache?.frontmatter ?? {};
    const groups: string[] = Array.isArray(fm.groups) ? [...fm.groups] : [];
    const weeks: string[] = Array.isArray(fm.weeks) ? [...fm.weeks] : [];
    const rawData = fm.data;
    const data: RegisterData =
      rawData && typeof rawData === "object" ? rawData : {};
    const currentWeek = getISOWeek(new Date());

    const body = container.createEl("div", { cls: "checkin-body" });

    if (groups.length === 0 || weeks.length === 0) {
      body.createEl("p", {
        text:
          groups.length === 0
            ? 'Add a group with the "+ Group" button below to get started.'
            : 'Add a week with the "+ Week" button below to start tracking.',
        cls: "checkin-muted checkin-hint",
      });
    } else {
      this.renderTable(body, groups, weeks, data, currentWeek);
    }

    // ── Controls ──────────────────────────────────────────────
    const controls = body.createEl("div", { cls: "checkin-controls" });

    // Coverage stat
    const possible = weeks.length * groups.length;
    const grand = groups.reduce(
      (sum, g) =>
        sum +
        weeks.filter(
          (w) => data[g]?.[w] === true || data[g]?.[w] === "true"
        ).length,
      0
    );
    const pct = possible > 0 ? Math.round((grand / possible) * 100) : 0;
    controls.createEl("span", {
      text: possible > 0 ? `Coverage: ${pct}% · ${grand}/${possible}` : "",
      cls: "checkin-muted",
    });

    const btnGroup = controls.createEl("div", { cls: "checkin-ctrl-btns" });

    const addGroupBtn = btnGroup.createEl("button", {
      text: "+ Group",
      cls: "checkin-btn",
    });
    addGroupBtn.addEventListener("click", () => {
      new AddGroupModal(this.app, async (name) => {
        await this.addGroup(name, weeks, currentFile);
      }).open();
    });

    const addWeekBtn = btnGroup.createEl("button", {
      text: `+ Week (${currentWeek})`,
      cls: "checkin-btn",
    });
    if (weeks.includes(currentWeek)) addWeekBtn.disabled = true;
    addWeekBtn.addEventListener("click", async () => {
      await this.addWeek(currentWeek, groups, currentFile);
    });
  }

  private renderTable(
    container: HTMLElement,
    groups: string[],
    weeks: string[],
    data: RegisterData,
    currentWeek: string
  ) {
    const wrap = container.createEl("div", { cls: "checkin-table-wrap" });
    const table = wrap.createEl("table", { cls: "checkin-table" });

    // Head
    const thead = table.createEl("thead");
    const hrow = thead.createEl("tr");
    hrow.createEl("th", { text: "Group", cls: "checkin-th checkin-th-group" });
    weeks.forEach((w) => {
      hrow.createEl("th", {
        text: w,
        cls: `checkin-th${w === currentWeek ? " checkin-current-week" : ""}`,
      });
    });
    hrow.createEl("th", { text: "Total", cls: "checkin-th" });

    // Body
    const tbody = table.createEl("tbody");
    groups.forEach((group) => {
      const tr = tbody.createEl("tr");
      tr.createEl("td", {
        text: group,
        cls: "checkin-td checkin-td-group",
      });
      let total = 0;
      weeks.forEach((w) => {
        const td = tr.createEl("td", {
          cls: `checkin-td checkin-td-check${w === currentWeek ? " checkin-current-week" : ""}`,
        });
        const cell = td.createEl("div", { cls: "checkin-cell" });

        const checked = !!(
          data[group]?.[w] === true || data[group]?.[w] === "true"
        );
        if (checked) total++;

        const cb = cell.createEl("input", {
          type: "checkbox",
          cls: "checkin-checkbox",
        });
        cb.checked = checked;
        cb.addEventListener("change", async () => {
          await this.toggleCheckin(group, w, cb.checked);
        });

        const noteBtn = cell.createEl("button", {
          cls: "checkin-note-btn",
          attr: { title: `Open note: ${group} — ${w}` },
        });
        setIcon(noteBtn, "file-text");
        if (data[group]?.[`${w}_note`]) {
          noteBtn.addClass("checkin-note-btn--exists");
        }
        noteBtn.addEventListener("click", () =>
          this.openWeeklyNote(group, w)
        );
      });
      tr.createEl("td", {
        text: `${total}/${weeks.length}`,
        cls: "checkin-td checkin-td-total",
      });
    });

    // Footer
    const tfoot = table.createEl("tfoot");
    const frow = tfoot.createEl("tr");
    frow.createEl("td", {
      text: "Checked in",
      cls: "checkin-td checkin-td-group checkin-footer-label",
    });
    weeks.forEach((w) => {
      const count = groups.filter(
        (g) => data[g]?.[w] === true || data[g]?.[w] === "true"
      ).length;
      frow.createEl("td", {
        text: `${count}/${groups.length}`,
        cls: `checkin-td checkin-footer-count${w === currentWeek ? " checkin-current-week" : ""}`,
      });
    });
    frow.createEl("td", { cls: "checkin-td" });
  }

  private async toggleCheckin(group: string, week: string, checked: boolean) {
    const file = this.getCurrentFile();
    if (!file) return;
    this.isSaving = true;
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!fm.data || typeof fm.data !== "object") fm.data = {};
        if (!fm.data[group]) fm.data[group] = {};
        fm.data[group][week] = checked;
      });
    } finally {
      this.isSaving = false;
    }
  }

  private async addWeek(week: string, groups: string[], file: TFile) {
    this.isSaving = true;
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!Array.isArray(fm.weeks)) fm.weeks = [];
        if (!fm.weeks.includes(week)) fm.weeks.push(week);
        if (!fm.data || typeof fm.data !== "object") fm.data = {};
        groups.forEach((g) => {
          if (!fm.data[g]) fm.data[g] = {};
          if (fm.data[g][week] === undefined) fm.data[g][week] = false;
        });
      });
    } finally {
      this.isSaving = false;
    }
    await this.render();
  }

  private async addGroup(name: string, weeks: string[], file: TFile) {
    this.isSaving = true;
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!Array.isArray(fm.groups)) fm.groups = [];
        if (!fm.groups.includes(name)) fm.groups.push(name);
        if (!fm.data || typeof fm.data !== "object") fm.data = {};
        if (!fm.data[name]) fm.data[name] = {};
        weeks.forEach((w) => {
          if (fm.data[name][w] === undefined) fm.data[name][w] = false;
        });
      });
    } finally {
      this.isSaving = false;
    }
    await this.render();
  }

  private async openWeeklyNote(group: string, week: string) {
    const file = this.getCurrentFile();
    if (!file) return;

    const parentPath = file.parent?.path ?? "";
    const folder = [parentPath, group, this.plugin.settings.notesSubfolder]
      .filter(Boolean)
      .join("/");
    const filePath = `${folder}/${group} - ${week}.md`;

    // Ensure folder exists
    const parts = folder.split("/").filter(Boolean);
    let built = "";
    for (const part of parts) {
      built = built ? `${built}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(built)) {
        await this.app.vault.createFolder(built);
      }
    }

    let noteFile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(noteFile instanceof TFile)) {
      const content = this.buildNoteContent(group, week, file.basename);
      await this.app.vault.create(filePath, content);
      noteFile = this.app.vault.getAbstractFileByPath(filePath);

      // Record the note link in the register
      this.isSaving = true;
      try {
        await this.app.fileManager.processFrontMatter(file, (fm) => {
          if (!fm.data || typeof fm.data !== "object") fm.data = {};
          if (!fm.data[group]) fm.data[group] = {};
          fm.data[group][`${week}_note`] = `[[${group} - ${week}]]`;
        });
      } finally {
        this.isSaving = false;
      }
    }

    if (noteFile instanceof TFile) {
      this.app.workspace.getLeaf(false).openFile(noteFile);
    }
  }

  private buildNoteContent(
    group: string,
    week: string,
    registerName: string
  ): string {
    const sections = this.plugin.settings.sections
      .map(
        (s) =>
          `## ${s.title}\n${s.questions.map((q) => `- ${q}`).join("\n")}`
      )
      .join("\n\n");

    return `---
group: "[[${group}]]"
week: ${week}
register: "[[${registerName}]]"
---

# ${group} — ${week}

${sections}

---

## 📋 Notities

`;
  }
}
