---
name: Kinetic Luxury Marketplace
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd6f8'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1ff'
  surface-container: '#f1ebff'
  surface-container-high: '#ebe5ff'
  surface-container-highest: '#e6deff'
  on-surface: '#1c1831'
  on-surface-variant: '#494552'
  inverse-surface: '#312d48'
  inverse-on-surface: '#f4eeff'
  outline: '#7a7583'
  outline-variant: '#cac4d3'
  surface-tint: '#674cb1'
  primary: '#1e0056'
  on-primary: '#ffffff'
  primary-container: '#35127d'
  on-primary-container: '#9f84ed'
  inverse-primary: '#cfbdff'
  secondary: '#6f46b9'
  on-secondary: '#ffffff'
  secondary-container: '#b188ff'
  on-secondary-container: '#44118d'
  tertiary: '#360800'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a1400'
  on-tertiary-container: '#ff6131'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e8ddff'
  primary-fixed-dim: '#cfbdff'
  on-primary-fixed: '#21005d'
  on-primary-fixed-variant: '#4f3397'
  secondary-fixed: '#ebdcff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#260059'
  on-secondary-fixed-variant: '#572ba0'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb5a0'
  on-tertiary-fixed: '#3b0900'
  on-tertiary-fixed-variant: '#862200'
  background: '#fdf8ff'
  on-background: '#1c1831'
  surface-variant: '#e6deff'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  price-numeric:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system drives a video-first property discovery ecosystem. It merges the cinematic immersion of modern short-form video feeds with the authoritative trust and precision of premier luxury real estate. The target audience comprises modern home seekers, institutional developers, certified brokers, and real estate creators who demand friction-free media exploration alongside absolute transactional clarity.

The visual style is **Contemporary Tactile Modernism with Subtle Glass Influences**. It counters the clinical, text-dense nature of traditional property portals by prioritizing high-definition 9:16 vertical video viewports, crisp spatial information architecture, and micro-surfaces with razor-thin lavender-tinted borders. Interfaces should feel energetic yet grounded: fast-moving content discovery balanced by structured, confidence-inspiring transactional surfaces.

## Colors

The palette balances royal authority with punchy conversion signals:

- **Primary (`#35127D`) & Secondary (`#4C1D95`, `#6D28D9`)**: Anchor the brand in prestige, institutional trust, and digital-first sophistication. Used for primary navigation, high-level headers, active state fills, and high-impact property verification emblems.
- **Tertiary Accent (`#FF5722`)**: A saturated, high-energy warm accent dedicated exclusively to primary conversion actions: booking tours, submitting inquiries, video playback triggers, and real-time urgency cues.
- **Neutrals & Surfaces**:
  - Canvas Root: `#F8F7FC` with nested structural containers at `#F3F0FA`.
  - Cards & Floating Panels: `#FFFFFF` framed by calibrated `#EAE5F5` borders to eliminate harsh contrast while maintaining separation.
  - Typography: Midnight Navy (`#110D26`) for primary headers and data values, deep slate (`#1E1B4B`) for body copy, and neutral muted slate (`#6B7280`) for metadata labels and secondary notations.
- **Functional Semantics**:
  - Live / Verified: Emerald (`#10B981`)
  - Under Review / Pending: Amber (`#F59E0B`)
  - Sold / Needs Attention: Rose (`#EF4444`)

Over video canvases, utilize solid optical black scrims (`rgba(17, 13, 38, 0.72)`) and frosted translucent fills (`rgba(255, 255, 255, 0.16)`) to ensure property metrics remain legible across variable lighting.

## Typography

Plus Jakarta Sans governs the entire typographic stack, providing a contemporary, geometric balance with humanist curves that remain legible at microscopic property badge scales and authoritative at billboard scale.

- **Numerics & Valuation**: For property square footage, price values, and configuration tags (e.g., "3 BHK • 1,850 sq.ft"), apply `price-numeric` and `label-lg` with tabular figures enabled (`font-variant-numeric: tabular-nums`) to prevent optical jitter during dynamic filter adjustments.
- **Video Overlays**: Text layers applied over dynamic video previews must use `label-sm` or `title-md` set in pure white (`#FFFFFF`) backed by soft drop shadows or semi-opaque containers (`rgba(17, 13, 38, 0.45)`) to preserve legibility regardless of video brightness.
- **Hierarchy Enforcement**: Do not mix font families. Rely strictly on weight contrast (from `400` body to `800` hero metrics) and sizing tiers to denote hierarchy.

## Layout & Spacing

The layout is built around an **adaptive fluid grid with strict content constraint maximums** (1440px on desktop) to keep media consumption focused and immersive:

- **Mobile (< 768px)**: 4-column layout with `margin: 1rem` and `gutter: 1rem`. Full-bleed edge-to-edge media reels with floating overlay actions. Bottom navigation is persistent with a 64px vertical clearance zone.
- **Tablet (768px - 1024px)**: 8-column layout with `margin-md: 2rem` and `gutter-md: 1.5rem`. Reel preview cards organize into dual-column 9:16 responsive aspect grids.
- **Desktop (> 1024px)**: 12-column layout with `margin-lg: 3rem` and `gutter-lg: 2rem`. Video feeds transition into a responsive 3- or 4-column dynamic grid, with a split desktop detail view allocating 45% screen width to the vertical video reel feed and 55% to floor plans, neighborhood intelligence, and property specifications.

