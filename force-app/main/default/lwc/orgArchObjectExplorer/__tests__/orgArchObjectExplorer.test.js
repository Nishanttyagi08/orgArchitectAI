import { createElement } from "@lwc/engine-dom";
import Explorer from "c/orgArchObjectExplorer";
import getObjects from "@salesforce/apex/OrgArchObjectExplorerController.getObjects";
import getObjectDetails from "@salesforce/apex/OrgArchObjectExplorerController.getObjectDetails";
import getObjectRelationships from "@salesforce/apex/OrgArchObjectExplorerController.getObjectRelationships";
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

const OBJECTS = [
  { apiName: "Account", label: "Account", isCustom: false },
  { apiName: "Contact", label: "Contact", isCustom: false },
  { apiName: "orgarch__Project__c", label: "Project", isCustom: true }
];
const ACCOUNT = {
  apiName: "Account",
  label: "Account",
  isCustom: false,
  pluralLabel: "Accounts",
  keyPrefix: "001",
  isCreateable: true,
  isUpdateable: false,
  isDeletable: false,
  recordTypes: [
    {
      recordTypeId: "012000000000000AAA",
      label: "Master",
      developerName: "Master",
      isMaster: true,
      isDefault: true
    }
  ],
  fields: [
    {
      apiName: "Name",
      label: "Account Name",
      dataType: "STRING",
      length: 255,
      precision: 0,
      scale: 0,
      isNullable: false,
      isAutoNumber: false,
      isCustom: false,
      isCalculated: false,
      isCreateable: true,
      isUpdateable: true,
      inlineHelpText: "The account's display name.",
      referenceTo: []
    },
    {
      apiName: "ParentId",
      label: "Parent Account",
      dataType: "REFERENCE",
      referenceTo: ["Account"]
    }
  ]
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
const objects = (e) => [...e.shadowRoot.querySelectorAll("button[data-name]")];
const input = (e, label) =>
  [...e.shadowRoot.querySelectorAll("lightning-input")].find(
    (n) => n.label === label
  );
const action = (e, label) =>
  [...e.shadowRoot.querySelectorAll("lightning-button")].find(
    (n) => n.label === label
  );
const table = (e) =>
  e.shadowRoot.querySelector("lightning-datatable[data-fields]");
const relationshipsTable = (e) =>
  e.shadowRoot.querySelector("lightning-datatable[data-relationships]");
const activate = (e, name) =>
  [...e.shadowRoot.querySelectorAll("lightning-tab")]
    .find((tab) => tab.value === name)
    .dispatchEvent(new CustomEvent("active"));
const alert = (e) => e.shadowRoot.querySelector('[role="alert"]');
const change = (n, value) => {
  n.value = value;
  n.dispatchEvent(new CustomEvent("change"));
};
async function mount() {
  const e = createElement("c-org-arch-object-explorer", { is: Explorer });
  document.body.appendChild(e);
  await flush();
  return e;
}

describe("Object Explorer", () => {
  beforeEach(() => {
    getObjects.mockResolvedValue(OBJECTS);
    getObjectDetails.mockResolvedValue(ACCOUNT);
    getObjectRelationships.mockResolvedValue([
      {
        rowKey: "Parent:Account:ParentId",
        direction: "Parent",
        objectApiName: "Account",
        objectLabel: "Account",
        fieldApiName: "ParentId",
        fieldLabel: "Parent Account",
        relationshipName: "Parent",
        relationshipType: "Lookup / reference"
      },
      {
        rowKey: "Child:Contact:AccountId",
        direction: "Child",
        objectApiName: "Contact",
        objectLabel: "Contact",
        fieldApiName: "AccountId",
        fieldLabel: "Account",
        relationshipName: "Contacts",
        relationshipType: "Lookup / reference"
      }
    ]);
  });
  afterEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
    jest.resetAllMocks();
  });

  it("searches namespaced API names and filters standard objects", async () => {
    const e = await mount();
    expect(objects(e)).toHaveLength(3);
    change(input(e, "Search objects"), "ORGARCH__");
    await flush();
    expect(objects(e).map((n) => n.dataset.name)).toEqual([
      "orgarch__Project__c"
    ]);
    change(input(e, "Search objects"), "");
    e.shadowRoot
      .querySelector("lightning-combobox")
      .dispatchEvent(
        new CustomEvent("change", { detail: { value: "standard" } })
      );
    await flush();
    expect(objects(e).map((n) => n.dataset.name)).toEqual([
      "Account",
      "Contact"
    ]);
  });

  it("loads fields and filters relationships and empty results", async () => {
    const e = await mount();
    objects(e)[0].click();
    await flush();
    expect(getObjectDetails).toHaveBeenCalledWith({ objectApiName: "Account" });
    expect(table(e).data).toHaveLength(2);
    const checkbox = input(e, "Show relationship fields only");
    checkbox.checked = true;
    checkbox.dispatchEvent(new CustomEvent("change"));
    await flush();
    expect(table(e).data.map((f) => f.apiName)).toEqual(["ParentId"]);
    expect(table(e).data[0].relationshipTargets).toBe("Account");
    change(input(e, "Search fields or relationship targets"), "missing");
    await flush();
    expect(table(e)).toBeNull();
    expect(e.shadowRoot.textContent).toContain("No readable fields match");
  });

  it.each(["resolve", "reject"])(
    "ignores an older %s after a newer selection",
    async (outcome) => {
      let finishAccount;
      getObjectDetails.mockImplementation(({ objectApiName }) => {
        if (objectApiName === "Account") {
          return new Promise((resolve, reject) => {
            finishAccount =
              outcome === "resolve"
                ? () => resolve(ACCOUNT)
                : () => reject({ body: { message: "Old failure" } });
          });
        }
        return Promise.resolve({
          apiName: "Contact",
          label: "Contact",
          isCustom: false,
          fields: []
        });
      });
      const e = await mount();
      objects(e)[0].click();
      objects(e)[1].click();
      await flush();
      finishAccount();
      await flush();
      expect(e.shadowRoot.querySelector("h2").textContent).toBe("Contact");
      expect(alert(e)).toBeNull();
      expect(e.shadowRoot.querySelector("lightning-spinner")).toBeNull();
    }
  );

  it("shows object load failures and retries", async () => {
    getObjects.mockRejectedValueOnce({ body: { message: "Access denied" } });
    const e = await mount();
    expect(alert(e).textContent).toBe("Access denied");
    action(e, "Retry objects").click();
    await flush();
    expect(alert(e)).toBeNull();
    expect(objects(e)).toHaveLength(3);
  });

  it("clears old fields on selection failure and retries details", async () => {
    const e = await mount();
    objects(e)[0].click();
    await flush();
    getObjectDetails.mockRejectedValueOnce({
      body: { message: "Object unavailable" }
    });
    objects(e)[1].click();
    await flush();
    expect(table(e)).toBeNull();
    expect(alert(e).textContent).toBe("Object unavailable");
    action(e, "Retry details").click();
    await flush();
    expect(table(e)).not.toBeNull();
    expect(getObjectDetails).toHaveBeenLastCalledWith({
      objectApiName: "Contact"
    });
  });

  it("paginates objects and resets the page after search", async () => {
    getObjects.mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => ({
        apiName: `Object${i}__c`,
        label: `Object ${i}`,
        isCustom: true
      }))
    );
    const e = await mount();
    expect(objects(e)).toHaveLength(50);
    expect(action(e, "Previous objects").disabled).toBe(true);
    action(e, "Next objects").click();
    await flush();
    expect(objects(e)).toHaveLength(1);
    expect(action(e, "Next objects").disabled).toBe(true);
    change(input(e, "Search objects"), "Object0__c");
    await flush();
    expect(objects(e)[0].dataset.name).toBe("Object0__c");
  });

  it("paginates fields and resets the page after search", async () => {
    getObjectDetails.mockResolvedValue({
      ...ACCOUNT,
      fields: Array.from({ length: 51 }, (_, i) => ({
        apiName: `Field${i}__c`,
        label: `Field ${i}`,
        dataType: "STRING",
        referenceTo: []
      }))
    });
    const e = await mount();
    objects(e)[0].click();
    await flush();
    expect(table(e).data).toHaveLength(50);
    action(e, "Next fields").click();
    await flush();
    expect(table(e).data).toHaveLength(1);
    change(input(e, "Search fields or relationship targets"), "Field0__c");
    await flush();
    expect(table(e).data[0].apiName).toBe("Field0__c");
  });

  it("shows overview properties and only the available record types returned by Apex", async () => {
    const e = await mount();
    objects(e)[0].click();
    await flush();
    const overview = [...e.shadowRoot.querySelectorAll("lightning-tab")].find(
      (tab) => tab.value === "overview"
    );
    expect(overview.textContent).toContain("001");
    expect(overview.textContent).toContain("Accounts");
    const recordTypes = e.shadowRoot.querySelector(
      "lightning-datatable[data-record-types]"
    );
    expect(recordTypes.data).toHaveLength(1);
    expect(recordTypes.data[0]).toMatchObject({
      label: "Master",
      isDefault: true
    });
    expect(getObjectRelationships).not.toHaveBeenCalled();
  });

  it("inspects a field with zero precision and scale and closes the inspector", async () => {
    const e = await mount();
    objects(e)[0].click();
    await flush();
    table(e).dispatchEvent(
      new CustomEvent("rowaction", {
        detail: { action: { name: "inspect" }, row: ACCOUNT.fields[0] }
      })
    );
    await flush();
    const panel = e.shadowRoot.querySelector("[data-inspector]");
    expect(panel.textContent).toContain("255");
    expect(panel.textContent).toContain("The account's display name.");
    const values = [...panel.querySelectorAll(".property")].map((n) => [
      n.querySelector("dt").textContent,
      n.querySelector("dd").textContent
    ]);
    expect(values).toContainEqual(["Scale", "0"]);
    expect(values).toContainEqual(["Allows null", "No"]);
    action(e, "Close field details").click();
    await flush();
    expect(e.shadowRoot.querySelector("[data-inspector]")).toBeNull();
  });

  it("loads relationships once on demand and filters by direction and child API name", async () => {
    const e = await mount();
    objects(e)[0].click();
    await flush();
    expect(getObjectRelationships).not.toHaveBeenCalled();
    activate(e, "relationships");
    await flush();
    expect(getObjectRelationships).toHaveBeenCalledWith({
      objectApiName: "Account"
    });
    expect(relationshipsTable(e).data).toHaveLength(2);
    const direction = [
      ...e.shadowRoot.querySelectorAll("lightning-combobox")
    ].find((n) => n.label === "Relationship direction");
    direction.dispatchEvent(
      new CustomEvent("change", { detail: { value: "Child" } })
    );
    await flush();
    expect(relationshipsTable(e).data[0].objectApiName).toBe("Contact");
    change(input(e, "Search relationships"), "no-match");
    await flush();
    expect(relationshipsTable(e)).toBeNull();
    expect(e.shadowRoot.textContent).toContain(
      "No readable relationships match"
    );
    activate(e, "overview");
    activate(e, "relationships");
    await flush();
    expect(getObjectRelationships).toHaveBeenCalledTimes(1);
  });

  it("retries relationship failures", async () => {
    getObjectRelationships.mockRejectedValueOnce({
      body: { message: "Relationship discovery failed" }
    });
    const e = await mount();
    objects(e)[0].click();
    await flush();
    activate(e, "relationships");
    await flush();
    expect(alert(e).textContent).toBe("Relationship discovery failed");
    action(e, "Retry relationships").click();
    await flush();
    expect(alert(e)).toBeNull();
    expect(relationshipsTable(e).data).toHaveLength(2);
  });

  it("discards an old relationship response when the selected object changes", async () => {
    let finish;
    getObjectRelationships.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const e = await mount();
    objects(e)[0].click();
    await flush();
    activate(e, "relationships");
    await flush();
    objects(e)[1].click();
    await flush();
    finish([
      {
        rowKey: "old",
        direction: "Child",
        objectApiName: "OldObject",
        fieldApiName: "OldField"
      }
    ]);
    await flush();
    expect(relationshipsTable(e)).toBeNull();
    expect(e.shadowRoot.querySelector("lightning-tabset").activeTabValue).toBe(
      "overview"
    );
    expect(e.shadowRoot.querySelector("[data-inspector]")).toBeNull();
  });

  it("paginates relationships and resets pagination after searching", async () => {
    getObjectRelationships.mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => ({
        rowKey: `Child:Object${i}:ParentId`,
        direction: "Child",
        objectApiName: `Object${i}`,
        objectLabel: `Object ${i}`,
        fieldApiName: "ParentId"
      }))
    );
    const e = await mount();
    objects(e)[0].click();
    await flush();
    activate(e, "relationships");
    await flush();
    expect(relationshipsTable(e).data).toHaveLength(50);
    action(e, "Next relationships").click();
    await flush();
    expect(relationshipsTable(e).data).toHaveLength(1);
    change(input(e, "Search relationships"), "Object0");
    await flush();
    expect(relationshipsTable(e).data[0].objectApiName).toBe("Object0");
  });

  it("shows an empty record-type state and clears field inspection on object change", async () => {
    const e = await mount();
    objects(e)[0].click();
    await flush();
    table(e).dispatchEvent(
      new CustomEvent("rowaction", {
        detail: { action: { name: "inspect" }, row: ACCOUNT.fields[0] }
      })
    );
    await flush();
    getObjectDetails.mockResolvedValueOnce({
      ...ACCOUNT,
      apiName: "Contact",
      label: "Contact",
      recordTypes: []
    });
    objects(e)[1].click();
    await flush();
    expect(e.shadowRoot.querySelector("[data-inspector]")).toBeNull();
    expect(
      e.shadowRoot.querySelector("lightning-datatable[data-record-types]")
    ).toBeNull();
    expect(e.shadowRoot.textContent).toContain(
      "No active record types are available"
    );
  });
});
