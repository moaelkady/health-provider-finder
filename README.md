# Health Network Finder

Build a production-quality web application for an Egyptian health insurance provider directory.

This is the initial UI/product implementation only.

The real provider dataset will be integrated later by another developer using Cursor, so for now create the complete application experience using a small amount of clearly structured mock data that can easily be replaced with the real dataset.

Product concept

The application allows an insurance customer to discover healthcare providers in the insurer's network.

Providers can include:

Dental centers

Hospitals

Clinics

Medical centers

Laboratories

Pharmacies

Imaging/radiology centers

Other healthcare providers

The application should feel like a real insurance healthcare directory, not a generic admin dashboard.

The primary experience is:

Search → Filter → Browse providers → View provider details → Find/contact provider

Design direction

Create a modern, polished healthcare/insurance interface.

Visual characteristics:

Clean

Professional

Trustworthy

Spacious

Premium but not flashy

Excellent typography

Strong information hierarchy

Subtle borders and shadows

Rounded cards

Clear status indicators

Responsive

Desktop-first but fully responsive on tablet/mobile

Avoid:

Generic SaaS dashboard aesthetics

Excessive gradients

Excessive animations

Huge hero sections

Marketing-heavy landing-page patterns

Fake statistics that don't belong to a provider directory

Overly colorful UI

The application should look like something an established insurance company could actually ship.

Main application layout

Create a persistent application shell.

Desktop:

Left sidebar/navigation

Main content area

Top header

Mobile:

Responsive header

Collapsible/mobile navigation

Content adapts naturally

Navigation should include:

Provider Directory

Favorites

My Searches

Help

Keep the Provider Directory as the primary active section.

You may include a subtle user/profile area in the header.

Provider Directory page

This is the primary page.

Header:

Healthcare Provider Directory

Subtitle:

"Find hospitals, clinics, dental centers, pharmacies, laboratories, and other healthcare providers in your network."

Then create a prominent search experience.

Search input:

"Search by provider name, specialty, area, or address"

Include a search icon.

Search and filters

Create a sophisticated but simple filtering interface.

Desktop:

Place filters in a horizontal filter bar or a compact sidebar depending on what produces the best UX.

Mobile:

Filters should open inside a modal/drawer.

Potential filters:

Provider type

Hospital

Clinic

Dental Center

Laboratory

Pharmacy

Medical Center

Imaging Center

Specialty

Examples:

General Medicine

Dentistry

Cardiology

Dermatology

Pediatrics

Ophthalmology

Orthopedics

Location

Governorate

Area / City

Network

Examples:

In Network

Preferred Network

Services

Examples:

Outpatient

Emergency

Laboratory

Radiology

Dental

Only use these as UI concepts for the mock application. The later integration will determine which fields actually exist in the real dataset.

Include:

Clear filters

and display active filter chips when filters are selected.

Results section

Show a result count:

"1,248 providers"

Then allow sorting:

Relevance

Name

Distance

Provider type

Create a clean provider card.

Each provider card should contain:

Provider name

Provider type

Specialty

Area

Governorate

Network status

Available services

Address

Phone number

Favorite button

"View details" action

"Find on map" action

Example mock provider:

"First Dental Egyptian Center"

Provider type:

"Dental Center"

Specialty:

"Dentistry"

Location:

"El Shorouk, Cairo"

Address:

"City Baza Mall - next to the British University"

Status:

"Live"

Network:

"In Network"

Phone:

"011 1300 2245"

Use realistic Egyptian provider names and locations for the mock data.

Do not create hundreds of fake records. Around 10–20 realistic mock records are enough to demonstrate the UI.

Provider detail page

When the user opens a provider, create a dedicated detail page.

Header section:

Provider name

Provider type

Network/status badges

Favorite button

Then organize information into clear sections.

Overview

Show:

Provider type

Specialty

Network

Status

Available services

Location

Show:

Address

Area

Governorate

Create a map/location card.

For the initial mock application, this can be a visual map placeholder.

Include:

Open in Google Maps

button.

The implementation should make this button easy to replace later when real location data is integrated.

Contact

Show:

Phone

Email when available

Use appropriate click actions for phone/email.

Services

Display available services as tags/cards.

Specialties

Display specialties clearly.

Google Maps behavior

Design the UI so that locations can later support two behaviors:

Exact location

If a provider has an exact latitude/longitude:

"Open in Google Maps"

can open the coordinate directly.

Approximate or unresolved location

If the location is approximate or unresolved:

"Find on Google Maps"

