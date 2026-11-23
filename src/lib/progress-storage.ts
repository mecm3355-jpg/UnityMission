import { isMissionId } from "../content/missions";
import { isMissionUnlocked, normalizeNickname } from "./game-engine";
import type { MissionId } from "../types/content";
import type {
  ActiveAttempt,
  CompletedMissions,
  UnityMissionProgress,
} from "../types/progress";

export const PROGRESS_STORAGE_KEY = "unitymission:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageWarningCode = "corrupt-data-reset" | "storage-unavailable";

export type StorageWarning = {
  code: StorageWarningCode;
  message: string;
};

export type ProgressValidationResult =
  | { valid: true; progress: UnityMissionProgress; errors: [] }
  | { valid: false; progress: null; errors: string[] };

export type LoadProgressResult = {
  progress: UnityMissionProgress | null;
  persistenceAvailable: boolean;
  warning: StorageWarning | null;
};

export type SaveProgressResult = {
  persisted: boolean;
  warning: StorageWarning | null;
};

type UnknownRecord = Record<string, unknown>;

const ROOT_KEYS = [
  "schemaVersion",
  "nickname",
  "createdAt",
  "updatedAt",
  "completedMissions",
  "activeAttempt",
  "lastVisitedMissionId",
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validateCompletedMissions(
  value: unknown,
  createdAt: string,
  updatedAt: string,
  errors: string[],
): CompletedMissions | null {
  if (!isRecord(value)) {
    errors.push("completedMissions must be an object");
    return null;
  }

  const completedMissions: CompletedMissions = {};

  for (const [missionId, recordValue] of Object.entries(value)) {
    if (!isMissionId(missionId)) {
      errors.push(`completedMissions contains an unknown mission ID: ${missionId}`);
      continue;
    }
    if (
      !isRecord(recordValue) ||
      !hasOnlyKeys(recordValue, ["completedAt", "bestCorrectCount", "attemptCount"])
    ) {
      errors.push(`completedMissions.${missionId} has an invalid shape`);
      continue;
    }

    const { completedAt, bestCorrectCount, attemptCount } = recordValue;
    if (
      !isIsoTimestamp(completedAt) ||
      Date.parse(completedAt) < Date.parse(createdAt) ||
      Date.parse(completedAt) > Date.parse(updatedAt)
    ) {
      errors.push(`completedMissions.${missionId}.completedAt is invalid`);
    }
    if (!Number.isInteger(bestCorrectCount) || (bestCorrectCount as number) < 0 || (bestCorrectCount as number) > 3) {
      errors.push(`completedMissions.${missionId}.bestCorrectCount is invalid`);
    }
    if (!Number.isInteger(attemptCount) || (attemptCount as number) < 1) {
      errors.push(`completedMissions.${missionId}.attemptCount is invalid`);
    }

    if (
      isIsoTimestamp(completedAt) &&
      Number.isInteger(bestCorrectCount) &&
      Number.isInteger(attemptCount)
    ) {
      completedMissions[missionId] = {
        completedAt,
        bestCorrectCount: bestCorrectCount as number,
        attemptCount: attemptCount as number,
      };
    }
  }

  const completedIds = Object.keys(completedMissions) as MissionId[];
  for (const missionId of completedIds) {
    const missionNumber = Number(missionId.split("-")[1]);
    for (let prerequisite = 1; prerequisite < missionNumber; prerequisite += 1) {
      if (!completedMissions[`mission-${prerequisite}` as MissionId]) {
        errors.push(`${missionId} is completed without its prerequisite`);
      }
    }
  }

  return completedMissions;
}

function validateActiveAttempt(
  value: unknown,
  completedMissions: CompletedMissions,
  errors: string[],
): ActiveAttempt | null {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["missionId", "answers", "revealedExplanation", "currentIndex"])
  ) {
    errors.push("activeAttempt has an invalid shape");
    return null;
  }

  const { missionId, answers, revealedExplanation, currentIndex } = value;
  const missionIdValid = typeof missionId === "string" && isMissionId(missionId);
  if (!missionIdValid) {
    errors.push("activeAttempt.missionId is invalid");
  }
  if (!Array.isArray(answers) || answers.length !== 3) {
    errors.push("activeAttempt.answers must contain three entries");
  }
  if (!Array.isArray(revealedExplanation) || revealedExplanation.length !== 3) {
    errors.push("activeAttempt.revealedExplanation must contain three entries");
  }
  if (!Number.isInteger(currentIndex) || (currentIndex as number) < 0 || (currentIndex as number) > 2) {
    errors.push("activeAttempt.currentIndex is invalid");
  }

  if (
    !Array.isArray(answers) ||
    answers.length !== 3 ||
    !Array.isArray(revealedExplanation) ||
    revealedExplanation.length !== 3 ||
    !Number.isInteger(currentIndex) ||
    (currentIndex as number) < 0 ||
    (currentIndex as number) > 2
  ) {
    return null;
  }

  if (missionIdValid && !isMissionUnlocked(missionId, completedMissions)) {
    errors.push("activeAttempt references a locked mission");
  }

  const answersValid = answers.every(
    (answer) =>
      answer === null ||
      (typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer <= 3),
  );
  const revealedValid = revealedExplanation.every(
    (revealed) => typeof revealed === "boolean",
  );
  if (!answersValid) {
    errors.push("activeAttempt.answers contains an invalid answer");
  }
  if (!revealedValid) {
    errors.push("activeAttempt.revealedExplanation contains a non-boolean value");
  }

  for (let index = 0; index < 3; index += 1) {
    if (revealedExplanation[index] && answers[index] === null) {
      errors.push(`activeAttempt question ${index} reveals an explanation without an answer`);
    }
    if (index < (currentIndex as number) && (answers[index] === null || !revealedExplanation[index])) {
      errors.push(`activeAttempt question ${index} is incomplete before currentIndex`);
    }
    if (index > (currentIndex as number) && (answers[index] !== null || revealedExplanation[index])) {
      errors.push(`activeAttempt question ${index} contains future progress`);
    }
  }

  if (!missionIdValid || !answersValid || !revealedValid) {
    return null;
  }

  return {
    missionId,
    answers: answers as ActiveAttempt["answers"],
    revealedExplanation: revealedExplanation as ActiveAttempt["revealedExplanation"],
    currentIndex: currentIndex as ActiveAttempt["currentIndex"],
  };
}

