
# PolicyPulse — Landing Page Implementation Plan

## Brand Setup
- Update CSS variables to use navy blue (#1B365D) as primary, teal (#2AA198) as secondary
- Add Inter font from Google Fonts
- Configure custom color tokens in Tailwind config

## Page Structure

### Sticky Navigation
- Logo ("PolicyPulse" with shield icon), nav links (Features, How It Works, Pricing), and Sign Up / Log In buttons
- Transparent on top, solid navy on scroll

### Hero Section
- Navy-to-dark-blue gradient background
- Bold headline + subheadline with white text
- Two CTA buttons: "Start Free 14-Day Trial" (teal) and "See a Sample Brief" (outlined)
- Abstract shield/dashboard illustration using Lucide icons

### Pain Points Section
- 3-column card grid with icons (AlertTriangle, FileSearch, DollarSign)
- Each card: icon, title, descriptive stat
- Light background for contrast

### How It Works Section
- 4 numbered steps in horizontal layout (stacks on mobile)
- Connected by a subtle line/arrow
- Icons: Radar, Brain, Bell, ShieldCheck

### Pricing Section
- 3-tier cards: Basic ($49), Professional ($99 — highlighted), Enterprise ($199)
- Feature lists with checkmarks
- "Start Free Trial" button on each
- "No credit card required" note below

### Sample Brief Modal
- Dialog triggered by CTA
- Realistic Apple App Store policy change brief
- Severity badge, structured sections (What Changed, Who Is Affected, Required Actions, Deadline, Business Impact)

### Footer
- Company info, legal links, tagline

## Animations
- Fade-in on scroll for each section
- Smooth scroll navigation
- Hover effects on cards and buttons

## Routing
- Landing page at `/`
- `/signup` and `/login` as placeholder pages
