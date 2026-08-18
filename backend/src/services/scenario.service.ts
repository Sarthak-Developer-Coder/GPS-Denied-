import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError";

export async function listScenarios() {
  return prisma.scenario.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getScenario(id: string) {
  const scenario = await prisma.scenario.findUnique({ where: { id } });
  if (!scenario) throw ApiError.notFound("Scenario not found");
  return scenario;
}
