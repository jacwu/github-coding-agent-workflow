# Travel Website — Development Task Checklist

## Task 1: Initialize Project Scaffold and Global UI Style Configuration

Description: Set up the project foundation, including Next.js, TypeScript, and Tailwind CSS initialization. Integrate shadcn/ui and configure global style variables following the "Light & Airy Vacation Style": establish Ocean Teal as the sole primary color, paired with light backgrounds, large border radii (rounded-2xl/3xl), and soft shadows, providing a consistent natural, breathable aesthetic foundation for all subsequent frontend components.

## Task 2: Configure Database and ORM

Description: Integrate SQLite and Drizzle ORM, set up database connection configuration and migration workflow, ensuring the project has a stable data persistence layer.

## Task 3: Define Core Data Models

Description: Based on the design document, create the four core database tables — users, destinations, trips, and trip_stops — along with their relationships, providing a solid data structure foundation for authentication, destination browsing, and trip planning features.

## Task 4: Build Authentication Foundation

Description: Integrate NextAuth, implement email/password-based login capability, and create a user registration endpoint, establishing the prerequisites for protected pages and user-specific data access.

## Task 5: Implement Authentication Pages and Session State

Description: Complete the login page, registration page, and login state display in the navigation bar, enabling visitors to register, log in, log out, and perceive their current authentication status in the UI.

## Task 6: Prepare Destination Seed Data and Image Assets

Description: Organize initial destination data, implement a seed script that downloads destination images from the configured Unsplash/Pexels CDN URLs into `travel-website/public/images/destinations/`, and write the corresponding local filenames to the database. Run the script to download the destination images and save them to the specified local directory, ensuring the destination browsing experience is visually rich and performant with locally served images.

## Task 7: Implement Destination Query APIs

Description: Complete the destination list and detail endpoints with support for keyword search, category filtering, region filtering, price range, sorting, and pagination, providing comprehensive data capabilities for the frontend browsing experience.

## Task 8: Develop Destination List and Detail Pages (Light Visual Style)

Description: Complete the destination list page, search/filter interactions, and destination detail page. The UI layer should emphasize high-resolution imagery and whitespace, with cards showing a soft floating effect on hover. Enable visitors to browse content with an immersive experience, narrow down their choices, and view complete information for individual destinations.

## Task 9: Implement Trip Management APIs

Description: Complete trip CRUD operations (create, read, update, delete) as well as stop addition, reorder, and deletion endpoints, ensuring these capabilities are restricted to authenticated users only.

## Task 10: Develop Trip Pages and Editing Experience

Description: Complete the "My Trips" list page, trip detail page, and basic editing capabilities, allowing users to create their travel plans and adjust stop order and dates.

## Task 11: About Page

Description: The about page serves as the expression of the brand story and platform introduction.
