import { SchedulePage } from "../appointments/schedule-page";

export const metadata = { title: "Walk-ins" };

export default function WalkInsPage({ params }: { params: Promise<{ slug: string }> }) {
  return <SchedulePage params={params} walkInsOnly />;
}