Spacing operates on a foundational 4px/8px scale. Component interiors enforce a strict compact rhythm (`space-sm` for tag clusters, `space-md` for card body padding) to maintain high data density alongside large media cards.

## Elevation & Depth

Visual depth is achieved through **ambient lavender-tinted light modeling** combined with **semi-transparent glass overlays**:

- **Ground Level (Canvas)**: Non-elevated surface set to `#F8F7FC`.
- **Card Tier (Level 1)**: Pure white `#FFFFFF` bounded by an intentional 1px hairline border in `#EAE5F5`, elevated via an ambient shadow: `0 4px 20px -2px rgba(53, 18, 125, 0.04), 0 2px 6px -1px rgba(17, 13, 38, 0.02)`.
- **Interactive Hover & Dropdowns (Level 2)**: Elevated to draw immediate tactile focus: `0 12px 32px -4px rgba(53, 18, 125, 0.08), 0 4px 12px -2px rgba(17, 13, 38, 0.03)`.
- **Floating Overlays & Sticky Bars (Level 3)**: Fixed bottom action ribbons and interactive media player controls use a frosted backdrop filter: `background: rgba(255, 255, 255, 0.88)`, `backdrop-filter: blur(16px)`, `border-top: 1px solid rgba(234, 229, 245, 0.8)`, and shadow `0 -4px 24px rgba(17, 13, 38, 0.06)`.
- **In-Video Pill Elevation**: Chips rendered directly on media viewports omit standard drop shadows, employing `background: rgba(17, 13, 38, 0.55)`, `backdrop-filter: blur(8px)`, and a 1px border of `rgba(255, 255, 255, 0.2)`.

## Shapes

The design system employs a **Rounded (Level 2)** geometry to balance modern mobile app ergonomics with structured institutional reliability:

- Standard controls, text fields, and basic buttons utilize `0.5rem` (8px) corner radii.
- Property cards, video containers, and modal sheets scale to `rounded-lg` (`1rem` / 16px) or `rounded-xl` (`1.5rem` / 24px) to preserve a soft frame around high-definition video feeds.
- Status chips, property spec tags (e.g., BHK, Sqft), and micro-action triggers (sound toggle, favorite button) use full pill shapes (`rounded-full` / `9999px`) to create distinction against rectilinear video viewports.

## Components

### Buttons
- **Primary Action (CTA)**: Background `#FF5722`, text `#FFFFFF`, typography `label-lg`. Sizing: 48px height for primary mobile touch targets; hover state shifts to `#F4511E` with subtle scale transform (`scale(1.01)`).
- **Secondary Action**: Background `#35127D`, text `#FFFFFF`, typography `label-lg`. For institutional flows like "Schedule Verification" or "List Property".
- **Ghost / Glass Video Overlay**: Transparent white fill (`rgba(255, 255, 255, 0.2)`), border `1px solid rgba(255, 255, 255, 0.4)`, text `#FFFFFF`, backdrop blur 12px.

### 9:16 Video Reel Preview Cards
- Form-factor locked to a 9:16 aspect ratio with a `1rem` corner radius, overflow hidden, and absolute bottom-anchored content gradient (`linear-gradient(180deg, transparent 40%, rgba(17, 13, 38, 0.95) 100%)`).
- Play state handles: Centered micro-frosted play glyph (`44px` circle) that fades upon autoplay.
- Card Footer Stack: Price headline (`price-numeric`), followed by a row of pill spec tags (`space-xs` gap), ending with location and verified broker badge.

### Specification Chips & Status Badges
- **Spec Tags (BHK, Area, Pricing/sqft)**: Pill-shaped (`rounded-full`), padding `0.25rem 0.625rem`, background `#F3F0FA`, text `#4C1D95`, typography `label-md`.
- **Status Indicators**: Pill badge with a pulsing 6px dot.
  - *Live*: Background `#ECFDF5`, text `#065F46`, dot `#10B981`.
  - *Pending*: Background `#FFFBEB`, text `#92400E`, dot `#F59E0B`.
  - *Rejected*: Background `#FEF2F2`, text `#991B1B`, dot `#EF4444`.

### Input Fields & Search Bars
- Background `#FFFFFF`, border `1px solid #EAE5F5`, typography `body-md`. Focus state shifts border color to `#35127D` with a subtle focus glow (`box-shadow: 0 0 0 3px rgba(53, 18, 125, 0.12)`).
- Video-first search bars include inline quick-filters for "Verified Reels Only", configuration selectors, and price range steppers.

### Sticky Bottom Action Bar (Mobile)
- Fixed container at viewport bottom, height 72px, background `rgba(255, 255, 255, 0.92)` with `backdrop-filter: blur(12px)`.
- Dual configuration: Left slot features primary price + EMI breakdown; right slot features an immediate `#FF5722` "Book Site Visit" CTA button.

### Media Upload & Ingestion Dropzones
- Dashed 2px border in `#6D28D9` at 30% opacity, background `#F8F7FC`. Centers an explicit 9:16 portrait boundary guide with instant file validation tags showing maximum resolution, frame rate, and supported formats.