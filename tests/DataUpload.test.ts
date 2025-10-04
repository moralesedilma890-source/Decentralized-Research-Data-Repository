import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, stringUtf8CV, uintCV, listCV, buffCV, principalCV, optionalCV } from "@stacks/transactions";

const ERR_HASH_EXISTS = 100;
const ERR_INVALID_HASH = 101;
const ERR_NOT_AUTHORIZED = 102;
const ERR_INVALID_TITLE = 103;
const ERR_INVALID_DESCRIPTION = 104;
const ERR_TOO_MANY_CO_AUTHORS = 105;
const ERR_INVALID_CATEGORY = 113;
const ERR_INVALID_TAGS = 114;
const ERR_INVALID_LICENSE = 115;
const ERR_INSUFFICIENT_FEE = 117;
const ERR_MAX_DATASETS_EXCEEDED = 112;
const ERR_INVALID_METADATA = 111;
const ERR_DATASET_NOT_FOUND = 107;
const ERR_NO_PERMISSION = 110;

interface Dataset {
  id: number;
  title: string;
  description: string;
  owner: string;
  coAuthors: string[];
  timestamp: number;
  category: string;
  tags: string[];
  license: string;
  status: boolean;
  metadata: Uint8Array | null;
}

interface DatasetUpdate {
  updatedTitle: string;
  updatedDescription: string;
  updatedTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DataUploadMock {
  state: {
    nextDatasetId: number;
    maxDatasets: number;
    registrationFee: number;
    adminPrincipal: string;
    datasets: Map<string, Dataset>;
    datasetIds: Map<number, { dataHash: Uint8Array }>;
    datasetUpdates: Map<number, DatasetUpdate>;
  } = {
    nextDatasetId: 0,
    maxDatasets: 10000,
    registrationFee: 500,
    adminPrincipal: "ST1TEST",
    datasets: new Map(),
    datasetIds: new Map(),
    datasetUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextDatasetId: 0,
      maxDatasets: 10000,
      registrationFee: 500,
      adminPrincipal: "ST1TEST",
      datasets: new Map(),
      datasetIds: new Map(),
      datasetUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  getDataset(hash: Uint8Array): Dataset | null {
    return this.state.datasets.get(Buffer.from(hash).toString("hex")) || null;
  }

  getDatasetById(id: number): Dataset | null {
    const hashObj = this.state.datasetIds.get(id);
    if (!hashObj) return null;
    return this.getDataset(hashObj.dataHash);
  }

  registerDataset(
    dataHash: Uint8Array,
    title: string,
    description: string,
    coAuthors: string[],
    category: string,
    tags: string[],
    license: string,
    metadata: Uint8Array | null
  ): Result<number> {
    if (dataHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (title.length === 0 || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (coAuthors.length > 10) return { ok: false, value: ERR_TOO_MANY_CO_AUTHORS };
    if (category.length === 0 || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (!tags.every(tag => tag.length > 0 && tag.length <= 30)) return { ok: false, value: ERR_INVALID_TAGS };
    if (!["CC-BY", "MIT", "GPL", "Public Domain"].includes(license)) return { ok: false, value: ERR_INVALID_LICENSE };
    if (metadata && metadata.length > 1024) return { ok: false, value: ERR_INVALID_METADATA };
    if (this.state.nextDatasetId >= this.state.maxDatasets) return { ok: false, value: ERR_MAX_DATASETS_EXCEEDED };
    const hashKey = Buffer.from(dataHash).toString("hex");
    if (this.state.datasets.has(hashKey)) return { ok: false, value: ERR_HASH_EXISTS };

    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.adminPrincipal });

    const id = this.state.nextDatasetId;
    const dataset: Dataset = {
      id,
      title,
      description,
      owner: this.caller,
      coAuthors,
      timestamp: this.blockHeight,
      category,
      tags,
      license,
      status: true,
      metadata,
    };
    this.state.datasets.set(hashKey, dataset);
    this.state.datasetIds.set(id, { dataHash });
    this.state.nextDatasetId++;
    return { ok: true, value: id };
  }

  updateDataset(
    dataHash: Uint8Array,
    newTitle: string,
    newDescription: string
  ): Result<boolean> {
    const hashKey = Buffer.from(dataHash).toString("hex");
    const dataset = this.state.datasets.get(hashKey);
    if (!dataset) return { ok: false, value: ERR_DATASET_NOT_FOUND };
    if (dataset.owner !== this.caller) return { ok: false, value: ERR_NO_PERMISSION };
    if (newTitle.length === 0 || newTitle.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (newDescription.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };

    const updated: Dataset = {
      ...dataset,
      title: newTitle,
      description: newDescription,
      timestamp: this.blockHeight,
    };
    this.state.datasets.set(hashKey, updated);
    this.state.datasetUpdates.set(dataset.id, {
      updatedTitle: newTitle,
      updatedDescription: newDescription,
      updatedTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  deactivateDataset(dataHash: Uint8Array): Result<boolean> {
    const hashKey = Buffer.from(dataHash).toString("hex");
    const dataset = this.state.datasets.get(hashKey);
    if (!dataset) return { ok: false, value: ERR_DATASET_NOT_FOUND };
    if (dataset.owner !== this.caller) return { ok: false, value: ERR_NO_PERMISSION };

    const updated: Dataset = { ...dataset, status: false };
    this.state.datasets.set(hashKey, updated);
    return { ok: true, value: true };
  }

  getDatasetCount(): Result<number> {
    return { ok: true, value: this.state.nextDatasetId };
  }

  setAdmin(newAdmin: string): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.adminPrincipal = newAdmin;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }
}

describe("DataUpload", () => {
  let contract: DataUploadMock;

  beforeEach(() => {
    contract = new DataUploadMock();
    contract.reset();
  });

  it("registers a dataset successfully", () => {
    const hash = new Uint8Array(32).fill(1);
    const result = contract.registerDataset(
      hash,
      "Test Title",
      "Test Description",
      ["ST2COAUTH"],
      "Science",
      ["tag1", "tag2"],
      "CC-BY",
      null
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const dataset = contract.getDataset(hash);
    expect(dataset?.title).toBe("Test Title");
    expect(dataset?.description).toBe("Test Description");
    expect(dataset?.owner).toBe("ST1TEST");
    expect(dataset?.coAuthors).toEqual(["ST2COAUTH"]);
    expect(dataset?.category).toBe("Science");
    expect(dataset?.tags).toEqual(["tag1", "tag2"]);
    expect(dataset?.license).toBe("CC-BY");
    expect(dataset?.status).toBe(true);
    expect(dataset?.metadata).toBe(null);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST1TEST" }]);
  });

  it("rejects duplicate hash", () => {
    const hash = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash,
      "Test Title",
      "Test Description",
      [],
      "Science",
      [],
      "CC-BY",
      null
    );
    const result = contract.registerDataset(
      hash,
      "Duplicate",
      "Desc",
      [],
      "Art",
      [],
      "MIT",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_HASH_EXISTS);
  });

  it("rejects invalid hash length", () => {
    const hash = new Uint8Array(31);
    const result = contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects invalid title", () => {
    const hash = new Uint8Array(32);
    const result = contract.registerDataset(
      hash,
      "",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects too many co-authors", () => {
    const hash = new Uint8Array(32);
    const coAuthors = Array(11).fill("STCO");
    const result = contract.registerDataset(
      hash,
      "Title",
      "Desc",
      coAuthors,
      "Cat",
      [],
      "CC-BY",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_TOO_MANY_CO_AUTHORS);
  });

  it("rejects invalid category", () => {
    const hash = new Uint8Array(32);
    const result = contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "",
      [],
      "CC-BY",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CATEGORY);
  });

  it("rejects invalid tags", () => {
    const hash = new Uint8Array(32);
    const result = contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      ["toolongtag".repeat(4)],
      "CC-BY",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TAGS);
  });

  it("rejects invalid license", () => {
    const hash = new Uint8Array(32);
    const result = contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "Invalid",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_LICENSE);
  });

  it("rejects large metadata", () => {
    const hash = new Uint8Array(32);
    const metadata = new Uint8Array(1025);
    const result = contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      metadata
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_METADATA);
  });

  it("updates dataset successfully", () => {
    const hash = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash,
      "Old Title",
      "Old Desc",
      [],
      "Science",
      [],
      "CC-BY",
      null
    );
    const result = contract.updateDataset(hash, "New Title", "New Desc");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const dataset = contract.getDataset(hash);
    expect(dataset?.title).toBe("New Title");
    expect(dataset?.description).toBe("New Desc");
    const update = contract.state.datasetUpdates.get(0);
    expect(update?.updatedTitle).toBe("New Title");
    expect(update?.updatedDescription).toBe("New Desc");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-owner", () => {
    const hash = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    contract.caller = "ST2FAKE";
    const result = contract.updateDataset(hash, "New", "New");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NO_PERMISSION);
  });

  it("deactivates dataset successfully", () => {
    const hash = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    const result = contract.deactivateDataset(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const dataset = contract.getDataset(hash);
    expect(dataset?.status).toBe(false);
  });

  it("rejects deactivate for non-owner", () => {
    const hash = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    contract.caller = "ST2FAKE";
    const result = contract.deactivateDataset(hash);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NO_PERMISSION);
  });

  it("sets registration fee successfully", () => {
    const result = contract.setRegistrationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(1000);
    const hash = new Uint8Array(32);
    contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST1TEST" }]);
  });

  it("rejects fee change by non-admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.setRegistrationFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("gets dataset count correctly", () => {
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    contract.registerDataset(
      hash1,
      "Title1",
      "Desc1",
      [],
      "Cat1",
      [],
      "CC-BY",
      null
    );
    contract.registerDataset(
      hash2,
      "Title2",
      "Desc2",
      [],
      "Cat2",
      [],
      "MIT",
      null
    );
    const result = contract.getDatasetCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("gets dataset by id correctly", () => {
    const hash = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash,
      "Title",
      "Desc",
      [],
      "Cat",
      [],
      "CC-BY",
      null
    );
    const dataset = contract.getDatasetById(0);
    expect(dataset?.title).toBe("Title");
  });

  it("rejects registration when max exceeded", () => {
    contract.state.maxDatasets = 1;
    const hash1 = new Uint8Array(32).fill(1);
    contract.registerDataset(
      hash1,
      "Title1",
      "Desc1",
      [],
      "Cat1",
      [],
      "CC-BY",
      null
    );
    const hash2 = new Uint8Array(32).fill(2);
    const result = contract.registerDataset(
      hash2,
      "Title2",
      "Desc2",
      [],
      "Cat2",
      [],
      "MIT",
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_DATASETS_EXCEEDED);
  });

  it("sets admin successfully", () => {
    const result = contract.setAdmin("ST2NEWADMIN");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.adminPrincipal).toBe("ST2NEWADMIN");
  });

  it("rejects set admin by non-admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.setAdmin("ST3NEW");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });
});