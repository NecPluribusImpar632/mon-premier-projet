import { redirect } from "next/navigation";

interface ScenariosPageProps {
  params: Promise<{ id: string }>;
}

// The scenario simulator now lives as a tab on the client page rather than its own
// route — this redirect keeps any existing bookmark or inbound link working.
export default async function ScenariosPage({ params }: ScenariosPageProps) {
  const { id } = await params;
  redirect(`/clients/${id}?tab=scenarios`);
}
