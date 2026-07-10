import { describe, expect, it } from "vitest";

import { buildArchivePathsForFiles } from "@/lib/ops-expert-files/inventory";

describe("buildArchivePathsForFiles", () => {
  it("merges initial and supplement into Chinese dossier folders", () => {
    const inventory = buildArchivePathsForFiles({
      customerNo: "202607090301",
      resume: {
        id: "r1",
        fileName: "cv.pdf",
        objectKey: "applications/a/resume/cv.pdf",
        fileType: "application/pdf",
        fileSize: 10,
        uploadedAt: new Date(),
      },
      materials: [
        {
          id: "m1",
          category: "IDENTITY",
          fileName: "passport.pdf",
          objectKey: "applications/a/materials/IDENTITY/passport.pdf",
          fileType: "application/pdf",
          fileSize: 20,
          uploadedAt: new Date(),
        },
        {
          id: "m2",
          category: "PRODUCT",
          fileName: "product.pdf",
          objectKey: "applications/a/materials/PRODUCT/product.pdf",
          fileType: "application/pdf",
          fileSize: 30,
          uploadedAt: new Date(),
        },
      ],
      supplements: [
        {
          id: "s1",
          category: "IDENTITY",
          fileName: "passport.pdf",
          objectKey: "applications/a/supplements/IDENTITY/b/passport.pdf",
          fileType: "application/pdf",
          fileSize: 40,
          uploadedAt: new Date(),
          uploadBatchId: "batch_abcdef",
        },
      ],
      extraction: {
        id: "e1",
        objectKey: "applications/a/extraction-exports/confirmed-extraction.xlsx",
        fileSize: 50,
        exportedAt: new Date(),
      },
      secondary: {
        id: "sec1",
        objectKey: "applications/a/secondary-exports/run/out.xls",
        fileName: "out.xls",
        contentType: "application/vnd.ms-excel",
        fileSize: 60,
      },
    });

    expect(
      inventory.files.some((file) =>
        file.archivePath.includes("/materials/0简历/"),
      ),
    ).toBe(true);
    expect(
      inventory.files.some((file) =>
        file.archivePath.includes("/materials/1基本信息/initial_passport.pdf"),
      ),
    ).toBe(true);
    expect(
      inventory.files.some((file) =>
        file.archivePath.includes("/materials/1基本信息/supplement_"),
      ),
    ).toBe(true);
    expect(inventory.files.some((file) => file.category === "PRODUCT")).toBe(
      false,
    );
    expect(
      inventory.files.some((file) => file.archivePath.endsWith("/抽取结果.xlsx")),
    ).toBe(true);
    expect(
      inventory.files.some((file) => file.archivePath.endsWith("/详细分析.xls")),
    ).toBe(true);
  });
});
