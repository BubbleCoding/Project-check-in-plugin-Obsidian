var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CheckinPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/view.ts
var import_obsidian3 = require("obsidian");

// src/NewRegisterModal.ts
var import_obsidian = require("obsidian");
var NewRegisterModal = class extends import_obsidian.Modal {
  constructor(app, plugin, onSubmit) {
    super(app);
    this.name = "";
    this.folder = "";
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "New check-in register" });
    new import_obsidian.Setting(contentEl).setName("Register name").setDesc('e.g. "Social Impact Apps 2025"').addText((text) => {
      text.setPlaceholder("Register name").onChange((v) => {
        this.name = v.trim();
      });
      text.inputEl.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") await this.submit();
      });
    });
    new import_obsidian.Setting(contentEl).setName("Folder").setDesc("Vault folder to create the register in (leave empty for root)").addText(
      (text) => text.setPlaceholder("e.g. Courses/Social Impact").onChange((v) => this.folder = v.trim())
    );
    new import_obsidian.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Create").setCta().onClick(() => this.submit())
    );
  }
  async submit() {
    if (!this.name) return;
    const file = await this.createRegister();
    if (file) {
      this.onSubmit(file);
      this.close();
    }
  }
  async createRegister() {
    const filePath = (0, import_obsidian.normalizePath)(
      this.folder ? `${this.folder}/${this.name}.md` : `${this.name}.md`
    );
    if (this.folder) {
      const parts = this.folder.split("/");
      let built = "";
      for (const part of parts) {
        built = built ? `${built}/${part}` : part;
        if (!this.app.vault.getAbstractFileByPath(built)) {
          await this.app.vault.createFolder(built);
        }
      }
    }
    const content = `---
type: project-checkin
name: "${this.name}"
groups: []
weeks: []
data: {}
---

# ${this.name}
`;
    try {
      return await this.app.vault.create(filePath, content);
    } catch (e) {
      console.error("Failed to create register:", e);
      return null;
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/AddGroupModal.ts
var import_obsidian2 = require("obsidian");
var AddGroupModal = class extends import_obsidian2.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.name = "";
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Add group" });
    new import_obsidian2.Setting(contentEl).setName("Group name").addText((text) => {
      text.setPlaceholder("e.g. Booomtech").onChange((v) => {
        this.name = v.trim();
      });
      text.inputEl.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && this.name) {
          await this.onSubmit(this.name);
          this.close();
        }
      });
      text.inputEl.focus();
    });
    new import_obsidian2.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Add").setCta().onClick(async () => {
        if (this.name) {
          await this.onSubmit(this.name);
          this.close();
        }
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/view.ts
var VIEW_TYPE_CHECKIN = "project-checkin-view";
function getISOWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const w1 = new Date(date.getFullYear(), 0, 4);
  return "W" + String(
    1 + Math.round(
      ((date.getTime() - w1.getTime()) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7
    )
  ).padStart(2, "0");
}
var CheckinView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.currentFilePath = null;
    this.isSaving = false;
    this.renderTimeout = null;
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
  async onClose() {
  }
  scheduleRender() {
    if (this.renderTimeout !== null) clearTimeout(this.renderTimeout);
    this.renderTimeout = window.setTimeout(async () => {
      await this.render();
      this.renderTimeout = null;
    }, 150);
  }
  getCurrentFile() {
    if (!this.currentFilePath) return null;
    const f = this.app.vault.getAbstractFileByPath(this.currentFilePath);
    return f instanceof import_obsidian3.TFile ? f : null;
  }
  getRegisterFiles() {
    return this.app.vault.getMarkdownFiles().filter((f) => {
      var _a;
      const cache = this.app.metadataCache.getFileCache(f);
      return ((_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a["type"]) === "project-checkin";
    });
  }
  async render() {
    var _a;
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("checkin-view");
    const registers = this.getRegisterFiles();
    const header = container.createEl("div", { cls: "checkin-header" });
    const titleRow = header.createEl("div", { cls: "checkin-title-row" });
    titleRow.createEl("span", {
      text: "Project Check-ins",
      cls: "checkin-title"
    });
    const newBtn = titleRow.createEl("button", {
      text: "+ New register",
      cls: "checkin-btn-primary"
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
        cls: "checkin-empty"
      });
      return;
    }
    const currentExists = this.currentFilePath && registers.find((f) => f.path === this.currentFilePath);
    if (!currentExists) {
      this.currentFilePath = registers[0].path;
    }
    const currentFile = this.getCurrentFile();
    const switcherRow = header.createEl("div", { cls: "checkin-switcher-row" });
    switcherRow.createEl("label", { text: "Register", cls: "checkin-label" });
    const select = switcherRow.createEl("select", { cls: "checkin-select" });
    registers.forEach((f) => {
      const opt = select.createEl("option", {
        text: f.basename,
        value: f.path
      });
      if (f.path === this.currentFilePath) opt.selected = true;
    });
    select.addEventListener("change", async () => {
      this.currentFilePath = select.value;
      await this.render();
    });
    const cache = this.app.metadataCache.getFileCache(currentFile);
    const fm = (_a = cache == null ? void 0 : cache.frontmatter) != null ? _a : {};
    const groups = Array.isArray(fm.groups) ? [...fm.groups] : [];
    const weeks = Array.isArray(fm.weeks) ? [...fm.weeks] : [];
    const rawData = fm.data;
    const data = rawData && typeof rawData === "object" ? rawData : {};
    const currentWeek = getISOWeek(/* @__PURE__ */ new Date());
    const body = container.createEl("div", { cls: "checkin-body" });
    if (groups.length === 0 || weeks.length === 0) {
      body.createEl("p", {
        text: groups.length === 0 ? 'Add a group with the "+ Group" button below to get started.' : 'Add a week with the "+ Week" button below to start tracking.',
        cls: "checkin-muted checkin-hint"
      });
    } else {
      this.renderTable(body, groups, weeks, data, currentWeek);
    }
    const controls = body.createEl("div", { cls: "checkin-controls" });
    const possible = weeks.length * groups.length;
    const grand = groups.reduce(
      (sum, g) => sum + weeks.filter(
        (w) => {
          var _a2, _b;
          return ((_a2 = data[g]) == null ? void 0 : _a2[w]) === true || ((_b = data[g]) == null ? void 0 : _b[w]) === "true";
        }
      ).length,
      0
    );
    const pct = possible > 0 ? Math.round(grand / possible * 100) : 0;
    controls.createEl("span", {
      text: possible > 0 ? `Coverage: ${pct}% \xB7 ${grand}/${possible}` : "",
      cls: "checkin-muted"
    });
    const btnGroup = controls.createEl("div", { cls: "checkin-ctrl-btns" });
    const addGroupBtn = btnGroup.createEl("button", {
      text: "+ Group",
      cls: "checkin-btn"
    });
    addGroupBtn.addEventListener("click", () => {
      new AddGroupModal(this.app, async (name) => {
        await this.addGroup(name, weeks, currentFile);
      }).open();
    });
    const addWeekBtn = btnGroup.createEl("button", {
      text: `+ Week (${currentWeek})`,
      cls: "checkin-btn"
    });
    if (weeks.includes(currentWeek)) addWeekBtn.disabled = true;
    addWeekBtn.addEventListener("click", async () => {
      await this.addWeek(currentWeek, groups, currentFile);
    });
  }
  renderTable(container, groups, weeks, data, currentWeek) {
    const wrap = container.createEl("div", { cls: "checkin-table-wrap" });
    const table = wrap.createEl("table", { cls: "checkin-table" });
    const thead = table.createEl("thead");
    const hrow = thead.createEl("tr");
    hrow.createEl("th", { text: "Group", cls: "checkin-th checkin-th-group" });
    weeks.forEach((w) => {
      hrow.createEl("th", {
        text: w,
        cls: `checkin-th${w === currentWeek ? " checkin-current-week" : ""}`
      });
    });
    hrow.createEl("th", { text: "Total", cls: "checkin-th" });
    const tbody = table.createEl("tbody");
    groups.forEach((group) => {
      const tr = tbody.createEl("tr");
      tr.createEl("td", {
        text: group,
        cls: "checkin-td checkin-td-group"
      });
      let total = 0;
      weeks.forEach((w) => {
        var _a, _b, _c;
        const td = tr.createEl("td", {
          cls: `checkin-td checkin-td-check${w === currentWeek ? " checkin-current-week" : ""}`
        });
        const cell = td.createEl("div", { cls: "checkin-cell" });
        const checked = !!(((_a = data[group]) == null ? void 0 : _a[w]) === true || ((_b = data[group]) == null ? void 0 : _b[w]) === "true");
        if (checked) total++;
        const cb = cell.createEl("input", {
          type: "checkbox",
          cls: "checkin-checkbox"
        });
        cb.checked = checked;
        cb.addEventListener("change", async () => {
          await this.toggleCheckin(group, w, cb.checked);
        });
        const noteBtn = cell.createEl("button", {
          cls: "checkin-note-btn",
          attr: { title: `Open note: ${group} \u2014 ${w}` }
        });
        (0, import_obsidian3.setIcon)(noteBtn, "file-text");
        if ((_c = data[group]) == null ? void 0 : _c[`${w}_note`]) {
          noteBtn.addClass("checkin-note-btn--exists");
        }
        noteBtn.addEventListener(
          "click",
          () => this.openWeeklyNote(group, w)
        );
      });
      tr.createEl("td", {
        text: `${total}/${weeks.length}`,
        cls: "checkin-td checkin-td-total"
      });
    });
    const tfoot = table.createEl("tfoot");
    const frow = tfoot.createEl("tr");
    frow.createEl("td", {
      text: "Checked in",
      cls: "checkin-td checkin-td-group checkin-footer-label"
    });
    weeks.forEach((w) => {
      const count = groups.filter(
        (g) => {
          var _a, _b;
          return ((_a = data[g]) == null ? void 0 : _a[w]) === true || ((_b = data[g]) == null ? void 0 : _b[w]) === "true";
        }
      ).length;
      frow.createEl("td", {
        text: `${count}/${groups.length}`,
        cls: `checkin-td checkin-footer-count${w === currentWeek ? " checkin-current-week" : ""}`
      });
    });
    frow.createEl("td", { cls: "checkin-td" });
  }
  async toggleCheckin(group, week, checked) {
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
  async addWeek(week, groups, file) {
    this.isSaving = true;
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!Array.isArray(fm.weeks)) fm.weeks = [];
        if (!fm.weeks.includes(week)) fm.weeks.push(week);
        if (!fm.data || typeof fm.data !== "object") fm.data = {};
        groups.forEach((g) => {
          if (!fm.data[g]) fm.data[g] = {};
          if (fm.data[g][week] === void 0) fm.data[g][week] = false;
        });
      });
    } finally {
      this.isSaving = false;
    }
    await this.render();
  }
  async addGroup(name, weeks, file) {
    this.isSaving = true;
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!Array.isArray(fm.groups)) fm.groups = [];
        if (!fm.groups.includes(name)) fm.groups.push(name);
        if (!fm.data || typeof fm.data !== "object") fm.data = {};
        if (!fm.data[name]) fm.data[name] = {};
        weeks.forEach((w) => {
          if (fm.data[name][w] === void 0) fm.data[name][w] = false;
        });
      });
    } finally {
      this.isSaving = false;
    }
    await this.render();
  }
  async openWeeklyNote(group, week) {
    var _a, _b;
    const file = this.getCurrentFile();
    if (!file) return;
    const parentPath = (_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : "";
    const folder = [parentPath, group, this.plugin.settings.notesSubfolder].filter(Boolean).join("/");
    const filePath = `${folder}/${group} - ${week}.md`;
    const parts = folder.split("/").filter(Boolean);
    let built = "";
    for (const part of parts) {
      built = built ? `${built}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(built)) {
        await this.app.vault.createFolder(built);
      }
    }
    let noteFile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(noteFile instanceof import_obsidian3.TFile)) {
      const content = this.buildNoteContent(group, week, file.basename);
      await this.app.vault.create(filePath, content);
      noteFile = this.app.vault.getAbstractFileByPath(filePath);
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
    if (noteFile instanceof import_obsidian3.TFile) {
      this.app.workspace.getLeaf(false).openFile(noteFile);
    }
  }
  buildNoteContent(group, week, registerName) {
    const sections = this.plugin.settings.sections.map(
      (s) => `## ${s.title}
${s.questions.map((q) => `- ${q}`).join("\n")}`
    ).join("\n\n");
    return `---
group: "[[${group}]]"
week: ${week}
register: "[[${registerName}]]"
---

# ${group} \u2014 ${week}

${sections}

---

## \u{1F4CB} Notities

`;
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  notesSubfolder: "Weekly notes",
  sections: [
    {
      title: "\u{1F5D3}\uFE0F Voortgang & planning",
      questions: [
        "Wat hebben jullie deze week bereikt, en loopt dat naar plan?",
        "Wat staat er voor de komende sprint/week op de planning?",
        "Zijn er taken die langer duren dan verwacht? Waardoor?"
      ]
    },
    {
      title: "\u{1F91D} Samenwerking & rolverdeling",
      questions: [
        "Wie doet wat, en is die verdeling nog eerlijk?",
        "Hoe verloopt de samenwerking binnen de groep?",
        "Is er iemand die ergens op vastloopt waar anderen bij kunnen helpen?"
      ]
    },
    {
      title: "\u{1F3E2} Opdrachtgever & context",
      questions: [
        "Hoe is het contact met het bedrijf verlopen?",
        "Zijn de verwachtingen van de opdrachtgever nog helder, of zijn er nieuwe wensen bijgekomen?",
        "Wat heeft de opdrachtgever als laatste feedback gegeven?"
      ]
    },
    {
      title: "\u{1F6E0}\uFE0F Technisch & inhoudelijk",
      questions: [
        "Welke technische keuzes hebben jullie gemaakt, en waarom?",
        "Zijn er alternatieven overwogen?",
        "Waar ben je het meest onzeker over in jullie aanpak?"
      ]
    },
    {
      title: "\u{1F4AC} Reflectie & leren",
      questions: [
        "Wat ging er goed de afgelopen periode?",
        "Wat zouden jullie anders doen als je opnieuw mocht beginnen?",
        "Wat heb jij persoonlijk geleerd deze week?"
      ]
    },
    {
      title: "\u26A0\uFE0F Risico's & obstakels",
      questions: [
        "Wat kan er misgaan de komende tijd?",
        "Zijn er afhankelijkheden buiten jullie controle (bedrijf, tools, andere partijen)?",
        "Wat hebben jullie nodig van mij of van school?"
      ]
    }
  ]
};

// src/settings.ts
var import_obsidian4 = require("obsidian");
var CheckinSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Project Check-in" });
    new import_obsidian4.Setting(containerEl).setName("Weekly notes subfolder").setDesc(
      "Subfolder created inside each group folder for weekly notes (e.g. 'Weekly notes')"
    ).addText(
      (text) => text.setValue(this.plugin.settings.notesSubfolder).onChange(async (value) => {
        this.plugin.settings.notesSubfolder = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Weekly note sections" });
    containerEl.createEl("p", {
      text: "Sections and questions generated in each weekly note. Changes apply to new notes only.",
      cls: "setting-item-description"
    });
    const sectionsEl = containerEl.createEl("div", {
      cls: "checkin-settings-sections"
    });
    this.renderSections(sectionsEl);
    new import_obsidian4.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("+ Add section").onClick(async () => {
        this.plugin.settings.sections.push({
          title: "New section",
          questions: []
        });
        await this.plugin.saveSettings();
        this.display();
      })
    );
  }
  renderSections(container) {
    container.empty();
    this.plugin.settings.sections.forEach((section, i) => {
      this.renderSection(container, section, i);
    });
  }
  renderSection(container, section, index) {
    const el = container.createEl("div", { cls: "checkin-settings-section" });
    const header = el.createEl("div", {
      cls: "checkin-settings-section-header"
    });
    const titleInput = header.createEl("input", {
      type: "text",
      cls: "checkin-settings-section-title"
    });
    titleInput.value = section.title;
    titleInput.addEventListener("change", async () => {
      section.title = titleInput.value;
      await this.plugin.saveSettings();
    });
    const btnGroup = header.createEl("div", {
      cls: "checkin-settings-btn-group"
    });
    if (index > 0) {
      const up = btnGroup.createEl("button", {
        text: "\u2191",
        attr: { title: "Move up" }
      });
      up.addEventListener("click", async () => {
        const s = this.plugin.settings.sections;
        [s[index - 1], s[index]] = [s[index], s[index - 1]];
        await this.plugin.saveSettings();
        this.display();
      });
    }
    if (index < this.plugin.settings.sections.length - 1) {
      const down = btnGroup.createEl("button", {
        text: "\u2193",
        attr: { title: "Move down" }
      });
      down.addEventListener("click", async () => {
        const s = this.plugin.settings.sections;
        [s[index], s[index + 1]] = [s[index + 1], s[index]];
        await this.plugin.saveSettings();
        this.display();
      });
    }
    const del = btnGroup.createEl("button", {
      text: "\u2715",
      cls: "checkin-settings-delete",
      attr: { title: "Delete section" }
    });
    del.addEventListener("click", async () => {
      this.plugin.settings.sections.splice(index, 1);
      await this.plugin.saveSettings();
      this.display();
    });
    const questionsEl = el.createEl("div", {
      cls: "checkin-settings-questions"
    });
    section.questions.forEach((q, qi) => {
      const row = questionsEl.createEl("div", {
        cls: "checkin-settings-question-row"
      });
      const input = row.createEl("input", {
        type: "text",
        cls: "checkin-settings-question-input"
      });
      input.value = q;
      input.addEventListener("change", async () => {
        section.questions[qi] = input.value;
        await this.plugin.saveSettings();
      });
      const qDel = row.createEl("button", {
        text: "\u2715",
        cls: "checkin-settings-delete"
      });
      qDel.addEventListener("click", async () => {
        section.questions.splice(qi, 1);
        await this.plugin.saveSettings();
        this.display();
      });
    });
    const addQ = el.createEl("button", {
      text: "+ Add question",
      cls: "checkin-settings-add-q"
    });
    addQ.addEventListener("click", async () => {
      section.questions.push("");
      await this.plugin.saveSettings();
      this.display();
    });
  }
};

// src/main.ts
var CheckinPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(
      VIEW_TYPE_CHECKIN,
      (leaf) => new CheckinView(leaf, this)
    );
    this.addRibbonIcon("clipboard-list", "Project Check-ins", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-checkin-view",
      name: "Open project check-in dashboard",
      callback: () => this.activateView()
    });
    this.addSettingTab(new CheckinSettingTab(this.app, this));
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHECKIN);
  }
  async activateView() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHECKIN);
    if (leaves.length > 0) {
      workspace.revealLeaf(leaves[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_CHECKIN, active: true });
      workspace.revealLeaf(leaf);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
