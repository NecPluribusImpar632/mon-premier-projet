"use client";

import { useState } from "react";
import { ARRONDISSEMENTS, DEPARTMENTS, arrondissementLabel } from "@/lib/property/departments";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";

const PARIS_CODE = "75";

export function LocationFields() {
  const [department, setDepartment] = useState("");

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Département
        <select
          name="department"
          required
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
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
          <select name="arrondissement" required defaultValue="" className={FIELD_CLASS}>
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
    </>
  );
}
