# Elzatona — Full Authentication, Student Onboarding, Admin Dashboard & Landing Page

You are a senior full-stack engineer, UI/UX designer, and product architect working on **Elzatona (الزتونة)**, a student-powered university resource-sharing platform for Egyptian university students.

Your task is to transform the existing application into a polished, production-ready platform with secure authentication, personalized student onboarding, a powerful admin control dashboard, and an exceptional landing page.

**Important:** First inspect the existing project, understand its architecture, database, components, existing brand identity, and implemented functionality. Build on what already exists. Do not unnecessarily rewrite working features or introduce duplicate systems.

The project uses Next.js, TypeScript, and Supabase. Follow the existing conventions and use Supabase for authentication, database functionality, and authorization.

## 1. Authentication System

Build a complete, secure, user-friendly authentication experience.

### Login page
The primary authentication method should be **email and password**.

- Email field
- Password field with show/hide toggle
- Forgot password functionality
- Clearly visible primary "Log In" button
- Google authentication as a secondary option, displayed as a recognizable Google icon button rather than a large Google-branded button
- A link to create an account

The design must be clean, modern, responsive, and consistent with Elzatona's brand.

### Sign-up page
Collect the following information:

1. Full name
2. Username (unique across the platform)
3. Email address
4. Password
5. Confirm password

Use real-time form validation, meaningful error messages, password-strength guidance, and proper loading states.

The username will become the student's unique identity on the platform, so validate its availability.

Allow Google sign-up as a secondary option using the Google icon. Google OAuth must create a proper user record and direct new users through the same onboarding flow.

Implement all authentication functionality using Supabase Auth, including password reset, email verification where configured, session persistence, secure redirects, and logout.

Never store passwords in plain text or implement insecure custom authentication.

## 2. Mandatory Student Onboarding

**This is one of the most critical features of the entire platform.**

After creating an account, every student must complete a personalized onboarding flow before accessing the main platform.

### Step 1 — Choose University

Initially, offer only:

- Capital University
- BeniSweif University

Display these universities as attractive, interactive selection cards.

The selected university must be saved in the user's profile and associated with its database ID, not merely its display name.

### Step 2 — Choose Faculty

After choosing a university, the user must select their faculty.

- Initially populate both universities with a shared, configurable list of common faculties for the MVP.
- Faculty options must be dynamically retrieved according to the selected university.
- Design the database so each university can have different faculties in the future.
- Do not hardcode university/faculty relationships inside UI components.
- Use proper foreign-key relationships.

### Step 3 — Choose Academic Year

After selecting their faculty, ask:

**"إنت في سنة كام؟"**

Display attractive selection options, such as:

- First Year
- Second Year
- Third Year
- Fourth Year

The system must support fifth, sixth, or other academic years for faculties that require them. Only display the years valid for the selected faculty.

### Step 4 — Complete Onboarding

Display a short, polished completion state and redirect the student to their personalized dashboard.

Save their university, faculty, and academic year in Supabase.

### Critical Course Matching Logic

The whole platform should be structured around:

**University → Faculty → Academic Year → Courses → Resources**

A student's default course list must correspond to their selected university, faculty, and academic year.

For example:

A Capital University student in the Engineering faculty, Year 2, must see the courses assigned to that academic context, not unrelated courses from other universities or years.

Implement this relationship at the database and application-query level, not just through front-end filtering.

Course records must be correctly associated with their university, faculty, and year, with room for semester/term information.

If no courses exist for a selected academic context, display a thoughtful empty state rather than showing unrelated courses or fake data.

Returning users who completed onboarding should go straight to their dashboard. Users with incomplete onboarding must resume where they left off.

Also provide a profile/settings page so students can update their academic information later.

## 3. Powerful Admin Control Dashboard

Build a complete internal administration system for managing Elzatona.

**The admin dashboard must be completely separate from the regular student experience.**

### Admin Authentication

- Create a dedicated `/admin/login` route.
- Admin login must use username and password.
- The login page must not appear in the regular student navigation, landing page, or student authentication flow.
- Use secure Supabase-backed authentication internally, even though the admin signs in using a username rather than an email address.
- Implement server-side authorization and role-based access control.
- Only users with verified admin privileges may access admin routes and data.
- Never rely solely on hiding UI elements or checking admin status in client-side code.
- Never hardcode admin credentials in the frontend.

