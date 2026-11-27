import { AppointmentCheckInCode } from "@/components/merchant/appointments/appointment-check-in-code";
import { QrCheckInButton } from "@/components/merchant/appointments/qr-check-in-button";
import { Button } from "@/components/ui/button";

export default function SmokePage() {
  const code = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  return (
    <main className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <QrCheckInButton tenantId={code} />
        <Button variant="brand" size="form">+ New Booking</Button>
      </div>
      <AppointmentCheckInCode code={code} />
    </main>
  );
}
