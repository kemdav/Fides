// contact, demo and help pages don't exist yet, so those links point at on-page anchors
export const landingLinks = {
  home: "/",
  about: "#about",
  features: "#features",
  pricing: "#pricing",
  login: "/login",
  signup: "/register",
  getStarted: "#pricing",
  bookDemo: "#contact",
  contact: "#contact",
  help: "#contact",
} as const;

export const navLinks = [
  { id: "home", label: "Home", href: "#home" },
  { id: "about", label: "About", href: landingLinks.about },
  { id: "features", label: "Features", href: landingLinks.features },
  { id: "pricing", label: "Pricing", href: landingLinks.pricing },
] as const;
