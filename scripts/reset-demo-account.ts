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
 * - Efface tous les clients dont le compte de démo est propriétaire (les biens,
 *   prêts, scénarios et répartitions suivent par cascade) et force le rôle
 *   "advisor" : la démo ne doit jamais être administratrice.
 *
 * Ce script écrit dans la base pointée par DATABASE_URL, donc en production
 * si c'est la base partagée : à ne lancer qu'avec l'accord explicite de Johan.
 */
import { PrismaClient } from "../src/generated/prisma/client";
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
  const deleted = await prisma.client.deleteMany({ where: { ownerId: user.id } });

  const ok = await verifyPassword(password, user.passwordHash);
  const wrong = await verifyPassword(`${password}x`, user.passwordHash);
  console.log(`compte ${email} prêt (id ${user.id}, rôle conseiller)`);
  console.log(`clients de démo effacés : ${deleted.count}`);
  console.log(`vérification mot de passe : ${ok ? "OK" : "ECHEC"}`);
  console.log(`mauvais mot de passe : ${wrong ? "ACCEPTE (anormal)" : "refusé (normal)"}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
