import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const WAREHOUSE_SCENARIO = {
  key: "warehouse-gps-denial-standard",
  name: "Warehouse GPS-Denial Standard",
  version: "1.0.0",
  description:
    "The canonical SpaceBorn benchmark: a Husky A200 explores a warehouse while GPS degrades from full signal to total denial across three phases, requiring a seamless handoff to SLAM + Nav2 frontier exploration.",
  worldFile: "warehouse.sdf",
  difficulty: "Standard",
  durationSec: 600,
  jammingProfile: {
    phaseFractions: { gpsAvailable: 0.25, hybrid: 0.25, denied: 0.5 },
    gpsRadiusMeters: { start: 3, hybridStart: 5, hybridEnd: 60, denied: null },
  },
  goalDefinition: { totalGoals: 6, explorationTarget: true },
  scoringWeights: {
    localizationContinuity: 0.25,
    slamMapQuality: 0.2,
    gpsDenialTransition: 0.15,
    navigationPerformance: 0.2,
    explorationCompleteness: 0.1,
    safety: 0.1,
  },
  sensorSuite: {
    camera: { model: "Intel RealSense D435i", rgbRate: 30, depthRate: 30, resolution: "848x480" },
    imu: { rate: 100, model: "Bosch BMI085" },
    gps: { rate: 10, model: "u-blox NEO-M8N (simulated degradation)" },
  },
};

const OFFICE_SCENARIO = {
  key: "office-partial-jam",
  name: "Office Partial Jam",
  version: "1.0.0",
  description:
    "A tighter, more cluttered office environment with a shorter, sharper GPS jamming window — stresses fast re-localization and narrow-corridor navigation.",
  worldFile: "office.sdf",
  difficulty: "Advanced",
  durationSec: 420,
  jammingProfile: {
    phaseFractions: { gpsAvailable: 0.15, hybrid: 0.15, denied: 0.7 },
    gpsRadiusMeters: { start: 2, hybridStart: 8, hybridEnd: 100, denied: null },
  },
  goalDefinition: { totalGoals: 8, explorationTarget: true },
  scoringWeights: {
    localizationContinuity: 0.25,
    slamMapQuality: 0.2,
    gpsDenialTransition: 0.2,
    navigationPerformance: 0.2,
    explorationCompleteness: 0.05,
    safety: 0.1,
  },
  sensorSuite: {
    camera: { model: "Intel RealSense D435i", rgbRate: 30, depthRate: 30, resolution: "848x480" },
    imu: { rate: 100, model: "Bosch BMI085" },
    gps: { rate: 10, model: "u-blox NEO-M8N (simulated degradation)" },
  },
};

