/**
 * Portfolio templates. Each entry points at a real, officially published and
 * permissively licensed template so the candidate can download the original
 * from its own site; the in-app renderer fills the same structure with the
 * candidate's stored profile data.
 */
export type PortfolioTemplate = {
  id: string;
  name: string;
  author: string;
  license: string;
  /** Official page for the template. */
  source: string;
  blurb: string;
  accent: string;
  layout: "sidebar" | "hero" | "grid" | "timeline";
};

export const SITE_TEMPLATES: PortfolioTemplate[] = [
  {
    id: "html5up-strata",
    name: "Strata",
    author: "HTML5 UP",
    license: "CC BY 3.0",
    source: "https://html5up.net/strata",
    blurb: "Single-page profile with a fixed sidebar and a project lightbox grid.",
    accent: "from-brand/70 to-brand/20",
    layout: "sidebar",
  },
  {
    id: "html5up-dimension",
    name: "Dimension",
    author: "HTML5 UP",
    license: "CC BY 3.0",
    source: "https://html5up.net/dimension",
    blurb: "Bold centred hero that expands into panels — strong for design work.",
    accent: "from-accent/70 to-accent/20",
    layout: "hero",
  },
  {
    id: "startbootstrap-resume",
    name: "Resume",
    author: "Start Bootstrap",
    license: "MIT",
    source: "https://startbootstrap.com/theme/resume",
    blurb: "Classic recruiter-friendly resume site: experience, education, skills.",
    accent: "from-brand/60 to-accent/40",
    layout: "timeline",
  },
  {
    id: "jekyll-minimal",
    name: "Minimal",
    author: "GitHub Pages",
    license: "CC0 1.0",
    source: "https://github.com/pages-themes/minimal",
    blurb: "The official GitHub Pages theme — fast, plain and very readable.",
    accent: "from-foreground/40 to-foreground/10",
    layout: "grid",
  },
];

export function templateById(id: string): PortfolioTemplate {
  return SITE_TEMPLATES.find((t) => t.id === id) ?? SITE_TEMPLATES[0];
}
