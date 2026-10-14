/**
 * Remise à zéro du compte de démonstration.
 *
 *   DEMO_PASSWORD=... npx tsx --env-file=.env scripts/reset-demo-account.ts
 *
 * - Crée le compte (DEMO_EMAIL, défaut demo@logiciel.fr) s'il n'existe pas,
 *   sinon remet son mot de passe à DEMO_PASSWORD.
 * - Vérifie l'empreinte avec le même schéma que src/lib/auth/password.ts
 *   (scrypt, sel hexa 16 octets, clé 64 octets, format "sel:empreinte"), qui
 *   est réimplémenté ici parce que ce module importe "server-only" et ne peut
 *   pas être chargé hors de Next.
 * - Efface les 8 clients de démo de référence, par identifiant (les biens,
 *   prêts, scénarios et répartitions suivent par cascade), puis les recrée
 *   depuis DEMO_CLIENTS ci-dessous avec leurs identifiants d'origine, pour que
 *   les liens déjà partagés restent valables. Les dossiers créés par un testeur
 *   depuis le compte de démo ne sont pas touchés. Force le rôle "advisor" : la
 *   démo ne doit jamais être administratrice.
 *
 * Ce script écrit dans la base pointée par DATABASE_URL, donc en production
 * si c'est la base partagée : à ne lancer qu'avec l'accord explicite de Johan.
 */
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(hash, "hex");
  return key.length === storedKey.length && timingSafeEqual(key, storedKey);
}

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

type DemoLoan = Omit<Prisma.LoanCreateWithoutPropertyInput, "createdAt" | "updatedAt">;
type DemoProperty = Omit<
  Prisma.PropertyCreateWithoutClientInput,
  "loans" | "createdAt" | "updatedAt"
> & { loans?: DemoLoan[] };
type DemoClient = Omit<
  Prisma.ClientCreateWithoutOwnerInput,
  | "properties"
  | "wrapperAllocations"
  | "actionsIndexAllocations"
  | "savedScenarios"
  | "wealthGoalProposal"
  | "updatedAt"
> & {
  id: string;
  createdAt: Date;
  properties?: DemoProperty[];
  wrapperAllocations?: Prisma.WrapperAllocationCreateWithoutClientInput[];
  actionsIndexAllocations?: Prisma.ActionsIndexAllocationCreateWithoutClientInput[];
  /** Allocation proposée pour la comparaison avant / après (une par client). */
  wealthGoalProposal?: Omit<
    Prisma.WealthGoalProposalCreateWithoutClientInput,
    "createdAt" | "updatedAt"
  >;
};

