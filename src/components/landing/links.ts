/*
 * routes for the global landing page.
 * sign-up goes to the request-account page; contact, demo and help routes don't exist yet, so those point at
 * on-page anchors / login until the pages are built.
 */
export const landingLinks = {
  home: "/",
  about: "#about",
  features: "#features",
  pricing: "#pricing",
  login: "/login",
  signup: "/request-account",
  getStarted: "#pricing",
  bookDemo: "#contact",
  contact: "#contact",
  help: "#contact",
} as const;

/** id matches the section element so the header can highlight the one in view */
export const navLinks = [
  { id: "home", label: "Home", href: "#home" },
  { id: "about", label: "About", href: landingLinks.about },
  { id: "features", label: "Features", href: landingLinks.features },
  { id: "pricing", label: "Pricing", href: landingLinks.pricing },
] as const;
