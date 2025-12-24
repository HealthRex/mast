export const HUMAN_MODEL_KEY = "human";
export const HUMAN_DISPLAY_LABEL = "Human Generalist Physicians";

const HUMAN_MODEL_ALIASES = new Set([
  HUMAN_MODEL_KEY,
  HUMAN_DISPLAY_LABEL.toLowerCase(),
  "human physicians"
]);

export function isHumanLabel(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized ? HUMAN_MODEL_ALIASES.has(normalized) : false;
}
