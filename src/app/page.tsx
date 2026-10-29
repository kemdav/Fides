import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Operations } from "@/components/landing/operations";
import { Pricing } from "@/components/landing/pricing";

export default function Home() {
  return (
    <div className="bg-powder">
      <Header />
      <main>
        <Hero />
        <Operations />
        <Features />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
