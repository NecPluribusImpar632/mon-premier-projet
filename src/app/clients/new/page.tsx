import { createClient } from "@/lib/actions/clients";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function NewClientPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-14 sm:py-20">
      <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
        Nouveau client
      </h1>
      <form action={createClient} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Nom
          <input name="name" type="text" required className={FIELD_CLASS} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Âge
          <input
            name="age"
            type="number"
            min={0}
            max={120}
            required
            className={FIELD_CLASS}
          />
        </label>
        <SubmitButton>Créer</SubmitButton>
      </form>
    </div>
  );
}
