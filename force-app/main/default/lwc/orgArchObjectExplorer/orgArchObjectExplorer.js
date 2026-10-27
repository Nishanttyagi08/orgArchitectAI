import { LightningElement } from "lwc";
import getObjects from "@salesforce/apex/OrgArchObjectExplorerController.getObjects";
import getObjectDetails from "@salesforce/apex/OrgArchObjectExplorerController.getObjectDetails";
import getObjectRelationships from "@salesforce/apex/OrgArchObjectExplorerController.getObjectRelationships";

const PAGE_SIZE = 50;
const COLUMNS = [
  {
    label: "Field label",
    fieldName: "label",
    type: "button",
    typeAttributes: {
      label: { fieldName: "label" },
      name: "inspect",
      variant: "base",
      title: "Inspect field"
    }
  },
  { label: "API name", fieldName: "apiName", wrapText: true },
  { label: "Data type", fieldName: "dataType" },
  {
    label: "Related objects",
    fieldName: "relationshipTargets",
    wrapText: true
  },
  { label: "Custom", fieldName: "isCustom", type: "boolean", initialWidth: 90 },
  {
    label: "Calculated",
    fieldName: "isCalculated",
    type: "boolean",
    initialWidth: 110
  }
];
const RELATIONSHIP_COLUMNS = [
  { label: "Direction", fieldName: "direction", initialWidth: 100 },
  { label: "Related object", fieldName: "objectLabel", wrapText: true },
  { label: "Object API name", fieldName: "objectApiName", wrapText: true },
  { label: "Reference field", fieldName: "fieldApiName", wrapText: true },
  { label: "Relationship name", fieldName: "relationshipName", wrapText: true },
  { label: "Type", fieldName: "relationshipType", wrapText: true }
];
const RECORD_TYPE_COLUMNS = [
  { label: "Label", fieldName: "label", wrapText: true },
  { label: "Developer name", fieldName: "developerName", wrapText: true },
  { label: "Record type ID", fieldName: "recordTypeId", wrapText: true },
  { label: "Master", fieldName: "isMaster", type: "boolean", initialWidth: 90 },
  {
    label: "Default for you",
    fieldName: "isDefault",
    type: "boolean",
    initialWidth: 140
  }
];
const yesNo = (value) => {
  if (value == null) return "—";
  return value ? "Yes" : "No";
};

export default class OrgArchObjectExplorer extends LightningElement {
  objects = [];
  objectSearch = "";
  objectFilter = "all";
  objectPage = 1;
  selectedObjectApiName;
  details;
  fieldSearch = "";
  fieldPage = 1;
  relationshipsOnly = false;
  isLoadingObjects = true;
  isLoadingDetails = false;
  objectsError;
  detailsError;
  columns = COLUMNS;
  requestId = 0;
  activeTab = "overview";
  selectedFieldApiName;
  focusInspector = false;
  relationships = [];
  relationshipsLoaded = false;
  isLoadingRelationships = false;
  relationshipsError;
  relationshipRequestId = 0;
  relationshipSearch = "";
  relationshipFilter = "all";
  relationshipPage = 1;
  relationshipColumns = RELATIONSHIP_COLUMNS;
  recordTypeColumns = RECORD_TYPE_COLUMNS;
  relationshipFilterOptions = [
    { label: "All directions", value: "all" },
    { label: "Parent references", value: "Parent" },
    { label: "Child relationships", value: "Child" }
  ];
  filterOptions = [
    { label: "All objects", value: "all" },
    { label: "Standard objects", value: "standard" },
    { label: "Custom objects", value: "custom" }
  ];

  connectedCallback() {
    this.loadObjects();
  }

  disconnectedCallback() {
    this.requestId += 1;
    this.relationshipRequestId += 1;
  }

  renderedCallback() {
    if (this.focusInspector) {
      this.focusInspector = false;
      this.template.querySelector("[data-inspector]")?.focus();
    }
  }

  async loadObjects() {
    this.isLoadingObjects = true;
    this.objectsError = undefined;
    try {
      const objects = await getObjects();
      this.objects = [...objects].sort(
        (a, b) =>
          a.label.localeCompare(b.label) || a.apiName.localeCompare(b.apiName)
      );
    } catch (error) {
      this.objectsError = this.errorMessage(error);
    } finally {
      this.isLoadingObjects = false;
    }
  }

  handleObjectSearch(event) {
    this.objectSearch = event.target.value || "";
    this.objectPage = 1;
  }

  handleObjectFilter(event) {
    this.objectFilter = event.detail.value;
    this.objectPage = 1;
  }

  async handleObjectSelect(event) {
    const objectApiName = event.currentTarget.dataset.name;
    this.selectedObjectApiName = objectApiName;
    this.details = undefined;
    this.fieldSearch = "";
    this.fieldPage = 1;
    this.relationshipsOnly = false;
    this.activeTab = "overview";
    this.selectedFieldApiName = undefined;
    this.relationshipRequestId += 1;
    this.relationships = [];
    this.relationshipsLoaded = false;
    this.isLoadingRelationships = false;
    this.relationshipsError = undefined;
    this.relationshipSearch = "";
    this.relationshipFilter = "all";
    this.relationshipPage = 1;
    await this.loadDetails(objectApiName);
  }

