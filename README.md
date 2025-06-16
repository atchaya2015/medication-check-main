# MediCare App - 4-6 Hour Assessment

## Live Demo (UI only): https://meds-buddy-check.lovable.app/

## Current State of the codebase

This is a React medication management app with dual user roles (patients/caretakers). Currently features:

- Role-based dashboard system for each user account with runtime switching (for simplcity)

- UI for medication tracking with calendar visualization

- Mock data for streaks, adherence rates, and medication logs

- Photo upload interface for medication proof

- Notification settings UI (non-functional)

- All data is stored in local state (no persistence)


## Core Implementation Tasks

### Phase 1 (Required - 4 hours):
- Supabase authentication setup
- Basic CRUD for adding medications
- Basic CRUD for marking medication taken for the day
- Connect one dashboard to real data

### Phase 2 (Optional - 2 hours):
- Caretaker-patient real time updates
- Basic adherence tracking

### Phase 3 (Bonus):
- File uploads

**Provided:**
- UI components and styles

## Required Features:
1. User login/signup with Supabase Auth
2. Add medications (name, dosage, frequency)
3. View medication list
4. Mark medication as taken today
5. Simple adherence percentage display

## Technical Requirements:
- Use provided React + TypeScript template
- Integrate Supabase for auth and database
- Use React Query for data fetching
- Implement error handling
- Clean, readable code

## Other Requirements:
- Use Git with meaningful commits
- Implement proper form validation
- Handle loading and error states consistently
- Write at least 2-3 meaningful tests using vitest
- Include a README with setup instructions

## Technical Challenges:

**Include:**
- Optimistic updates using react query
- Proper TypeScript generics usage

## Deployment Bonus:
Deploy to Vercel/Netlify

## We will evaluate:
- Code organization and architecture decisions
- Error handling and edge cases
- TypeScript usage (proper typing, no `any`)
- Component composition and reusability
- State management approach
- Performance considerations (unnecessary re-renders)
- Security awareness (input sanitization)
