import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { createProperty } from "@/lib/actions/properties";
import { PropertyForm } from "@/components/property/PropertyForm";

interface NewPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewPropertyPage({ params }: NewPropertyPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const createPropertyForClient = createProperty.bind(null, client.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-14 sm:py-20">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
          Nouveau bien immobilier
        </h1>
        <p className="mt-1 text-sm text-slate">Pour {client.name}</p>
      </div>
      <PropertyForm action={createPropertyForClient} submitLabel="Créer" />
    </div>
  );
}