export function validateProgressData(value: unknown): ProgressValidationResult {
  const errors: string[] = [];

  if (!isRecord(value) || !hasOnlyKeys(value, ROOT_KEYS)) {
    return { valid: false, progress: null, errors: ["progress has an invalid root shape"] };
  }

  if (value.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }

  let nickname = "";
  if (typeof value.nickname !== "string") {
    errors.push("nickname must be a string");
  } else {
    try {
      nickname = normalizeNickname(value.nickname);
      if (nickname !== value.nickname) {
        errors.push("nickname must already be trimmed");
      }
    } catch {
      errors.push("nickname must contain 2 to 12 characters");
    }
  }

  if (!isIsoTimestamp(value.createdAt)) {
    errors.push("createdAt must be an ISO timestamp");
  }
  if (!isIsoTimestamp(value.updatedAt)) {
    errors.push("updatedAt must be an ISO timestamp");
  }
  if (
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  ) {
    errors.push("updatedAt cannot be earlier than createdAt");
  }

  const createdAt = isIsoTimestamp(value.createdAt) ? value.createdAt : "1970-01-01T00:00:00.000Z";
  const updatedAt = isIsoTimestamp(value.updatedAt) ? value.updatedAt : createdAt;
  const completedMissions =
    validateCompletedMissions(value.completedMissions, createdAt, updatedAt, errors) ?? {};
  const activeAttempt = validateActiveAttempt(value.activeAttempt, completedMissions, errors);

  let lastVisitedMissionId: MissionId | null = null;
  if (value.lastVisitedMissionId !== null) {
    if (typeof value.lastVisitedMissionId !== "string" || !isMissionId(value.lastVisitedMissionId)) {
      errors.push("lastVisitedMissionId is invalid");
    } else if (!isMissionUnlocked(value.lastVisitedMissionId, completedMissions)) {
      errors.push("lastVisitedMissionId references a locked mission");
    } else {
      lastVisitedMissionId = value.lastVisitedMissionId;
    }
  }

  if (errors.length > 0) {
    return { valid: false, progress: null, errors };
  }

  return {
    valid: true,
    progress: {
      schemaVersion: 1,
      nickname,
      createdAt,
      updatedAt,
      completedMissions,
      activeAttempt,
      lastVisitedMissionId,
    },
    errors: [],
  };
}

