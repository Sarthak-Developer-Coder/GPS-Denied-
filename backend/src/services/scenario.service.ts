import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";
import { parseJson } from "../utils/json";

export async function listScenarios() {
  const scenarios = await prisma.scenario.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return scenarios.map((scenario) => ({
    ...scenario,
    jammingProfile: parseJson<Record<string, unknown>>(scenario.jammingProfile, {}),
    goalDefinition: parseJson<Record<string, unknown>>(scenario.goalDefinition, {}),
    scoringWeights: parseJson<Record<string, number>>(scenario.scoringWeights, {}),
    sensorSuite: parseJson<Record<string, unknown>>(scenario.sensorSuite, {}),
  }));
}

export async function getScenario(id: string) {
  const scenario = await prisma.scenario.findUnique({ where: { id } });
  if (!scenario) throw ApiError.notFound("Scenario not found");
  return {
    ...scenario,
    jammingProfile: parseJson<Record<string, unknown>>(scenario.jammingProfile, {}),
    goalDefinition: parseJson<Record<string, unknown>>(scenario.goalDefinition, {}),
    scoringWeights: parseJson<Record<string, number>>(scenario.scoringWeights, {}),
    sensorSuite: parseJson<Record<string, unknown>>(scenario.sensorSuite, {}),
  };
}
