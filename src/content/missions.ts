import rawMissions from "./missions.json";
import { MISSION_IDS, type Mission, type MissionId } from "../types/content";

const OFFICIAL_SOURCE_HOSTS = new Set([
  "contents.history.go.kr",
  "www.korean.go.kr",
  "legal.un.org",
  "digitallibrary.un.org",
  "peacemaker.un.org",
  "www.icrc.org",
  "www.unesco.org",
  "www.unep.org",
  "sdgs.un.org",
]);

const REVIEW_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type UnknownRecord = Record<string, unknown>;

export type ContentValidationResult = {
  valid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOfficialHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && OFFICIAL_SOURCE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function hasValidReviewDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    REVIEW_DATE_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

export function isMissionId(value: string): value is MissionId {
  return MISSION_IDS.includes(value as MissionId);
}

export function validateMissionContent(value: unknown): ContentValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    return { valid: false, errors: ["missions must be an array"] };
  }

  if (value.length !== MISSION_IDS.length) {
    errors.push(`missions must contain exactly ${MISSION_IDS.length} items`);
  }

  const questionIds = new Set<string>();

  value.forEach((missionValue, missionIndex) => {
    const path = `missions[${missionIndex}]`;

    if (!isRecord(missionValue)) {
      errors.push(`${path} must be an object`);
      return;
    }

    const expectedMissionId = MISSION_IDS[missionIndex];
    if (missionValue.id !== expectedMissionId) {
      errors.push(`${path}.id must be ${expectedMissionId ?? "a valid mission id"}`);
    }
    if (missionValue.order !== missionIndex + 1) {
      errors.push(`${path}.order must match its one-based position`);
    }
    if (missionValue.rewardXp !== 100) {
      errors.push(`${path}.rewardXp must be 100`);
    }

    for (const field of ["title", "summary", "background"] as const) {
      if (!isNonEmptyString(missionValue[field])) {
        errors.push(`${path}.${field} must be a non-empty string`);
      }
    }

    if (
      !Array.isArray(missionValue.learningObjectives) ||
      missionValue.learningObjectives.length !== 2 ||
      !missionValue.learningObjectives.every(isNonEmptyString)
    ) {
      errors.push(`${path}.learningObjectives must contain exactly two non-empty strings`);
    }

    if (!Array.isArray(missionValue.questions) || missionValue.questions.length !== 3) {
      errors.push(`${path}.questions must contain exactly three questions`);
      return;
    }

    missionValue.questions.forEach((questionValue, questionIndex) => {
      const questionPath = `${path}.questions[${questionIndex}]`;
      if (!isRecord(questionValue)) {
        errors.push(`${questionPath} must be an object`);
        return;
      }

      const expectedQuestionId = `${expectedMissionId}-q${questionIndex + 1}`;
      if (questionValue.id !== expectedQuestionId) {
        errors.push(`${questionPath}.id must be ${expectedQuestionId}`);
      }
      if (typeof questionValue.id === "string") {
        if (questionIds.has(questionValue.id)) {
          errors.push(`${questionPath}.id must be unique`);
        }
        questionIds.add(questionValue.id);
      }

      if (!isNonEmptyString(questionValue.prompt)) {
        errors.push(`${questionPath}.prompt must be a non-empty string`);
      }
      if (!isNonEmptyString(questionValue.explanation)) {
        errors.push(`${questionPath}.explanation must be a non-empty string`);
      }
      if (!isNonEmptyString(questionValue.hint)) {
        errors.push(`${questionPath}.hint must be a non-empty string`);
      }

      if (
        !Array.isArray(questionValue.options) ||
        questionValue.options.length !== 4 ||
        !questionValue.options.every(isNonEmptyString)
      ) {
        errors.push(`${questionPath}.options must contain exactly four non-empty strings`);
      } else if (new Set(questionValue.options).size !== 4) {
        errors.push(`${questionPath}.options must be unique`);
      }

      if (
        !Number.isInteger(questionValue.correctIndex) ||
        (questionValue.correctIndex as number) < 0 ||
        (questionValue.correctIndex as number) > 3
      ) {
        errors.push(`${questionPath}.correctIndex must be an integer from 0 to 3`);
      }

      if (!isRecord(questionValue.source)) {
        errors.push(`${questionPath}.source must be an object`);
        return;
      }

      if (!isNonEmptyString(questionValue.source.title)) {
        errors.push(`${questionPath}.source.title must be a non-empty string`);
      }
      if (!isNonEmptyString(questionValue.source.organization)) {
        errors.push(`${questionPath}.source.organization must be a non-empty string`);
      }
      if (!isOfficialHttpsUrl(questionValue.source.url)) {
        errors.push(`${questionPath}.source.url must be an approved official HTTPS URL`);
      }
      if (!hasValidReviewDate(questionValue.source.reviewedAt)) {
        errors.push(`${questionPath}.source.reviewedAt must be a valid YYYY-MM-DD date`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

const validation = validateMissionContent(rawMissions);

if (!validation.valid) {
  throw new Error(`Invalid mission content:\n${validation.errors.join("\n")}`);
}

export const missions = rawMissions as Mission[];

export function getMissionById(id: string): Mission | undefined {
  if (!isMissionId(id)) {
    return undefined;
  }

  return missions.find((mission) => mission.id === id);
}
