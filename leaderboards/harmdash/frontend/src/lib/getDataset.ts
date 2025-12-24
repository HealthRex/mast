import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DatasetArtifact } from "@/types/dataset";

export async function getDataset(): Promise<DatasetArtifact> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "ai-harm-summary.json"
  );

  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as DatasetArtifact;
}