  async loadDetails(objectApiName) {
    const request = ++this.requestId;
    this.isLoadingDetails = true;
    this.detailsError = undefined;
    try {
      const details = await getObjectDetails({ objectApiName });
      // A slower earlier response must not overwrite a newer selection.
      if (request === this.requestId) {
        this.details = {
          ...details,
          fields: details.fields.map((field) => ({
            ...field,
            relationshipTargets: (field.referenceTo || []).join(", ")
          })),
          recordTypes: [...(details.recordTypes || [])]
            .map((recordType) => ({
              ...recordType,
              rowKey:
                recordType.recordTypeId ||
                recordType.developerName ||
                recordType.label
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        };
      }
    } catch (error) {
      if (request === this.requestId) {
        this.detailsError = this.errorMessage(error);
      }
    } finally {
      if (request === this.requestId) {
        this.isLoadingDetails = false;
      }
    }
  }

  handleRetryDetails() {
    this.loadDetails(this.selectedObjectApiName);
  }

  handleFieldSearch(event) {
    this.fieldSearch = event.target.value || "";
    this.fieldPage = 1;
  }

  handleRelationshipsOnly(event) {
    this.relationshipsOnly = event.target.checked;
    this.fieldPage = 1;
  }

  handleTabActive(event) {
    this.activeTab = event.target.value;
    if (
      this.activeTab === "relationships" &&
      this.details &&
      !this.relationshipsLoaded &&
      !this.isLoadingRelationships
    ) {
      this.loadRelationships();
    }
  }

  async loadRelationships() {
    const objectApiName = this.selectedObjectApiName;
    const request = ++this.relationshipRequestId;
    this.isLoadingRelationships = true;
    this.relationshipsError = undefined;
    try {
      const relationships = await getObjectRelationships({ objectApiName });
      if (request === this.relationshipRequestId) {
        this.relationships = [...relationships].sort(
          (a, b) =>
            a.direction.localeCompare(b.direction) ||
            a.objectApiName.localeCompare(b.objectApiName) ||
            a.fieldApiName.localeCompare(b.fieldApiName)
        );
        this.relationshipsLoaded = true;
      }
    } catch (error) {
      if (request === this.relationshipRequestId) {
        this.relationshipsError = this.errorMessage(error);
      }
    } finally {
      if (request === this.relationshipRequestId) {
        this.isLoadingRelationships = false;
      }
    }
  }

  handleRelationshipSearch(event) {
    this.relationshipSearch = event.target.value || "";
    this.relationshipPage = 1;
  }
  handleRelationshipFilter(event) {
    this.relationshipFilter = event.detail.value;
    this.relationshipPage = 1;
  }
  handlePreviousRelationships() {
    this.relationshipPage -= 1;
  }
  handleNextRelationships() {
    this.relationshipPage += 1;
  }

  handleFieldAction(event) {
    if (event.detail.action.name === "inspect") {
      this.selectedFieldApiName = event.detail.row.apiName;
      this.focusInspector = true;
    }
  }

  handleCloseField() {
    this.selectedFieldApiName = undefined;
    this.template.querySelector("lightning-input[data-field-search]")?.focus();
  }

  get selectedField() {
    return this.details?.fields.find(
      (field) => field.apiName === this.selectedFieldApiName
    );
  }
  get selectedFieldProperties() {
    const field = this.selectedField;
    if (!field) return [];
    return [
      ["API name", field.apiName],
      ["Data type", field.dataType],
      ["Custom field", yesNo(field.isCustom)],
      ["Calculated", yesNo(field.isCalculated)],
      ["Auto number", yesNo(field.isAutoNumber)],
      ["Allows null", yesNo(field.isNullable)],
      ["Create access", yesNo(field.isCreateable)],
      ["Update access", yesNo(field.isUpdateable)],
      ["Length", field.length ?? "—"],
      ["Precision", field.precision ?? "—"],
      ["Scale", field.scale ?? "—"],
      ["Relationship type", field.relationshipType || "—"],
      ["Relationship name", field.relationshipName || "—"],
      ["Related objects", field.relationshipTargets || "—"]
    ].map(([label, value]) => ({ label, value }));
  }

  get overviewProperties() {
    return [
      ["API name", this.details?.apiName],
      ["Plural label", this.details?.pluralLabel || "—"],
      ["Object type", this.objectKind],
      ["Key prefix", this.details?.keyPrefix || "—"],
      ["Create access", yesNo(this.details?.isCreateable)],
      ["Update access", yesNo(this.details?.isUpdateable)],
      ["Delete access", yesNo(this.details?.isDeletable)]
    ].map(([label, value]) => ({ label, value }));
  }
  get recordTypes() {
    return this.details?.recordTypes || [];
  }
  get recordTypeCount() {
    return this.recordTypes.length;
  }
  get hasRecordTypes() {
    return this.recordTypeCount > 0;
  }
  get parentRelationshipCount() {
    return this.relationships.filter((row) => row.direction === "Parent")
      .length;
  }
  get childRelationshipCount() {
    return this.relationships.filter((row) => row.direction === "Child").length;
  }
  get filteredRelationships() {
    const search = this.relationshipSearch.trim().toLowerCase();
    return this.relationships.filter(
      (row) =>
        (this.relationshipFilter === "all" ||
          row.direction === this.relationshipFilter) &&
        [
          row.objectApiName,
          row.objectLabel,
          row.fieldApiName,
          row.fieldLabel,
          row.relationshipName,
          row.relationshipType
        ].some((value) => (value || "").toLowerCase().includes(search))
    );
  }
  get matchingRelationshipCount() {
    return this.filteredRelationships.length;
  }
  get visibleRelationships() {
    return this.filteredRelationships.slice(
      (this.relationshipPage - 1) * PAGE_SIZE,
      this.relationshipPage * PAGE_SIZE
    );
  }
  get hasRelationships() {
    return this.matchingRelationshipCount > 0;
  }
  get noRelationships() {
    return this.relationshipsLoaded && !this.hasRelationships;
  }
  get showRelationshipPaging() {
    return this.matchingRelationshipCount > PAGE_SIZE;
  }
  get firstRelationshipPage() {
    return this.relationshipPage === 1;
  }
  get lastRelationshipPage() {
    return this.relationshipPage * PAGE_SIZE >= this.matchingRelationshipCount;
  }
  get relationshipPageLabel() {
    return `Page ${this.relationshipPage} of ${Math.max(1, Math.ceil(this.matchingRelationshipCount / PAGE_SIZE))}`;
  }

  handlePreviousObjects() {
    this.objectPage -= 1;
  }
  handleNextObjects() {
    this.objectPage += 1;
  }
  handlePreviousFields() {
    this.fieldPage -= 1;
  }
  handleNextFields() {
    this.fieldPage += 1;
  }

  get filteredObjects() {
    const search = this.objectSearch.trim().toLowerCase();
    return this.objects.filter(
      (object) =>
        (this.objectFilter === "all" ||
          object.isCustom === (this.objectFilter === "custom")) &&
        (object.label.toLowerCase().includes(search) ||
          object.apiName.toLowerCase().includes(search))
    );
  }

  get visibleObjects() {
    return this.filteredObjects
      .slice((this.objectPage - 1) * PAGE_SIZE, this.objectPage * PAGE_SIZE)
      .map((object) => ({
        ...object,
        selected: object.apiName === this.selectedObjectApiName,
        buttonClass:
          object.apiName === this.selectedObjectApiName
            ? "object-button selected"
            : "object-button",
        kind: object.isCustom ? "Custom" : "Standard"
      }));
  }

  get objectCount() {
    return this.filteredObjects.length;
  }
  get noObjects() {
    return (
      !this.isLoadingObjects && !this.objectsError && this.objectCount === 0
    );
  }
  get objectPageCount() {
    return Math.max(1, Math.ceil(this.objectCount / PAGE_SIZE));
  }
  get firstObjectPage() {
    return this.objectPage === 1;
  }
  get lastObjectPage() {
    return this.objectPage >= this.objectPageCount;
  }
  get objectPageLabel() {
    return `Page ${this.objectPage} of ${this.objectPageCount}`;
  }
  get showObjectPaging() {
    return this.objectCount > PAGE_SIZE;
  }
  get showPrompt() {
    return !this.selectedObjectApiName;
  }
  get objectKind() {
    return this.details?.isCustom ? "Custom object" : "Standard object";
  }
  get fieldCount() {
    return this.details?.fields.length || 0;
  }
  get relationshipCount() {
    return (
      this.details?.fields.filter(
        (field) => field.dataType.toLowerCase() === "reference"
      ).length || 0
    );
  }

  get filteredFields() {
    const search = this.fieldSearch.trim().toLowerCase();
    return (this.details?.fields || []).filter(
      (field) =>
        (!this.relationshipsOnly ||
          field.dataType.toLowerCase() === "reference") &&
        [
          field.label,
          field.apiName,
          field.dataType,
          field.relationshipTargets
        ].some((value) => value.toLowerCase().includes(search))
    );
  }

  get visibleFields() {
    return this.filteredFields.slice(
      (this.fieldPage - 1) * PAGE_SIZE,
      this.fieldPage * PAGE_SIZE
    );
  }
  get matchingFieldCount() {
    return this.filteredFields.length;
  }
  get hasFields() {
    return this.matchingFieldCount > 0;
  }
  get fieldPageCount() {
    return Math.max(1, Math.ceil(this.matchingFieldCount / PAGE_SIZE));
  }
  get firstFieldPage() {
    return this.fieldPage === 1;
  }
  get lastFieldPage() {
    return this.fieldPage >= this.fieldPageCount;
  }
  get fieldPageLabel() {
    return `Page ${this.fieldPage} of ${this.fieldPageCount}`;
  }
  get showFieldPaging() {
    return this.matchingFieldCount > PAGE_SIZE;
  }

  errorMessage(error) {
    return (
      error?.body?.message ||
      error?.message ||
      "Unable to load schema information. Try again."
    );
  }
}
