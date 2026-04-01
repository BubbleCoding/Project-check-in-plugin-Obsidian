import { App, PluginSettingTab, Setting } from "obsidian";
import CheckinPlugin from "./main";
import { CheckinSection } from "./types";

export class CheckinSettingTab extends PluginSettingTab {
  plugin: CheckinPlugin;

  constructor(app: App, plugin: CheckinPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Project Check-in" });

    new Setting(containerEl)
      .setName("Weekly notes subfolder")
      .setDesc(
        "Subfolder created inside each group folder for weekly notes (e.g. 'Weekly notes')"
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.notesSubfolder)
          .onChange(async (value) => {
            this.plugin.settings.notesSubfolder = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Weekly note sections" });
    containerEl.createEl("p", {
      text: "Sections and questions generated in each weekly note. Changes apply to new notes only.",
      cls: "setting-item-description",
    });

    const sectionsEl = containerEl.createEl("div", {
      cls: "checkin-settings-sections",
    });
    this.renderSections(sectionsEl);

    new Setting(containerEl).addButton((btn) =>
      btn.setButtonText("+ Add section").onClick(async () => {
        this.plugin.settings.sections.push({
          title: "New section",
          questions: [],
        });
        await this.plugin.saveSettings();
        this.display();
      })
    );
  }

  private renderSections(container: HTMLElement) {
    container.empty();
    this.plugin.settings.sections.forEach((section, i) => {
      this.renderSection(container, section, i);
    });
  }

  private renderSection(
    container: HTMLElement,
    section: CheckinSection,
    index: number
  ) {
    const el = container.createEl("div", { cls: "checkin-settings-section" });

    // Section header row
    const header = el.createEl("div", {
      cls: "checkin-settings-section-header",
    });

    const titleInput = header.createEl("input", {
      type: "text",
      cls: "checkin-settings-section-title",
    });
    titleInput.value = section.title;
    titleInput.addEventListener("change", async () => {
      section.title = titleInput.value;
      await this.plugin.saveSettings();
    });

    const btnGroup = header.createEl("div", {
      cls: "checkin-settings-btn-group",
    });

    if (index > 0) {
      const up = btnGroup.createEl("button", {
        text: "↑",
        attr: { title: "Move up" },
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
        text: "↓",
        attr: { title: "Move down" },
      });
      down.addEventListener("click", async () => {
        const s = this.plugin.settings.sections;
        [s[index], s[index + 1]] = [s[index + 1], s[index]];
        await this.plugin.saveSettings();
        this.display();
      });
    }

    const del = btnGroup.createEl("button", {
      text: "✕",
      cls: "checkin-settings-delete",
      attr: { title: "Delete section" },
    });
    del.addEventListener("click", async () => {
      this.plugin.settings.sections.splice(index, 1);
      await this.plugin.saveSettings();
      this.display();
    });

    // Questions
    const questionsEl = el.createEl("div", {
      cls: "checkin-settings-questions",
    });
    section.questions.forEach((q, qi) => {
      const row = questionsEl.createEl("div", {
        cls: "checkin-settings-question-row",
      });
      const input = row.createEl("input", {
        type: "text",
        cls: "checkin-settings-question-input",
      });
      input.value = q;
      input.addEventListener("change", async () => {
        section.questions[qi] = input.value;
        await this.plugin.saveSettings();
      });
      const qDel = row.createEl("button", {
        text: "✕",
        cls: "checkin-settings-delete",
      });
      qDel.addEventListener("click", async () => {
        section.questions.splice(qi, 1);
        await this.plugin.saveSettings();
        this.display();
      });
    });

    const addQ = el.createEl("button", {
      text: "+ Add question",
      cls: "checkin-settings-add-q",
    });
    addQ.addEventListener("click", async () => {
      section.questions.push("");
      await this.plugin.saveSettings();
      this.display();
    });
  }
}
