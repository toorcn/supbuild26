import { redirect } from "next/navigation";
import { NoUpcomingMeetings } from "@/components/no-upcoming-meetings";
import { getCalendar } from "@/lib/neo4j-memory";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const calendar = await getCalendar();
  const nextMeeting = calendar.meetings[0];
  if (!nextMeeting) {
    return <NoUpcomingMeetings source={calendar.source} warning={calendar.warning} />;
  }

  redirect(`/briefing/${nextMeeting.id}`);
}
