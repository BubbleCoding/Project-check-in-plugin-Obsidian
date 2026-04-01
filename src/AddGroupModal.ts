import { App, Modal, Setting } from "obsidian";

export class AddGroupModal extends Modal {
  name = "";
  onSubmit: (name: string) => Promise<void>;

  constructor(app: App, onSubmit: (name: string) => Promise<void>) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Add group" });

    new Setting(contentEl).setName("Group name").addText((text) => {
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

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Add")
        .setCta()
        .onClick(async () => {
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
}
