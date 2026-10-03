import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { Container } from "@/components/layout/container";

const surfaces = [
  {
    title: "Provider website & PWA",
    description:
      "Customer-facing booking site, served per tenant on its own subdomain.",
  },
  {
    title: "Management dashboard",
    description:
      "Operational surface for business owners and employees.",
  },
  {
    title: "Fides admin portal",
    description:
      "Platform administration for merchant verification and tenant oversight.",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh py-16">
      <Container className="flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Multi-tenant SaaS platform
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            Fides
          </h1>
          <p className="max-w-2xl text-base text-neutral-600">
            Technical foundation initialized. Application surfaces, routing, and
            integrations are scaffolded and ready for feature development.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {surfaces.map((surface) => (
            <Card key={surface.title}>
              <CardHeader>
                <CardTitle>{surface.title}</CardTitle>
                <CardDescription>{surface.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Component primitives</CardTitle>
              <CardDescription>
                Headless shells awaiting the Figma design tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input placeholder="Input primitive" aria-label="Example input" />
              <div className="flex flex-wrap gap-2">
                <Button>Solid</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform configuration</CardTitle>
              <CardDescription>
                Populate <code>.env.example</code> to connect Supabase, Gemini, and
                SMTP.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              <ul className="list-inside list-disc space-y-1">
                <li>Supabase Auth, RLS, Storage, Realtime, pgvector</li>
                <li>Google Gemini API (3.0s concierge timeout)</li>
                <li>SMTP transactional mailer</li>
                <li>Wildcard subdomain tenant routing</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </Container>
    </main>
  );
}

