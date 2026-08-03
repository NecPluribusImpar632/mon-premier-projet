"use client";

import { useEffect, useState } from "react";
import { ARRONDISSEMENTS, DEPARTMENTS, arrondissementLabel } from "@/lib/property/departments";
import { DEPARTMENT_SENSITIVITY } from "@/lib/scenarios/realEstateSensitivity";
import { getCommunesForDepartment } from "@/lib/actions/geo";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";

const PARIS_CODE = "75";

interface LocationFieldsProps {
  defaultDepartment?: string;
  defaultArrondissement?: number;
  defaultCommuneCode?: string;
}

export function LocationFields({
  defaultDepartment = "",
  defaultArrondissement,
  defaultCommuneCode = "",
}: LocationFieldsProps) {
  const [department, setDepartment] = useState(defaultDepartment);
  const [communeCode, setCommuneCode] = useState(defaultCommuneCode);
  // Tagged with the department it was fetched for, so "loading" can be derived
  // at render time (communes.department !== department) instead of tracked as
  // separate state set synchronously inside the effect.
  const [communes, setCommunes] = useState<{
    department: string;
    list: { code: string; name: string }[];
  }>({ department: "", list: [] });

  // Only departments without their own dedicated Notaires-INSEE data need a
  // commune (to resolve a zonage A/B/C coefficient) — Paris uses its
  // arrondissement data instead, and the other 7 IDF departments already have
  // their own department-level coefficient regardless of commune.
  const needsCommune = department !== "" && department !== PARIS_CODE && !(department in DEPARTMENT_SENSITIVITY);
  const communesLoading = needsCommune && communes.department !== department;

  useEffect(() => {
    if (!needsCommune) return;
    let cancelled = false;
    getCommunesForDepartment(department).then((result) => {
      if (!cancelled) setCommunes({ department, list: result });
    });
    return () => {
      cancelled = true;
    };
  }, [department, needsCommune]);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Département
        <select
          name="department"
          required
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setCommuneCode("");
          }}
          className={FIELD_CLASS}
        >
          <option value="" disabled>
            Sélectionner un département
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} - {d.name}
            </option>
          ))}
        </select>
      </label>

      {department === PARIS_CODE && (
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Arrondissement
          <select
            name="arrondissement"
            required
            defaultValue={defaultArrondissement ?? ""}
            className={FIELD_CLASS}
          >
            <option value="" disabled>
              Sélectionner un arrondissement
            </option>
            {ARRONDISSEMENTS.map((n) => (
              <option key={n} value={n}>
                {arrondissementLabel(n)}
              </option>
            ))}
          </select>
        </label>
      )}

      {needsCommune && (
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Commune
          <select
            name="communeCode"
            required
            value={communeCode}
            onChange={(e) => setCommuneCode(e.target.value)}
            disabled={communesLoading}
            className={FIELD_CLASS}
          >
            <option value="" disabled>
              {communesLoading ? "Chargement…" : "Sélectionner une commune"}
            </option>
            {communes.list.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