should perform a Google Maps text search using provider information such as:

Provider name

Address

Area

Governorate

Do NOT design the UI around assuming every provider has an exact coordinate.

The backend/data integration will determine the actual location status later.

Favorites

Implement the basic favorites interaction.

Users should be able to click the heart icon on a provider.

Show a Favorites page containing saved providers.

Persistence can be simple/local for this initial implementation.

Make the architecture easy to replace later with backend persistence.

Empty states

Create polished empty states for:

No search results

"Couldn't find any providers matching your search."

Include:

"Clear filters"

No favorites

"You haven't saved any providers yet."

Include a CTA back to the directory.

Loading states

Create proper loading/skeleton states for:

Provider cards

Provider details

Search results

Do not rely only on a generic spinner.

Error states

Create a professional error state for when provider data cannot be loaded.

Example:

"Something went wrong"

"Unable to load healthcare providers. Please try again."

Include:

"Retry"

Responsive behavior

The application must work properly on:

Desktop

Tablet

Mobile

On mobile:

Filters become a drawer/modal

Provider cards stack naturally

Provider details become single-column

Actions remain easily accessible

Search remains prominent

Mock data architecture

Create the mock provider data separately from the UI.

Do NOT scatter mock providers throughout components.

Use a clear data structure such as:

src/data/providers.ts

or an equivalent clean structure.

The future developer should be able to replace:

mockProviders

with the real generated dataset without rewriting the UI.

Create TypeScript types/interfaces for:

Provider

Organization

Location

Specialty

Service

Network/status

Keep these types reasonably close to the domain but don't over-engineer them.

Important future integration requirement

The next development phase will integrate a real generated dataset containing thousands of healthcare provider locations and organizations.

Therefore:

Don't hardcode assumptions that only work with 10 providers.

Build the list to handle thousands of records.

Keep search/filter logic data-driven.

Keep provider cards reusable.

Keep provider details driven by data.

Don't make the mock data structure radically different from a realistic production dataset.

Don't embed provider-specific logic directly into UI components.

The real dataset will replace the mock data later.

Technical requirements

Use a modern React-based implementation.

Use TypeScript.

Keep components modular and understandable.

Use client-side routing for:

/providers

/providers/:id

/favorites

/searches

/help

If the existing environment has an established routing/styling structure, use it consistently.

Create reusable components where appropriate:

ProviderCard

ProviderList

SearchBar

FilterPanel

FilterChips

ProviderStatusBadge

ProviderDetail

LocationCard

ServiceTags

SpecialtyTags

EmptyState

ErrorState

LoadingSkeleton

Do not create a giant monolithic page component.

Important

This is Phase 1 only.

Do not attempt to connect to an external backend.

Do not attempt to import the real insurance dataset.

Do not invent an API.

Do not build an admin dashboard.

Do not build authentication unless the existing scaffold requires a minimal shell for it.

Focus on making the provider discovery experience complete and production-quality.

The next developer will take this application and integrate the actual generated data from the project's data/generated directory.

Make the application easy for that developer to understand and extend.

Final goal

When finished, I should be able to run the application and experience a convincing insurance healthcare provider directory:

Provider Directory → Search → Filter → Results → Provider Details → Location → Contact/Favorite

Use realistic Egyptian healthcare data for the temporary mock dataset, but make it obvious through the code structure that this is replaceable mock data.

Start building the application now.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd health-network-finder-main
npm i
npm run dev
```

For phone testing over LAN (HTTPS + geolocation):

```sh
npm run dev:phone
```

Production build (includes service worker generation):

```sh
npm run build
```

### PWA / offline

The app is installable as a Progressive Web App.

- Open the site **once while online** so the service worker can precache JS/CSS, icons, fonts, and the provider JSON (~8 MB).
- After that, search, filters, favorites, and provider details work offline.
- Maps, WhatsApp/call, geolocation, and SOS still need device capabilities / network.
- When offline, a banner shows: "أنت غير متصل — يتم عرض البيانات المحفوظة".
- Custom teal healthcare icons live under `public/icons/` (favicon + install icons).
- Manifest: `public/manifest.webmanifest`. Service worker is generated after `vite build` by `scripts/generate-sw.mjs` into `.output/public/sw.js` (required because TanStack Start’s SSR build is incompatible with `vite-plugin-pwa` SW hooks).
- Performance: `npm run build` first generates slim `providers.min.json`, then Vite, then the SW. Cold prepare runs in a Web Worker; repeat visits hydrate from IndexedDB when the data hash matches.
