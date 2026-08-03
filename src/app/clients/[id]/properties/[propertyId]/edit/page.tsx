import { notFound } from "next/navigation";
import { getClient } from "@/lib/actions/clients";
import { getProperty, updateProperty } from "@/lib/actions/properties";
import { PropertyForm } from "@/components/property/PropertyForm";

interface EditPropertyPageProps {
  params: Promise<{ id: string; propertyId: string }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id, propertyId } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const property = await getProperty(propertyId, client.id);

  if (!property) {
    notFound();
  }

  const updatePropertyForClient = updateProperty.bind(null, property.id, client.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-14 sm:py-20">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
          Modifier le bien
        </h1>
        <p className="mt-1 text-sm text-slate">Pour {client.name}</p>
      </div>
      <PropertyForm
        action={updatePropertyForClient}
        defaultValues={property}
        submitLabel="Enregistrer"
      />
    </div>
  );
}