const STORAGE_UNAVAILABLE_WARNING: StorageWarning = {
  code: "storage-unavailable",
  message: "브라우저 저장소를 사용할 수 없어 현재 세션에서만 진행됩니다.",
};

const CORRUPT_DATA_WARNING: StorageWarning = {
  code: "corrupt-data-reset",
  message: "저장된 학습 데이터가 손상되어 안전한 초기 상태로 복구했습니다.",
};

export class ProgressStore {
  private sessionProgress: UnityMissionProgress | null = null;

  constructor(private readonly storage: StorageLike | null) {}

  load(): LoadProgressResult {
    if (!this.storage) {
      return {
        progress: this.sessionProgress,
        persistenceAvailable: false,
        warning: STORAGE_UNAVAILABLE_WARNING,
      };
    }

    let serialized: string | null;
    try {
      serialized = this.storage.getItem(PROGRESS_STORAGE_KEY);
    } catch {
      return {
        progress: this.sessionProgress,
        persistenceAvailable: false,
        warning: STORAGE_UNAVAILABLE_WARNING,
      };
    }

    if (serialized === null) {
      return {
        progress: this.sessionProgress,
        persistenceAvailable: true,
        warning: null,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      this.resetCorruptStorage();
      return { progress: null, persistenceAvailable: true, warning: CORRUPT_DATA_WARNING };
    }

    const validation = validateProgressData(parsed);
    if (!validation.valid) {
      this.resetCorruptStorage();
      return { progress: null, persistenceAvailable: true, warning: CORRUPT_DATA_WARNING };
    }

    this.sessionProgress = validation.progress;
    return { progress: validation.progress, persistenceAvailable: true, warning: null };
  }

  save(progress: UnityMissionProgress): SaveProgressResult {
    const validation = validateProgressData(progress);
    if (!validation.valid) {
      throw new Error(`Refusing to save invalid progress: ${validation.errors.join("; ")}`);
    }

    this.sessionProgress = validation.progress;
    if (!this.storage) {
      return { persisted: false, warning: STORAGE_UNAVAILABLE_WARNING };
    }

    try {
      this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(validation.progress));
      return { persisted: true, warning: null };
    } catch {
      return { persisted: false, warning: STORAGE_UNAVAILABLE_WARNING };
    }
  }

  clear(): SaveProgressResult {
    this.sessionProgress = null;
    if (!this.storage) {
      return { persisted: false, warning: STORAGE_UNAVAILABLE_WARNING };
    }

    try {
      this.storage.removeItem(PROGRESS_STORAGE_KEY);
      return { persisted: true, warning: null };
    } catch {
      return { persisted: false, warning: STORAGE_UNAVAILABLE_WARNING };
    }
  }

  getSessionProgress(): UnityMissionProgress | null {
    return this.sessionProgress;
  }

  private resetCorruptStorage(): void {
    this.sessionProgress = null;
    try {
      this.storage?.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      // The in-memory reset still keeps the app usable for this session.
    }
  }
}
