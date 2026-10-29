/*
 * routes for the global landing page.
 * sign-up, contact, demo and help routes don't exist yet, so those point at
 * on-page anchors / login until the pages are built.
 */
export const landingLinks = {
  home: "/",
  about: "#about",
  features: "#features",
  pricing: "#pricing",
  login: "/login",
  signup: "/login",
  getStarted: "#pricing",
  bookDemo: "#contact",
  contact: "#contact",
  help: "#contact",
} as const;

export const navLinks = [
  { label: "Home", href: landingLinks.home },
  { label: "About", href: landingLinks.about },
  { label: "Features", href: landingLinks.features },
  { label: "Pricing", href: landingLinks.pricing },
] as const;
