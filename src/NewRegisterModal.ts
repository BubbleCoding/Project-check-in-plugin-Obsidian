import { App, Modal, Setting, TFile, normalizePath } from "obsidian";
import CheckinPlugin from "./main";

export class NewRegisterModal extends Modal {
  plugin: CheckinPlugin;
  onSubmit: (file: TFile) => void;
  name = "";
  folder = "";

  constructor(
    app: App,
    plugin: CheckinPlugin,
    onSubmit: (file: TFile) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "New check-in register" });

    new Setting(contentEl)
      .setName("Register name")
      .setDesc('e.g. "Social Impact Apps 2025"')
      .addText((text) => {
        text.setPlaceholder("Register name").onChange((v) => {
          this.name = v.trim();
        });
        text.inputEl.addEventListener("keydown", async (e) => {
          if (e.key === "Enter") await this.submit();
        });
      });

    new Setting(contentEl)
      .setName("Folder")
      .setDesc("Vault folder to create the register in (leave empty for root)")
      .addText((text) =>
        text
          .setPlaceholder("e.g. Courses/Social Impact")
          .onChange((v) => (this.folder = v.trim()))
      );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Create")
        .setCta()
        .onClick(() => this.submit())
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

  async createRegister(): Promise<TFile | null> {
    const filePath = normalizePath(
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
}