// État de référence de la démo. `createdAt` est conservé pour garder l'ordre
// d'affichage de la liste des clients ; les identifiants sont ceux d'origine.
// Marc est le dossier pensé pour la comparaison avant / après : pas
// d'immobilier, 800 000 € de poche financière, une proposition qui bascule
// 400 000 € de liquidités vers les actions (67 % → 81 % à sa création).
const DEMO_CLIENTS: DemoClient[] = [
  {
    id: "cmsd7e2ks0000b1ff1ddhklip",
    createdAt: date("2026-08-03"),
    name: "Jean-Jacques",
    age: 56,
    actionsAmount: 520000,
    monthlySavingsAmount: 0,
    wealthGoalAge: 64,
  },
  {
    id: "cmsdi3rei0005d0exbi2396je",
    createdAt: date("2026-08-03"),
    name: "Jeanne",
    age: 42,
    actionsAmount: 250000,
    feesActionsPct: 1.5,
    feesObligationsPct: 1,
    feesScpiPct: 0,
    feesPrivateEquityPct: 2,
    feesImmobilierPct: 0,
    properties: [
      {
        id: "cmsdi6b7x0006d0exzfuycflg",
        name: "Saint georges",
        currentValue: 1510000,
        department: "75",
        arrondissement: 16,
        loans: [{ originalAmount: 750000, remainingAmount: 750000, rate: 3.5, termYears: 20 }],
      },
    ],
  },
  {
    id: "cmsdiuqap0000ewexbdr3mkp9",
    createdAt: date("2026-08-03"),
    name: "Christophe",
    age: 36,
    actionsAmount: 250000,
    obligationsAmount: 120000,
    scpiAmount: 150000,
    liquiditesAmount: 450000,
    privateEquityAmount: 15000,
    riskProfile: "equilibre",
    wealthGoalAmount: 0,
    wealthGoalAge: 56,
    maritalStatus: "marie",
    spouseImmobilierAmount: 250000,
    spouseScpiAmount: 0,
    spouseDebtAmount: 100000,
    minorChildrenCount: 2,
    adultChildrenCount: 1,
    wrapperAllocations: [{ category: "actions", wrapper: "per", amount: 50000 }],
    properties: [
      {
        id: "cmsdiz8yw0001ewexuv8ekgwn",
        name: "Rue de Longchamps",
        currentValue: 1400000,
        monthlyRent: 3800,
        acquisitionPrice: 1250000,
        acquisitionDate: date("2018-09-20"),
        department: "75",
        arrondissement: 16,
        loans: [{ originalAmount: 500000, remainingAmount: 500000, rate: 5, termYears: 20 }],
      },
      {
        id: "cmsdxaa9x00008gex8n385tpq",
        name: "Saint georges",
        currentValue: 1510000,
        acquisitionPrice: 1150000,
        acquisitionDate: date("2013-03-15"),
        department: "75",
        arrondissement: 15,
        loans: [{ originalAmount: 1510000, remainingAmount: 435000, rate: 0.1, termYears: 15 }],
      },
      {
        id: "cmshyzqnl00005kexfeiuvvgz",
        name: "Rue de Vaugirard",
        currentValue: 2700000,
        isPrimaryResidence: true,
        acquisitionPrice: 2300000,
        acquisitionDate: date("2019-06-12"),
        department: "75",
        arrondissement: 15,
        loans: [{ originalAmount: 1900000, remainingAmount: 1500000, rate: 4, termYears: 13 }],
      },
    ],
  },
  {
    id: "cmseyuujz0000t8exlj6ty4ar",
    createdAt: date("2026-08-04"),
    name: "Thierry",
    age: 59,
    actionsAmount: 400000,
  },
  {
    id: "cmsfgxrnt0001b1ffday1ppmb",
    createdAt: date("2026-08-05"),
    name: "Jérôme Kerviel",
    age: 45,
    actionsAmount: 250000,
    obligationsAmount: 530000,
    immobilierAmount: 1500000,
    scpiAmount: 2500000,
    liquiditesAmount: 2250000,
    privateEquityAmount: 120000,
    outilProfessionnelAmount: 850000,
    monthlySavingsAmount: 0,
    wealthGoalAge: 64,
    maritalStatus: "marie",
    spouseImmobilierAmount: 200000,
    spouseScpiAmount: 0,
    spouseDebtAmount: 0,
    minorChildrenCount: 2,
    adultChildrenCount: 0,
    actionsIndexAllocations: [
      { index: "msci-world", percentage: 50 },
      { index: "cac40", percentage: 30 },
      { index: "nikkei225", percentage: 20 },
    ],
    properties: [
      {
        id: "cmsfw9f2l00007kexu6t5e2nk",
        name: "La Chamiere",
        currentValue: 1500000,
        monthlyRent: 5000,
        acquisitionPrice: 1500000,
        acquisitionDate: date("2025-07-17"),
        department: "75",
        arrondissement: 15,
        loans: [{ originalAmount: 1500000, remainingAmount: 1400000, rate: 5, termYears: 25 }],
      },
      {
        id: "cmskmt40t0000rgexjmqw5udd",
        name: "Rue des Petits Cochons",
        currentValue: 5000000,
        acquisitionPrice: 3500000,
        department: "75",
        arrondissement: 15,
        loans: [{ originalAmount: 3200000, remainingAmount: 2700000, rate: 4, termYears: 20 }],
      },
      {
        id: "cmsm9jgq700008wexodi59699",
        name: "Rue Lecourbe",
        currentValue: 2500000,
        acquisitionPrice: 2500000,
        acquisitionDate: date("2024-03-08"),
        department: "75",
        arrondissement: 15,
        loans: [{ originalAmount: 2500000, remainingAmount: 2500000, rate: 3, termYears: 25 }],
      },
      {
        id: "cmst44hly0021aoex283kymaj",
        name: "Rue Ordener",
        currentValue: 1200000,
        acquisitionPrice: 950000,
        acquisitionDate: date("2009-10-14"),
        department: "75",
        arrondissement: 18,
        loans: [{ originalAmount: 800000, remainingAmount: 520000, rate: 4, termYears: 25 }],
      },
    ],
  },
  {
    id: "cmsh9vgut00000cex7tufxkq3",
    createdAt: date("2026-08-06"),
    name: "Thierry",
    age: 85,
    scpiAmount: 525000,
    outilProfessionnelAmount: 1500000,
    professionalToolMainIncome: true,
    riskProfile: "equilibre",
    properties: [
      {
        id: "cmsh9yuin00010cex50cg99fk",
        name: "Saint georges",
        currentValue: 4500000,
        acquisitionPrice: 3500000,
        acquisitionDate: date("2026-08-06"),
        department: "75",
        arrondissement: 18,
        loans: [{ originalAmount: 3500000, remainingAmount: 1200000, rate: 4, termYears: 20 }],
      },
    ],
  },
  {
    id: "cmv7demo0marc000000000001",
    createdAt: date("2026-10-14"),
    name: "Marc",
    age: 45,
    actionsAmount: 100000,
    obligationsAmount: 200000,
    liquiditesAmount: 500000,
    riskProfile: "equilibre",
    wealthGoalAmount: 1500000,
    wealthGoalAge: 60,
    wealthGoalInflationPct: 2,
    monthlySavingsAmount: 1500,
    actionsIndexAllocations: [{ index: "msci-world", percentage: 100 }],
    wealthGoalProposal: {
      actionsAmount: 500000,
      obligationsAmount: 200000,
      scpiAmount: 0,
      liquiditesAmount: 100000,
      privateEquityAmount: 0,
      matieresPremieresAmount: 0,
      actionsIndexBreakdown: { "msci-world": 100 },
      feesActionsPct: 1.5,
      feesObligationsPct: 1,
      feesScpiPct: 0,
      feesPrivateEquityPct: 2,
      feesImmobilierPct: 0,
    },
  },
  {
    id: "cmsmeli5s000068exh6wmc4dw",
    createdAt: date("2026-08-09"),
    name: "dvxv",
    age: 52,
    actionsAmount: 250000,
    obligationsAmount: 650000,
    immobilierAmount: 2500000,
    privateEquityAmount: 150000,
    properties: [
      {
        id: "cmsmfbkp1000088exbewln9ck",
        name: "fsdfs",
        currentValue: 3200000,
        acquisitionPrice: 3200000,
        acquisitionDate: date("2026-08-27"),
        department: "06",
        communeCode: "06016",
      },
    ],
  },
];