Provide a secure, documented way to provision the initial administrator through a protected server-side setup or script. Never embed a default admin password in source control.

### Admin Dashboard Overview

Design a professional SaaS-style dashboard with sidebar navigation, clear typography, meaningful metrics, interactive charts, and responsive layouts.

The main overview should show real data, including:

- Total registered students
- New registrations over time
- Daily and monthly active users
- Traffic/page views
- User growth trends
- Students grouped by university
- Students grouped by faculty and academic year
- Total courses
- Total uploaded resources
- Recent platform activity

Use actual tracked data from the platform. Implement privacy-conscious analytics/event tracking if the infrastructure does not yet exist.

Do not display fabricated metrics as if they were real.

### University Management

Administrators must be able to:

- Create universities
- Edit university names and details
- Enable or disable universities
- View all faculties belonging to a university
- See how many students belong to each university

New universities should automatically become selectable during student onboarding when enabled.

### Faculty Management

Administrators must be able to:

- Create faculties
- Associate faculties with specific universities
- Edit faculty information
- Configure available academic years
- Enable or disable faculties
- View student enrollment counts

A faculty may exist under multiple universities, but the relationships must be modeled correctly.

### User Management

Create a searchable, filterable user management interface.

Each student record should include:

- Full name
- Username
- Email
- University
- Faculty
- Academic year
- Registration date
- Account status

Admins should be able to inspect a student's profile, filter by university/faculty/year, and suspend or reactivate accounts where appropriate.

Implement secure pagination and confirmation dialogs for sensitive operations.

### Course and Resource Management

Include admin tools for:

- Creating and editing courses
- Assigning courses to the correct university, faculty, and year
- Managing semesters when applicable
- Viewing uploaded resources
- Moderating or removing inappropriate resources
- Tracking content activity

This is important because academic structure and course matching are central to Elzatona.

### Security and Administration

- Enforce permissions using Supabase Row Level Security and server-side checks.
- Students must never access admin-only data or actions.
- Protect sensitive admin operations.
- Record important administrative actions in an audit log.
- Avoid exposing service-role credentials or other secrets to the client.

The admin dashboard should feel like a complete, cohesive control center, not a collection of disconnected pages.

## 4. Exceptional Landing Page

Create a **professional, visually memorable, conversion-focused landing page** for Elzatona.

The landing page should look like a real, ambitious Egyptian student startup, not a generic AI-generated SaaS template.

### Brand Identity

Elzatona is an Egyptian university student platform that solves a familiar problem:

Students waste time searching through WhatsApp groups, Telegram channels, random Google Drive folders, and scattered links just to find useful study resources.

Elzatona brings those resources together, organized by university, faculty, year, and course.

Students can discover resources, share useful materials, evaluate sources, and help their classmates find the best content.

**Core message:**

"كل ماتريالزك في مكان واحد."

The tone should be youthful, Egyptian, friendly, smart, and slightly playful without becoming unprofessional.

Use Egyptian Arabic as the primary interface language, with correct RTL layouts. Technical terms may remain in English where naturally appropriate for Egyptian students.

### Visual Direction

Follow the existing Elzatona logo, color palette, and brand identity. Improve their application across the UI rather than introducing an unrelated visual system.

I want:

- Premium, modern visual design
- Distinctive typography, especially for Arabic
- Creative layouts and thoughtful spacing
- Carefully designed visual hierarchy
- Custom icons and illustrations where appropriate
- Tasteful gradients and accent colors
- Microinteractions and polished hover states
- Beautiful mobile responsiveness
- Consistency throughout every page

Avoid generic dashboard templates, cliché SaaS designs, excessive cards, stock-photo hero sections, and overwhelming color combinations.

### Landing Page Sections

**Hero section**

Create a visually striking hero section with a short, memorable headline that immediately explains Elzatona.

Include a strong primary CTA, such as:

"ابدأ مع الزتونة"

Add a secondary CTA to explore how the platform works.

Incorporate a visually compelling product preview or a creative representation of resources being organized from scattered material into one structured platform.

**The problem**

Illustrate how frustrating it is to search across dozens of messages and groups for a single lecture or PDF.

Make the problem relatable to Egyptian university students.

**The solution**

Demonstrate how Elzatona organizes everything by:

University → Faculty → Year → Course

Show a realistic, high-quality preview of this experience.

**How it works**

Communicate three simple steps:

1. اختار جامعتك وكليتك
2. وصّل لماتريالز موادك
3. شارك اللي فادك مع زمايلك

