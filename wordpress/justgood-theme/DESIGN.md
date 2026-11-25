---
name: "Just Good Bright Edition"
description: "A bright, photo-led lifestyle magazine: white pages, graphite ink, one vermilion accent, bold grotesk headlines over a roomy reading serif."
colors:
  bg: "#FAFAF9"
  surface: "#FFFFFF"
  ink: "#16181D"
  muted: "#5B606A"
  line: "#E3E5E8"
  night: "#0F1115"
  night-2: "#1A1D23"
  night-muted: "#A7ACB5"
  placeholder: "#2A2E36"
  accent: "#E4572E"
  accent-strong: "#C2401B"
  accent-hover: "#A93515"
typography:
  heading:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontWeight: "800"
  body:
    fontFamily: "Source Serif 4, serif"
    fontWeight: "400"
  ui:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontWeight: "500"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "96px"
rounded:
  sm: "10px"
  md: "10px"
  pill: "999px"
components:
  buttons: "Pill, solid accent-strong with white text, or ink outline; no shadow"
  cards: "No boxed cards; stories are image plus type, separated by space or a hairline"
  images: "10px radius, object-fit cover, slow zoom on hover; cover images may bleed to the viewport edge"
  tags: "Column name as a small uppercase label in accent-strong, no pill background"
dials:
  variance: 0.65
  density: 0.45
  motion: 0.3
---

# Just Good Bright Edition

## Overview

Just Good is a lifestyle magazine with four columns: Travel, Health, Tech and Advice. Each story should be useful, and the site should feel like a glossy print magazine you can click. The one emotion the design serves is curiosity: every cover image and headline should make a reader want to open it. Photography carries the page; type gives it confidence; the accent marks where to go next.

## Colors

- `bg` #FAFAF9 is the page ground: a clean, near-white with no cream cast.
- `surface` #FFFFFF lifts the reading column and menus.
- `ink` #16181D is a graphite off-black for headlines and body text.
- `muted` #5B606A is for metadata, deks and captions (passes AA on bg).
- `line` #E3E5E8 is the hairline used sparingly between list items.
- `night` #0F1115 is the one dark band (Tech section and footer), giving the page a change of light.
- `accent` #E4572E (vermilion) is used for large marks: the logo dot, hover underlines, the reading progress bar.
- `accent-strong` #C2401B is the same hue darkened for text and buttons so white text passes AA.
- `accent-hover` #A93515 is the pressed and hover state of accent-strong buttons.
- `night-2` #1A1D23 separates rules and image wells inside the dark band and footer.
- `night-muted` #A7ACB5 is secondary text on night (passes AA).
- `placeholder` #2A2E36 is the base of the on-palette gradient shown when a story has no photo yet.

## Typography

- Headlines: Schibsted Grotesk, 700 to 800, line-height 1.02 to 1.12, slight negative tracking on large sizes. Emphasis inside a headline uses Schibsted Grotesk italic.
- Reading text: Source Serif 4 at 19px on desktop, line-height 1.65, measure about 66 characters.
- UI labels (nav, column labels, buttons): Schibsted Grotesk 500 to 700; uppercase labels get 0.08em tracking.
- Fonts are self-hosted woff2 with font-display swap.

## Layout

- One shared container: max 1320px with 24px side gutters on mobile and 40px on desktop.
- 12-column grid. The homepage uses a different layout family for each section: cover, latest rail, cinematic travel band, health split list, dark tech scroller, advice mosaic.
- The cover fits the first viewport at desktop: lead story at 8 columns, two stacked stories at 4.
- Every multi-column layout collapses to one column under 760px; horizontal scrollers stay horizontal with scroll snap.

## Elevation & Depth

- No drop-shadow cards. Depth comes from photography, scrims and the one dark band.
- Image scrims are directional gradients from night at 0.85 to transparent, only where text sits on a photo.

## Shapes

- Images: 10px radius everywhere. Buttons and the search field: full pill. Nothing else is rounded.

## Components

- Story teaser: image, column label, headline, optional dek, reading time. The whole teaser is one link.
- Column label: uppercase, 12px, 700, 0.08em tracking, accent-strong.
- Primary button: pill, accent-strong ground, white text.
- Reading progress bar on articles: 3px accent bar fixed at the top.

## Do's and Don'ts

### Do's
- Do lead every section with a real photograph.
- Do keep one accent hue on every page.
- Do keep body text at 66 characters wide or less.
- Do give each homepage section its own layout family.
- Do honor prefers-reduced-motion and let reveals default to visible.

### Don'ts
- Don't use em dashes in any copy.
- Don't place pills, tags or captions on top of photos.
- Don't use drop shadows to fake depth.
- Don't use Inter, purple, or a cream-and-terracotta palette.
- Don't build rows of three identical cards.
- Don't add decorative numbering like 01, 02, 03 to stories.
