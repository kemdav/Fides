"use client";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="group inline-flex items-center gap-3 self-start rounded-full py-2 pl-5 pr-2 text-xl/6 font-semibold shadow-[inset_0_0_0_2px_rgb(255_255_255)] transition-colors duration-300 hover:bg-white hover:text-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-burnt"
    >
      Back to top
      <span className="flex size-10 items-center justify-center rounded-full bg-sky text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-sky">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 transition-[translate] duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </span>
    </button>
  );
}