async function main() {
  const email = process.env.DEMO_EMAIL ?? "demo@logiciel.fr";
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("DEMO_PASSWORD manquant");

  const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "advisor" },
    create: { email, passwordHash, role: "advisor" },
  });
  // Par identifiant, quel que soit le propriétaire courant (un client de
  // référence réattribué à la main est repris aussi) ; les autres dossiers du
  // compte de démo survivent.
  const deleted = await prisma.client.deleteMany({
    where: { id: { in: DEMO_CLIENTS.map((c) => c.id) } },
  });

  for (const {
    properties,
    wrapperAllocations,
    actionsIndexAllocations,
    wealthGoalProposal,
    ...client
  } of DEMO_CLIENTS) {
    await prisma.client.create({
      data: {
        ...client,
        owner: { connect: { id: user.id } },
        wealthGoalProposal: wealthGoalProposal ? { create: wealthGoalProposal } : undefined,
        wrapperAllocations: wrapperAllocations ? { create: wrapperAllocations } : undefined,
        actionsIndexAllocations: actionsIndexAllocations
          ? { create: actionsIndexAllocations }
          : undefined,
        properties: properties
          ? {
              create: properties.map(({ loans, ...property }) => ({
                ...property,
                loans: loans ? { create: loans } : undefined,
              })),
            }
          : undefined,
      },
    });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  const wrong = await verifyPassword(`${password}x`, user.passwordHash);
  console.log(`compte ${email} prêt (id ${user.id}, rôle conseiller)`);
  console.log(`clients de référence effacés : ${deleted.count}, recréés : ${DEMO_CLIENTS.length}`);
  console.log(`vérification mot de passe : ${ok ? "OK" : "ECHEC"}`);
  console.log(`mauvais mot de passe : ${wrong ? "ACCEPTE (anormal)" : "refusé (normal)"}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
