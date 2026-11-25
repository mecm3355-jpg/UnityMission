import { notFound } from "next/navigation";
import { MissionResult } from "@/components/mission/mission-result";
import { getMissionById } from "@/content/missions";

type MissionResultPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MissionResultPage({ params, searchParams }: MissionResultPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const mission = getMissionById(id);

  if (!mission) {
    notFound();
  }

  return (
    <MissionResult
      firstParam={firstValue(query.first)}
      mission={mission}
      passParam={firstValue(query.pass)}
      scoreParam={firstValue(query.score)}
      xpParam={firstValue(query.xp)}
    />
  );
}
