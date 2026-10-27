import { createElement } from "@lwc/engine-dom";
import OrgArchHome from "c/orgArchHome";
import getObjects from "@salesforce/apex/OrgArchObjectExplorerController.getObjects";
jest.mock(
  "@salesforce/apex/OrgArchObjectExplorerController.getObjectRelationships",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/OrgArchObjectExplorerController.getObjects",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/OrgArchObjectExplorerController.getObjectDetails",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

describe("c-org-arch-home", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.resetAllMocks();
  });

  it("opens the explorer and returns to the dashboard", async () => {
    getObjects.mockResolvedValue([]);
    const element = createElement("c-org-arch-home", {
      is: OrgArchHome
    });

    document.body.appendChild(element);

    let buttons = [...element.shadowRoot.querySelectorAll("lightning-button")];
    expect(
      buttons.find((button) => button.label === "Open AI Studio").disabled
    ).toBe(true);
    const explore = buttons.find((button) => button.label === "Explore Org");
    expect(explore.disabled).not.toBe(true);
    explore.click();
    await Promise.resolve();
    expect(
      element.shadowRoot.querySelector("c-org-arch-object-explorer")
    ).not.toBeNull();
    buttons = [...element.shadowRoot.querySelectorAll("lightning-button")];
    buttons.find((button) => button.label === "Back to dashboard").click();
    await Promise.resolve();
    expect(
      element.shadowRoot.querySelector("c-org-arch-object-explorer")
    ).toBeNull();
    expect(element.shadowRoot.textContent).toContain(
      "Welcome to OrgArchitect AI"
    );
  });
});
