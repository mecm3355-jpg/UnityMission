import { notFound } from "next/navigation";
import { MissionPlay } from "@/components/mission/mission-play";
import { getMissionById } from "@/content/missions";

type MissionPlayPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MissionPlayPage({ params }: MissionPlayPageProps) {
  const { id } = await params;
  const mission = getMissionById(id);

  if (!mission) {
    notFound();
  }

  return <MissionPlay mission={mission} />;
}
