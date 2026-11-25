---
name: "Just Good Bright Edition"
description: "A bright, photo-led lifestyle magazine where each column is its own color world: teal Travel, mint Health, navy Tech, sunflower Advice, with vermilion as the brand mark."
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
  travel: "#0B5F63"
  travel-mark: "#7FD8CF"
  travel-strong: "#0E7C80"
  travel-soft: "#E4F2F1"
  travel-muted: "#CFE6E4"
  health: "#D5EEDA"
  health-ink: "#0F3520"
  health-mark: "#1E7A46"
  health-glow: "#8EE0A6"
  health-strong: "#2E9B5A"
  health-soft: "#EAF6EC"
  health-muted: "#3C5A46"
  tech: "#0D1530"
  tech-mark: "#5B8CFF"
  tech-strong: "#2456D6"
  tech-soft: "#E9EEFC"
  tech-muted: "#AEB8D6"
  advice: "#FFD23F"
  advice-ink: "#1B1A14"
  advice-text: "#8A5A00"
  advice-strong: "#E8B400"
  advice-soft: "#FFF5D1"
  advice-muted: "#4F4517"
  brand-soft: "#FBEDE8"
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
  lg: "28px"
  room: "36px"
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

### Four Worlds (column colors)

Each column owns a color world so readers always know where they are. The world sets the room ground on the homepage, the column page header, the tint behind an article header, the label and dash on every teaser, the nav dot, the reading progress bar and the drop cap.

- Travel: deep teal room `#0B5F63` with white text; marks `#7FD8CF`.
- Health: fresh mint room `#D5EEDA` with deep green text `#0F3520`; marks `#1E7A46`.
- Tech: electric navy room `#0D1530` with white text; marks `#5B8CFF`.
- Advice: sunflower room `#FFD23F` with near-black text `#1B1A14`; text on white uses `#8A5A00`.
- Vermilion stays the Just Good brand mark: the logo dot and buttons outside a room.
- Rooms alternate dark and light (teal, mint, navy, sunflower) and stack with 36px top corners overlapping the room above.

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

- Images: 10px radius. Section tiles: 28px. Rooms: 36px top corners. Section-tile photos: arch (full round top, 14px bottom). Buttons and the search field: full pill.

## Components

- Story teaser: image, column label, headline, optional dek, reading time. The whole teaser is one link.
- Column label: uppercase, 12px, 700, 0.08em tracking, accent-strong.
- Primary button: pill, accent-strong ground, white text.
- Reading progress bar on articles: 3px accent bar fixed at the top.

## Do's and Don'ts

### Do's
- Do lead every section with a real photograph.
- Do keep vermilion as the only brand accent; column colors only mark their own column.
- Do keep body text at 66 characters wide or less.
- Do give each homepage section its own layout family.
- Do honor prefers-reduced-motion and let reveals default to visible.
- Do color-code every column touchpoint with that column's world color, and keep the tagline words highlighted in their world colors.
- Do open each column room with its giant name word; the lead photo may rise over the lower part of the word.

### Don'ts
- Don't use em dashes in any copy.
- Don't place pills, tags or captions on top of photos.
- Don't use drop shadows to fake depth.
- Don't use Inter, purple, or a cream-and-terracotta palette.
- Don't build rows of three identical cards.
- Don't add decorative numbering like 01, 02, 03 to stories.
