import { notFound } from "next/navigation";
import { MissionDetail } from "@/components/mission/mission-detail";
import { getMissionById } from "@/content/missions";

type MissionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MissionPage({ params }: MissionPageProps) {
  const { id } = await params;
  const mission = getMissionById(id);

  if (!mission) {
    notFound();
  }

  return <MissionDetail mission={mission} />;
}
