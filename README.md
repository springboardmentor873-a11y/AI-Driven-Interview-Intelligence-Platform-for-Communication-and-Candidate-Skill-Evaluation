# SmartHire AI

SmartHire AI is an interview-intelligence and candidate-assessment platform concept. It is intended to help candidates practice interviews and help recruiters review candidate assessments.

## Project status

This repository currently contains a partial React interface scaffold. Candidate, recruiter, and admin dashboard screens and authentication screens are present, but several interview and assessment features are marked as coming soon.

The current checkout is not yet a complete runnable application: the Vite entry point (`src/main.jsx`), application component (`src/App.jsx`), and authentication context imported by the screens are not present. Restore or add those modules before expecting the development server or production build to work.

## Technology

- React
- Vite
- React Router
- Tailwind CSS
- Firebase SDK (dependency included; application initialization is not present in this checkout)
- Lucide React icons

## Getting started

Install dependencies:

```bash
npm install
```

Once the missing application entry point and required modules have been added, start the Vite development server:

```bash
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

## Available screens

- **Authentication:** registration, login, and password reset interfaces
- **Candidate dashboard:** profile information and entry points for resume uploads, mock interviews, interview history, and performance analytics
- **Recruiter dashboard:** profile information and entry points for candidate analytics, interview management, assessment templates, and hiring insights
- **Admin dashboard:** administrative interface scaffold

The interview, resume, analytics, and recruitment-management features shown as “Coming Soon” are UI placeholders, not functioning workflows.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview a production build locally |
| `npm run restore:ui` | Run the repository's UI restore script |

## Repository layout

```text
src/
  components/common/   Shared interface components
  layout/              Authentication and dashboard layouts
  pages/               Authentication and role-specific dashboard screens
scripts/               UI maintenance and verification scripts
```

## Contributing

When contributing, keep role-specific experiences and shared interface components consistent. Clearly distinguish working functionality from placeholder screens in documentation and in the UI.
