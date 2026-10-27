import { LightningElement } from "lwc";

export default class OrgArchHome extends LightningElement {
  showExplorer = false;

  handleExploreOrg() {
    this.showExplorer = true;
  }

  handleBack() {
    this.showExplorer = false;
  }
}