**Community value**

Explain how students help other students through sharing, rating, and recommending the resources they find useful.

**Final CTA**

Finish with a memorable, motivating call to action encouraging students to join.

**Footer**

Include essential navigation, brand information, and appropriate supporting links.

### Animation and Interaction

I want the site to feel alive and impressive without sacrificing performance.

Implement thoughtful animations such as:

- Animated hero entrance
- Scroll-triggered reveals
- Staggered text and card entrances
- Fluid hover effects
- Smooth transitions between sections
- Interactive product previews
- Tasteful background motion or floating elements
- Animated step transitions during onboarding
- High-quality loading and success states

Use Motion/Framer Motion when appropriate and compatible with the project.

Animations should feel refined, intentional, smooth, and premium rather than distracting.

Respect `prefers-reduced-motion`, avoid layout shifts, and keep performance excellent on mobile devices.

## 5. Database Architecture

Review and extend the existing Supabase schema as needed.

Ensure the architecture properly supports:

- User profiles and account roles
- Universities
- Faculties
- University–faculty relationships
- Academic years
- Student academic profiles
- Courses and semesters
- Course resources
- Analytics events
- Administrative audit logs

Use normalized, maintainable tables with proper foreign keys, constraints, uniqueness rules, and indexes.

Provide versioned database migrations and seed scripts.

Initially seed the two universities, their available faculties, and academic-year configurations.

Do not overwrite existing user data or destructively replace working tables.

All academic selections should be database-driven so an administrator can expand the platform without changing application code.

## 6. UX Requirements

Every experience should be:

- Mobile-first and fully responsive
- Arabic-first and RTL-correct
- Accessible and keyboard navigable
- Visually consistent with the brand
- Fast and intuitive
- Equipped with proper loading, empty, success, and error states
- Free from broken links, dead buttons, and nonfunctional demo interactions

Authentication and onboarding should feel like one seamless user journey.

Student-facing pages should remain simpler and friendlier than the more information-dense admin dashboard.

## 7. Implementation Instructions

Before coding, inspect the current codebase and identify what exists and what needs improvement.

Then:

1. Establish the necessary Supabase schema, migrations, authorization policies, and seed data.
2. Implement and test student authentication.
3. Implement the complete university/faculty/year onboarding flow.
4. Ensure dashboard and course queries use the student's actual academic profile.
5. Implement secure admin authentication and initial admin provisioning.
6. Build the complete admin dashboard with functional CRUD operations and real analytics.
7. Redesign and implement the landing page.
8. Polish responsiveness, animations, performance, and accessibility.
9. Verify all workflows end to end.

Use reusable, well-structured components, strong TypeScript types, and established project conventions.

Create or update `.env.example` with required environment variable names, but never expose real secret values.

If external setup is required, such as Google OAuth credentials or Supabase redirect URLs, implement everything possible in code and document the exact configuration steps.

Do not replace working functionality with placeholders. If a feature genuinely cannot be completed because of missing external credentials or services, clearly document that limitation.

## 8. Definition of Done

The implementation is complete only when:

- A student can sign up with their name, username, email, and password.
- The student can log in with email and password.
- Google authentication works once configured, using a compact Google icon button.
- New students complete university → faculty → year onboarding.
- Academic selections persist correctly across sessions.
- Students see courses associated with their actual university, faculty, and year.
- Admins can log in through a separate username/password experience.
- Normal students cannot access admin routes or APIs.
- Admins can manage universities, faculties, students, courses, and resources.
- Newly added universities and faculties become available in onboarding without hardcoded UI changes.
- Analytics reflect real platform activity.
- The landing page is responsive, visually impressive, animated, and clearly communicates Elzatona's value.
- There are no critical authentication, authorization, or database errors.
- TypeScript checks, linting, and the production build pass.

## Final Expectations

Do not merely provide recommendations, pseudocode, mockups, or visual prototypes. **Implement the actual working functionality in the existing repository.**

Make sensible engineering decisions, preserve the existing product vision, and prioritize secure and maintainable functionality alongside exceptional design.

At completion, provide a concise summary of what was implemented, database migrations, routes created, environment setup, how to provision the initial admin, tests performed, and anything requiring manual configuration.

**The ultimate goal is to make Elzatona feel like a polished, trustworthy, student-focused product that is genuinely ready for university students to use—not a basic university project or generic website template.**