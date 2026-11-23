import type { Metadata } from "next";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about Fides, pricing or getting started? Send us a message and we will get back to you.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="bg-powder">
      <Header />
      <main className="flex min-h-[calc(100dvh-4rem-96px)] items-center px-4 py-12 sm:px-8 lg:min-h-[calc(100dvh-88px-140px)] lg:px-[78px] lg:py-[72px]">
        <div className="mx-auto grid w-full max-w-[1100px] gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="text-sm font-semibold uppercase text-burnt">Contact us</p>
            <h1 className="font-display text-4xl leading-tight text-ink lg:text-[56px]">
              Let&apos;s talk about <span className="text-burnt">your business</span>
            </h1>
            <p className="max-w-[460px] text-lg text-muted">
              Questions about plans, setup or booking your first demo? Send us a message and the Fides team will reply by email.
            </p>
          </div>
          <ContactForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