async function main() {
  console.log("Seeding SpaceBorn demo data...");

  const passwordHash = await bcrypt.hash("Passw0rd!", 12);

  const org = await prisma.org.upsert({
    where: { slug: "spaceborn-demo" },
    update: {},
    create: {
      name: "SpaceBorn Demo Org",
      slug: "spaceborn-demo",
      planTier: "TEAM",
      quotaSimMinutes: 2000,
      maxConcurrentRuns: 5,
      users: {
        create: [
          { email: "demo@spaceborn.dev", name: "Demo Admin", role: "ADMIN", passwordHash },
          { email: "engineer@spaceborn.dev", name: "Priya Engineer", role: "ENGINEER", passwordHash },
        ],
      },
    },
    include: { users: true },
  });

  const warehouse = await prisma.scenario.upsert({
    where: { key: WAREHOUSE_SCENARIO.key },
    update: {},
    create: WAREHOUSE_SCENARIO,
  });

  const office = await prisma.scenario.upsert({
    where: { key: OFFICE_SCENARIO.key },
    update: {},
    create: OFFICE_SCENARIO,
  });

  const referenceStack = await prisma.stack.upsert({
    where: { orgId_name: { orgId: org.id, name: "Reference RTAB-Map Stack" } },
    update: {},
    create: { orgId: org.id, name: "Reference RTAB-Map Stack" },
  });

  const refVersion = await prisma.stackVersion.upsert({
    where: { stackId_version: { stackId: referenceStack.id, version: "1.0.0" } },
    update: {},
    create: {
      stackId: referenceStack.id,
      version: "1.0.0",
      submissionType: "PARAM_OVERRIDE",
      paramOverrides: {
        "Grid/RayTracing": true,
        "Vis/MaxDepth": 8.0,
        "Odom/Holonomic": false,
      },
      manifest: { capabilities: ["slam", "navigation", "exploration"] },
      cmdVelType: "TwistStamped",
      capabilities: ["slam", "navigation", "exploration"],
      createdBy: org.users[0].id,
    },
  });

  const acmeStack = await prisma.stack.upsert({
    where: { orgId_name: { orgId: org.id, name: "Acme Nav Stack" } },
    update: {},
    create: { orgId: org.id, name: "Acme Nav Stack" },
  });

  const acmeVersion = await prisma.stackVersion.upsert({
    where: { stackId_version: { stackId: acmeStack.id, version: "1.4.0" } },
    update: {},
    create: {
      stackId: acmeStack.id,
      version: "1.4.0",
      submissionType: "DOCKER_IMAGE",
      imageRef: "registry.acme.example/acme-nav-stack:1.4.0",
      manifest: { stack_name: "acme-nav-stack", ros_distro: "humble", startup_timeout_s: 60 },
      cmdVelType: "TwistStamped",
      capabilities: ["slam", "navigation"],
      createdBy: org.users[1].id,
    },
  });

  // Seed a handful of historical runs + results so dashboard/leaderboard aren't empty on first login.
  const historical: Array<{
    stackVersionId: string;
    scenarioId: string;
    score: number;
    pass: boolean;
    errorCodes: string[];
    daysAgo: number;
  }> = [
    { stackVersionId: refVersion.id, scenarioId: warehouse.id, score: 91.4, pass: true, errorCodes: [], daysAgo: 6 },
    { stackVersionId: refVersion.id, scenarioId: warehouse.id, score: 88.9, pass: true, errorCodes: [], daysAgo: 4 },
    { stackVersionId: refVersion.id, scenarioId: office.id, score: 79.2, pass: true, errorCodes: ["ERR_GOAL_TIMEOUT"], daysAgo: 3 },
    { stackVersionId: acmeVersion.id, scenarioId: warehouse.id, score: 62.1, pass: false, errorCodes: ["ERR_CMDVEL_TYPE_MISMATCH", "ERR_GOAL_TIMEOUT"], daysAgo: 2 },
    { stackVersionId: acmeVersion.id, scenarioId: warehouse.id, score: 74.8, pass: true, errorCodes: [], daysAgo: 1 },
  ];

  for (const h of historical) {
    const createdAt = new Date(Date.now() - h.daysAgo * 86400000);
    const run = await prisma.run.create({
      data: {
        orgId: org.id,
        stackVersionId: h.stackVersionId,
        scenarioId: h.scenarioId,
        status: h.pass ? "PASSED" : "FAILED",
        seed: Math.floor(Math.random() * 1_000_000),
        startedById: org.users[0].id,
        queuedAt: createdAt,
        startedAt: createdAt,
        endedAt: new Date(createdAt.getTime() + 10 * 60000),
        createdAt,
      },
    });
    await prisma.runResult.create({
      data: {
        runId: run.id,
        overallScore: h.score,
        passFail: h.pass,
        categoryScores: {
          localizationContinuity: h.score + 2,
          slamMapQuality: h.score - 3,
          gpsDenialTransition: h.score - 1,
          navigationPerformance: h.score + 1,
          explorationCompleteness: h.score - 5,
          safety: h.pass ? 100 : 80,
        },
        errorCodes: h.errorCodes,
        artifactRefs: {},
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Org: ${org.name} (${org.slug})`);
  console.log(`  Login: demo@spaceborn.dev / Passw0rd!`);
  console.log(`  Scenarios: ${warehouse.name}, ${office.name}`);
  console.log(`  Stacks: ${referenceStack.name} (${refVersion.version}), ${acmeStack.name} (${acmeVersion.version})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
