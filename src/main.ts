import { Plugin, WorkspaceLeaf } from "obsidian";
import { CheckinView, VIEW_TYPE_CHECKIN } from "./view";
import { CheckinSettings, DEFAULT_SETTINGS } from "./types";
import { CheckinSettingTab } from "./settings";

export default class CheckinPlugin extends Plugin {
  settings: CheckinSettings;

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
      callback: () => this.activateView(),
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
}
