# Product Requirements Document (PRD)

LLM-based Workflow Mapping and Automation Suggestion Tool – Product Requirements Document
Overview
This document defines the requirements and implementation plan for a workflow mapping and automation suggestion tool powered by a Large Language Model (LLM). The goal of this product is to let users visually map out their workflows (business processes, sequences of tasks) and get AI-generated suggestions on how to automate or optimize those workflows. The system will be implemented with a Next.js (React) frontend and a serverless backend, using OpenAI GPT-4.1 exclusively for all LLM-driven functionality. All data will be stored in a Supabase PostgreSQL database, and users will authenticate via Supabase's email-based login with organization grouping. The following requirements are fully prescriptive, detailing exact technologies, versions, and steps to build the product without ambiguity.
System Architecture and Tech Stack
Frontend: The frontend will be built with Next.js (React framework) – specifically Next.js 14.x (with React 18) – and written in TypeScript. It will be deployed on Vercel for hosting. Next.js was chosen for its seamless integration of frontend and backend (API routes), and Vercel provides first-class support for Next.js deployments. The UI will primarily consist of a conversational workflow discovery interface, workflow visualization using React Flow, and pages for viewing automation suggestions and implementation guidance. All components are implemented in React. Backend: The backend will use Next.js serverless API routes (Node.js 18+ runtime on Vercel) to handle all server-side logic. This includes endpoints for generating automation suggestions with the OpenAI API and any database operations that should not be done directly from the client. These API routes run as lightweight serverless functions on Vercel, scaling automatically and requiring no separate server infrastructure. We will not use any alternative cloud functions or external backend platforms – all backend logic resides in Next.js API routes on Vercel for simplicity and consistency. Database: Supabase will serve as the database and authentication provider. Supabase provides a hosted PostgreSQL database. We will use it to store user data, organization info, and saved workflows. Supabase's built-in Auth will manage user accounts with email/password or magic link authentication. The choice of Supabase gives us an immediately accessible Postgres database with RESTful and real-time APIs, plus convenient client libraries. It also simplifies authentication and row-level security. All database reads/writes in the app will ultimately go through Supabase (either via its client SDK from the frontend or via the backend). Authentication and Authorization: User login will be handled by Supabase Auth with email-based signup and login. We will implement an organization-based login grouping: each user belongs to an organization (typically determined by email domain or invite), and users can only access data (workflows) within their org. Supabase supports adding custom claims or using a join table to enforce this. Only authenticated users can use the app beyond the login page; unauthenticated requests will be redirected to log in. We will enforce authorization at the database level as well (using Postgres Row-Level Security policies) to ensure users can only query or modify data for their own organization. LLM Integration: All AI functionalities will use OpenAI's GPT-4.1 model exclusively via the official OpenAI API. No other models or AI platforms will be used – the product will not integrate Anthropic Claude, Google Gemini, or any alternatives. Every automation suggestion or AI-generated output in the system comes from GPT-4.1. This decision standardizes the AI responses and quality. The system will employ pre-defined system prompts to guide GPT-4.1's behavior. These prompts are critical to ensure the AI's outputs are relevant and formatted correctly for our use case. They are implemented in the src/lib/prompts.ts file and will be passed to the OpenAI API exactly as implemented, with no modifications. The OpenAI API key will be kept secret on the backend. Workflow Diagramming: The app will use React Flow (a React library for node-based diagrams) version 11.x to implement the workflow mapping UI. React Flow allows us to create an interactive canvas where users can drag-and-drop nodes, connect them with edges (arrows), and thereby model their workflow visually. This library was chosen for its stability and rich feature set for building custom node editors. Using React Flow ensures we don't have to build a diagramming tool from scratch – we will leverage its components for the canvas, nodes, connectors, mini-map, zoom controls, etc., customizing as needed for our workflow context. Other Libraries & Tools: We will use the official openai npm package (version 4.x) for calling the OpenAI GPT-4.1 API from our backend. For database access and auth, we will use Supabase's JavaScript/TypeScript client library @supabase/supabase-js (version 2.x). All project configuration secrets (API keys, DB credentials) will be managed via environment variables in a .env file (for local development) and set in Vercel for production. This ensures no secrets are hard-coded. The project will be developed using TypeScript to improve reliability and maintainability, given a senior engineer audience and the need for clarity. All code (both frontend and backend) will be written in TypeScript (.ts/.tsx files) and we will enforce strict typing for critical functions (e.g., defining types for workflow data structures, response formats, etc.).
Feature Requirements and Implementation Details
1. Workflow Diagram Editor (Frontend – React Flow)
Description: Users will create workflows through a conversational interface with AI-guided workflow discovery. Each step in the workflow is mapped out through natural language conversation, and a visual diagram is automatically generated to represent the workflow. This diagram is displayed in a view-only React Flow component, allowing users to visualize their workflow.

Implementation: We integrate a conversational UI with React Flow visualization in a Next.js page. The workflow discovery process happens through a chat interface where the AI guides the user to describe their workflow steps, people involved, systems used, and pain points:

Conversational Discovery: Instead of manually creating nodes and connections, users engage in a natural conversation with the AI system. The AI asks relevant questions to extract workflow information and builds a structured representation of the workflow from the conversation.

AI-Generated Diagram: Once sufficient information is gathered, the system automatically generates a visual workflow diagram using React Flow. Each step becomes a node in the diagram, and the connections between steps are represented as edges.

View-Only Diagram: The React Flow diagram is rendered as a view-only component. Users can zoom, pan, and explore the diagram but cannot directly edit it. Changes to the workflow must be made through the conversation interface.

Workflow Storage: The system stores both the structured workflow data and the diagram representation in the database, allowing users to return to their workflows later. The conversational history is also saved for context.

UI Layout: The application includes dedicated pages for workflow discovery, viewing opportunities, and implementation guidance. The discovery page features a chat interface alongside the generated diagram (when available). Navigation elements allow users to move between these different views.

React Flow Integration: We use the reactflow package (version 11.x) to render the diagram. We include `<ReactFlow>`, `<Background />`, `<Controls />`, and `<MiniMap />` components for visualization and navigation. The component is wrapped in a `<ReactFlowProvider>` for proper context management.

Constraints: The workflow visualization should support a reasonable number of nodes (at least 20-30 nodes and connections) without performance issues. React Flow is efficient with this scale. We assume one user viewing their workflow at a time (no collaborative viewing for this version). The system automatically generates layout for the diagram based on the workflow structure extracted from the conversation. The visualization must be responsive to different screen sizes, so we ensure the canvas container flexibly fills the area (using CSS flex or height 100%). Since this is a web app, we target modern browsers (Chrome, Firefox, Safari, Edge – all updated versions) and will test on those. The UI will not specifically cater to mobile screens in v1 (this is a desktop-focused tool due to the complexity of workflow visualization on small screens).
2. Automation Suggestion Engine (Backend – OpenAI GPT-4.1)
Description: Based on a user's workflow diagram, the system will generate suggestions for automating parts of that workflow. This is the core AI feature: the tool will analyze the sequence of steps and identify which steps can be automated (for example, through software tools, scripts, integrations, etc.), and will provide recommendations to the user on how to implement those automations. The suggestions will come from OpenAI GPT-4.1, guided by carefully designed system prompts to ensure relevant output.

Trigger and UI: The user will explicitly request suggestions by clicking a "Generate Suggestions" button in the Opportunities page or within the workflow discovery interface after a workflow is complete. This avoids unsolicited AI actions; the LLM is only invoked on demand. When clicked, the frontend will send the current workflow data and conversation history to a backend API route and will show a loading indicator while the suggestions are being generated. Once the response is received, the suggestions will be displayed to the user in a clear format, typically as a markdown table with opportunities, descriptions, complexity, and expected benefits.

Data Preparation for AI: To generate useful suggestions, the backend provides GPT-4.1 with both the structured workflow data and the conversation history that led to its creation. This gives the model a comprehensive understanding of the workflow context beyond just the node/edge structure. The system will:

1. Fetch the workflow data (including title, start_event, end_event, and steps)
2. Retrieve the conversation messages related to this workflow
3. Format this data into a comprehensive context for the model
4. Send this along with the appropriate system prompts to generate targeted automation suggestions

The suggestions will be stored in the `opportunities` column of the workflows table, allowing them to be retrieved and displayed without regenerating them each time.

Implementation Guidance: For each identified automation opportunity, the system provides detailed implementation guidance. This is generated through a two-step process:

1. First, the system generates an implementation prompt based on the selected opportunity
2. Then, it uses this prompt along with workflow context to generate comprehensive implementation guidance

The implementation guidance includes:
- Step-by-step instructions for implementing the automation
- Recommended tools or platforms
- Technical considerations and prerequisites
- Potential challenges and their solutions

Users can access this guidance by selecting a specific opportunity from the opportunities list, which then displays the implementation details in a dedicated panel or page.

Example of Workflow Description: If a user's workflow nodes (with labels) are: A: "Receive order form", B: "Enter data into system", C: "Generate invoice", and connections A->B, B->C, we might produce: "Workflow Steps:
Receive order form – (Start of process) The process begins when an order form is received.
Enter data into system – After receiving the order, the details are manually entered into the internal system.
Generate invoice – Once data entry is done, an invoice is generated for the order."
This text (perhaps in a single user message to the LLM) provides context for the AI to analyze. We will generate similar descriptions dynamically for any given workflow.
System Prompts Usage: We have two predefined system prompts in the src/lib/prompts.ts file that will be used to guide the GPT-4.1 model. These prompts have been implemented for this application's needs and include:

1. `workflowDiscovery` - Used for the conversational workflow discovery process
2. `aiOpportunities` - Used for generating automation suggestions

No paraphrasing or modification of these prompts will be done – we will use them exactly as implemented. When calling the OpenAI API, we will supply these prompts as system-level messages. The OpenAI Chat Completion API allows a conversation array with different roles. We will include the appropriate system prompt as a message with role "system" at the start of the conversation. This means GPT-4.1 will receive these instructions before seeing the user-specific content. The user-specific content (the workflow description we generated and perhaps a direct instruction to "suggest automation") will be passed as a user message in the API call. Structuring it this way ensures the model is primed with the correct context and rules (from our system prompts) while treating the workflow data as the query from the user.

OpenAI API Integration: We will utilize the OpenAI Node SDK for simplicity. The backend code will reside in a Next.js API route file, e.g. pages/api/suggestAutomation.ts (or similar path). This endpoint will handle a POST request from the frontend. Key steps in the API handler:

Receive Request: Parse the incoming request JSON which contains the workflow data. We can send either the full nodes/edges JSON or a preformatted description. For clarity, we'll send the raw nodes and edges and do the formatting in the API route (so that improvements to formatting can be done server-side without changing client code). The request should also include some identifier of the user or workflow if needed; however, since the client is already authenticated, we primarily need the workflow structure. We will also verify that the request is authorized (either by requiring a valid session token or by validating the user via Supabase, see Security below).

Format Prompt: Convert the workflow nodes/edges into the textual description as described above. Then construct the messages array for OpenAI:
Insert the appropriate system prompt (e.g., aiOpportunities) as the first message (role: "system") in the array.
Then add a User message. This user message will likely contain a short instruction and the workflow description. For example:
User message content: "Based on our discussion and the workflow summary below, please identify automation opportunities:\n\n<insert the workflow summary text>"
We will fine-tune the phrasing of this user prompt based on what yields the best results, but it will essentially feed the workflow info into the conversation and ask the model to provide automation suggestions. (This user message is dynamic per request, as it contains the workflow details.)

Call OpenAI API: Use the OpenAI SDK's createChatCompletion method with the model set to "gpt-4.1" (assuming that is the correct identifier for the GPT-4.1 model; if the API uses another naming convention, we will adjust accordingly – e.g., if GPT-4.1 corresponds to a model name like gpt-4-2025-05). We will set the messages parameter to the array built in the previous step. We may also set some additional parameters:
max_tokens: a limit for the response. We anticipate the suggestions list might be a few paragraphs at most; setting max_tokens to something like 500 should suffice to allow detailed suggestions without truncation.
temperature: we will use a moderate value (around 0.7). A medium temperature encourages the model to be creative and offer insightful suggestions, but not so high that it produces irrelevant or too-random ideas. We want the output deterministic enough to be reliable, but also creative enough to find non-obvious automations.
n: 1 (we only need one set of suggestions).
stop: not strictly necessary unless we want to enforce the model to stop at some token, but usually not needed as the model will stop when done or at token limit.
We will not stream the response for simplicity; the call will be made and awaited to completion.
Process Response: The OpenAI API will return a response containing a message (from the assistant) with the suggestions. Typically, we expect the content to be a formatted list (because our system prompts likely instruct the model to format as such). We will extract the text content from the API response. We may do minimal post-processing if needed (for example, if the model returns a markdown list or extra apologies, our prompts should prevent that, but we will test and ensure the prompts yield a clean result). Ideally, the model's answer is directly presentable. We will not alter the suggestions substantively on the server; we want the engineer and user to see exactly what GPT-4.1 produced except for any very trivial formatting fixes (like trimming whitespace or ensuring consistent bullet symbols).
Return Response: The API route will send back a JSON response to the frontend. For example, { "suggestions": "<formatted text or HTML>" }. We might choose to send the suggestions in markdown format (since GPT might produce markdown bullets). The frontend can then render it appropriately. Alternatively, we can parse the response and send an array of suggestion strings. However, simplest is to send the raw text/markdown and let the client render it (e.g., by dangerously setting innerHTML or using a Markdown renderer, as appropriate). We will include proper HTTP status codes: 200 for success with suggestions, and error codes (500 or 502) if the OpenAI API call failed or another error occurred.
Displaying Suggestions (Frontend): Once the frontend receives the suggestions text, it will display them to the user. We will ensure this is done in a readable format:
If the suggestions are in markdown (likely a numbered or bulleted list), we can either render them as raw text inside a <pre> or style them nicely. A simple approach: display inside a modal or a side panel on the page. For instance, clicking "Suggest Automation" opens a right-side panel or modal overlay that shows "Automation Suggestions for this Workflow:" followed by the list of suggestions.
We will include each suggestion as a bullet or number with the content from the model. If the model response is one large string, we can split by newline or list markers to style each as needed. If it's already formatted with markdown bullet points or numbers, we may simply insert it into the DOM as HTML (with caution to avoid script injection – since the content comes from an AI we control, the risk is low, but we might use a markdown parser to be safe).
There should also be an indication that these are AI-generated suggestions and not guaranteed to be 100% accurate, just to manage user expectations (this can be a small disclaimer in the UI panel).
After viewing suggestions, the user can close the panel/modal and possibly make changes to their workflow or save the suggestions externally. (We are not automatically applying any changes to the workflow based on suggestions; it's up to the user to implement them in their processes outside this tool. Our tool is advisory.)
OpenAI API Key Security: The OpenAI API key will never be exposed on the client side. It will be stored in the server environment (in an .env file and configured in Vercel as an environment variable). The frontend calls our internal API route for suggestions without knowledge of the API key. The backend will retrieve the key via process.env.OPENAI_API_KEY. We will also ensure not to log the key or the full content of prompts in any client-visible way. We might log events (like "suggestions requested for workflow X by user Y") for debugging, but sensitive details should stay server-side. Error Handling and Constraints: If the OpenAI API call fails (network error, API error, or timeout), the backend will catch the exception. We will return a proper error response (e.g., HTTP 500 with a message "Failed to generate suggestions, please try again."). The frontend should handle this by alerting the user (e.g., showing a notification "Unable to get suggestions at this time"). We will implement a reasonable timeout for the API call (OpenAI might have a default or we might implement one via the HTTP library) – e.g., if no response in 20 seconds, abort and error out. We should also consider rate limiting: GPT-4.1 is expensive and somewhat rate-limited. We will not allow unlimited suggestions calls. At minimum, we can implement a simple rate limit per user (for instance, one suggestion request every 30 seconds per user) to prevent spamming the API. This can be handled in-memory (not extremely robust but acceptable for initial version) or via a token bucket approach on the backend. We also note that each suggestion call may cost tokens proportional to the workflow description and the output; since this is an internal tool for an organization (assuming usage is not open public), we will monitor usage and ensure our API key quota is sufficient. Finally, we must ensure the prompt stays within model token limits. GPT-4.1 presumably supports at least 8,000 tokens context. Our system prompts plus workflow description should comfortably fit in that. However, if a workflow is extremely large (say 100+ nodes with long labels), we might exceed limits. As a constraint, we will set a limit on workflow size for analysis – e.g., do not allow more than 50 nodes or a total description length beyond, say, 3000 characters. We can enforce this by validation when user clicks "Suggest Automation": if the workflow is too large, show an error advising to simplify the workflow. This ensures we don't truncate important information in the prompt.
3. User Accounts and Organization Management (Auth)
Description: The application will support multiple users, each belonging to an organization (typically a company or team). Users sign up with an email and password (or magic link). The organization grouping ensures that data (workflow diagrams, etc.) is isolated per company: users in Org A cannot see Org B's workflows. This feature is crucial for multi-tenant use in enterprise scenarios. User Signup/Login Flow: We will use Supabase Auth to handle user authentication. Supabase provides a ready-to-use authentication system with email verification. We will enable either email/password sign-up or magic link (email OTP) for a passwordless experience – for our purposes, email + password is fine and straightforward. The front end will present a Login page where the user can either log in or register. We will collect their email, password (if using that method), and possibly an organization identifier if needed (though we plan to auto-assign by domain, so we won't ask them to input organization manually in the UI to keep it simple).
Registration: If the user doesn't have an account, they can choose "Sign up". We'll use the Supabase JS SDK method supabase.auth.signUp({ email, password }). Supabase will send a confirmation email to that address by default (we will ensure email confirmation is required in the Supabase settings). The user must click the confirmation link, then they can log in. We'll handle this flow in the UI by showing a message like "Check your email to confirm your account." Supabase can also do magic link sign-ins; if we prefer no password, we could use signInWithOtp, but for now we'll proceed with standard email/password.
Login: On the login form, we call supabase.auth.signInWithPassword({ email, password }) via the SDK. On success, Supabase provides a user session (with an access JWT and refresh token). The Supabase JS client will handle storing the token (e.g., in local storage) and we can use that for subsequent requests. Once logged in, the user is redirected to the main application (workflow editor page).
Auth UI Implementation: We will create a Next.js page for authentication (e.g., pages/login.tsx). This page will have forms for login and sign-up (or a toggle between them). We'll use simple React state to capture form inputs and call the appropriate Supabase SDK methods on submit. We'll also handle error messages (e.g., user already exists, wrong password, etc.) by displaying them on the form. Note: Supabase also provides a pre-built <Auth> UI component that can handle a lot of this for us; however, for full control and better UX, we'll implement it ourselves. (Either approach is fine, but we specify custom implementation to avoid assumptions.)
Session Management: After login, we need to ensure the session persists and is accessible to our app. Supabase's client library keeps the session and will automatically attach the auth token to any Supabase queries. We might also need to propagate this session to our Next.js API routes to identify the user on server calls. We have a couple of options:
We can rely on the Supabase JWT and enable "persist session" so that it sets a cookie or local storage item. Supabase can use a cookie-based auth if configured (there's a supabase.auth.setSession() and the ability to work with cookies in Next.js middleware for SSR). A simpler route is to use the client exclusively for DB operations (which include auth), and protect pages on the client side by checking supabase.auth.getUser() etc.
For our scenario, since most interactions (like saving workflows) can be done directly via supabase client from frontend, a full server-side session handling isn't strictly required. We will, however, protect the suggestion API route by requiring an auth token. For that, we can send the Supabase JWT in the API request (the Supabase client's user session token could be included in the request header or body). Alternatively, we can call supabase.auth.getSession() on the client and include the access_token in the request to our Next.js API (e.g., as a header Authorization: Bearer <token>). On the server, we can then validate this token by calling Supabase's auth endpoint or using the Supabase Admin SDK. A simpler method: since the suggestion endpoint doesn't directly talk to the database, as long as the call is coming from a logged-in context, we might assume it's fine. But for security, we will implement a check – for example, require the client to send along the user's ID or email, and then cross-verify it by querying the Supabase Auth (via the admin key) or by trust (less ideal). We can refine this in the security section, but the main point is that only logged-in users should be able to call the suggestion API route.
Organization Assignment: Each user must belong to an organization. We define an Organization as a separate entity in the database that groups users and their workflows. We will implement organization assignment automatically based on email domain for simplicity:
We will have a table organizations in the database, with fields: id (UUID primary key), name (text, optional or same as domain), and domain (text, unique). We'll pre-populate or create entries in this table as users sign up.
When a new user confirms their email and logs in for the first time, our application will determine their org:
Parse the user's email to extract the domain (the part after @). For example, if the email is alice@acme.com, domain = acme.com.
Check in the organizations table if an entry with domain = "acme.com" exists.
If yes, assign the user to that organization.
If no, create a new organization record with domain "acme.com" and a default name (we can just use the domain as the name initially).
Then assign the user to this newly created org.
The assignment of a user to an org will be stored likely in a profiles table or similar. Supabase by default suggests creating a profiles table (one-to-one with auth users) for additional user info. We will do that:
Table profiles: columns: user_id (UUID, primary key, references auth.users), org_id (UUID, references organizations.id), and maybe full_name, etc. For our needs, user_id and org_id suffice.
We will set up a database trigger on the Supabase Auth table to automatically create a profiles entry when a new user registers. Supabase allows triggers on the auth.users (though in their docs, one usually does a trigger on insert into auth.users to populate profiles). This trigger can call a stored procedure that implements the domain logic: it takes NEW.email, finds/creates the organization, and inserts into profiles(user_id, org_id).
Alternatively, we can perform the org assignment in our Next.js backend after sign-up. For example, after the user signs in for the first time, our frontend could call an API route /api/postSignup that does the domain check and creates the org. Using a trigger is more automatic and doesn't rely on that extra call, but writing a Postgres function with the domain logic is a bit more complex. Given a senior engineer audience, doing it in a trigger is fine; however, to avoid complexity, we might do it in application code for clarity:
After a successful signUp or on first login, the client can call a secured endpoint like /api/ensureOrg which runs server-side and does: query org by domain, create if needed (using the Supabase service key to bypass RLS), then insert the profile. This would require the user's email or id; we have the email from the sign-up form or from supabase.auth.user() after login.
We will explicitly implement one of these methods. Choice: We will implement it via database trigger for determinism:
Create a Postgres function handle_new_user() that on new user insert (into auth.users) does the domain logic. In pseudocode:
sql
Copy
Edit
get email domain;
org = select id from public.organizations where domain = email_domain;
if not found: 
   org_id = uuid_generate_v4();
   insert into public.organizations(id, domain, name) values(org_id, email_domain, email_domain);
else 
   org_id = found id;
insert into public.profiles(user_id, org_id) values(new_user_id, org_id);
Attach trigger: CREATE TRIGGER on_auth_user_after_insert AFTER INSERT ON auth.users EXECUTE PROCEDURE handle_new_user();
We must enable Supabase triggers and set the appropriate security definer (since auth.users is in auth schema and profiles in public).
Note: According to Supabase docs, direct triggers on auth.users might not be allowed or need special config. If that's problematic, we can do it on the public.profiles insertion by having the application explicitly insert into profiles after sign up, but then we need to ensure that runs. For now, assume we can use a trigger or a background process to handle it.
This ensures by the time a user is fully onboarded, they have a profiles row linking to an org.
Organization Usage: Once the user's profile has an org_id, every workflow they create will be associated with that org_id. We will use this to filter data. For example, when reading workflows from the database, we will always filter by org_id = user's org_id. When inserting a new workflow, we will attach org_id. This way, even if a malicious user tried to query others, the DB's RLS policies (discussed next) will prevent cross-org access.
Authorization (RLS Policies): We will enable Row Level Security on the relevant tables (profiles, workflows, organizations maybe). The policies will enforce:
On workflows table: A user can SELECT/UPDATE/DELETE a workflow if and only if they belong to the same org as that workflow's org_id. They can INSERT a new workflow only with their own org_id. We can implement this by creating policies that join with the profiles table or by using the JWT claims. Supabase's JWT can include a custom claim for org_id if we set that up, but it might be easier to just join on profiles. For example:
CREATE POLICY "org members can access workflow" ON public.workflows FOR SELECT USING ( auth.uid() IN (SELECT user_id FROM public.profiles WHERE profiles.org_id = workflows.org_id) );
And similarly for update/delete. For insert, we ensure the org_id on the new row matches the inserting user's org:
WITH CHECK ( new.org_id = (SELECT org_id FROM public.profiles WHERE profiles.user_id = auth.uid()) ).
On profiles table: probably allow each user to read their own profile and maybe others in their org if needed. Not crucial for our app's main functionality; we might just ensure no one can modify profiles except via the trigger.
On organizations table: we likely don't need to expose this table directly to the client. It might be only manipulated in backend or by triggers. We could allow users to read their org info if needed (like display org name), but it's minor.
By using RLS along with Supabase's client, even if someone tried to query all workflows, they would only get theirs. This adds a layer of safety beyond the app logic.
Account Management UI: Within the app, we will have minimal account management features initially:
Users can log out (we'll provide a logout button that calls supabase.auth.signOut() and then redirects to the login page).
We will not implement user profile editing in v1 except perhaps showing their logged-in email and org name somewhere on the UI.
If multiple users from the same organization use the app, each will have their own login but see the same pool of workflows (since we group by org). This implies that workflows are shared within an organization. If this is not desired, we could choose to isolate by user, but the requirement said org-based login, which suggests sharing within org. We will proceed with the assumption that all org members can view and edit all workflows of that org. (This can be adjusted by policy if needed, but we'll make it a feature: collaboration within org.)
We should note that organization-based access means if alice@acme.com and bob@acme.com both sign up, they'll both be in "acme.com" org and can see each other's workflows. If this is not intended (maybe they wanted just segregation by company but not necessarily sharing internally), we might interpret it differently. However, since they specifically said org-based login, it likely means a workspace per org. We will clarify this design choice in documentation to the stakeholders if needed. For now, assume org members share data.
4. Workflow Persistence and Data Model (Database)
Description: Users should be able to save their workflow conversations, view the generated diagrams, and access automation suggestions. This requires storing the workflow structure, conversation history, and suggestions in the database.

Data Entities:
Workflow: Represents a workflow created through conversation. Fields:
id (UUID, primary key)
org_id (UUID, references organizations.id) – the organization that owns this workflow.
user_id (UUID, references auth.users) – the user who created the workflow.
title (text) – a human-friendly name for the workflow.
start_event (text) – the event that initiates the workflow
end_event (text) – the event that completes the workflow
workflow_data (JSONB) – the structured workflow data including steps, people, systems, and pain points
diagram_data (JSONB) – the diagram representation for React Flow with nodes and edges
opportunities (TEXT) – stores the automation suggestions generated for this workflow
created_at (timestamp) – when the workflow was created (default to now()).
updated_at (timestamp) – when the workflow was last saved.

Conversation: Represents a conversation session for workflow discovery. Fields:
id (UUID, primary key)
workflow_id (UUID, references workflows.id) – the workflow this conversation is about.
user_id (UUID, references auth.users) – the user who participated in the conversation.
title (text) – typically matches the workflow title once it's determined.
created_at (timestamp) – when the conversation was started.
updated_at (timestamp) – when the conversation was last updated.

Message: Represents a single message in a conversation. Fields:
id (UUID, primary key)
conversation_id (UUID, references conversations.id) – the conversation this message belongs to.
role (text) – 'user', 'assistant', or 'system'
content (text) – the message content
created_at (timestamp) – when the message was sent.

We will create these tables in the Supabase project (in the public schema):
Run SQL migrations or use the Supabase Dashboard. The PRD specifies the structure, so the engineer will implement it accordingly. Exact SQL statements for clarity:
CREATE TABLE public.organizations ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), domain TEXT UNIQUE, name TEXT );
CREATE TABLE public.profiles ( user_id UUID PRIMARY KEY, org_id UUID REFERENCES public.organizations(id), -- possibly add foreign key email TEXT, -- we can cache email for convenience, not strictly needed CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES auth.users(id) );
(Note: auth.users is in a different schema; Supabase allows cross-schema FK or we skip the FK for auth.users for simplicity and rely on logical link.)
CREATE TABLE public.workflows ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), org_id UUID REFERENCES public.organizations(id), user_id UUID, name TEXT, diagram_data JSONB, workflow_data JSONB, start_event TEXT, end_event TEXT, opportunities TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() );
We'll add a foreign key on user_id to auth.users if possible, or to profiles.user_id. We might not strictly need that FK because the profile link gives us org and user, but it's good to have referential integrity where possible (perhaps referencing profiles.user_id since every profile is one user).
We will ensure indexes on foreign keys (Supabase typically does that automatically for PK and maybe FKs). Particularly, an index on workflows.org_id for quick org-based queries, and on profiles.org_id if needed.
Row-Level Security: We will enable RLS on public.workflows (and on profiles if needed). As described, we'll write policies so that:
A user can select/modify workflow if profiles.user_id = auth.uid() and profiles.org_id = workflows.org_id for some profile (meaning the user's org matches the workflow's org). In simpler terms, "user's org_id == workflow.org_id" is the check.
Additionally, we might enforce that only the user who created it or any user in the org can edit. Depending on if we want to restrict editing to owner or allow all in org to edit. We should clarify: likely all in org can view and edit (collaborative). We will allow org members to update too. So the policy could just check org match and not worry about user_id matching specifically for update/delete. If we want to track authorship, we have user_id field but not for permission beyond org membership.
For insert: we check that the org_id on the new workflow matches the inserting user's org. We could even auto-set org_id in a database function from their profile to avoid trusting client input. Simpler: when our app calls insert, it will explicitly set org_id from the user's profile we have in context (so it should always be correct). The policy will double-verify it matches.
Saving a Workflow (Frontend & Backend):
We will provide a "Save" or "Save Workflow" button in the UI. When clicked, if this is a new workflow not yet saved, it will trigger creating a new record in the DB; if it's an existing workflow (previously saved and loaded), it will update that record.
Implementation approach: We have two choices to interact with Supabase: use the Supabase JS client from the browser or go through Next.js API routes.
We will use Supabase client directly in the frontend for standard CRUD (create/read/update workflows). This leverages Supabase's built-in auth and RLS on the client side and reduces the need to write and deploy extra backend code for these simple operations. The Supabase JS SDK will use the user's JWT to authenticate these requests.
Concretely, when the user clicks Save, our React code will do something like:
ts
Copy
Edit
const user = supabase.auth.getUser(); // current user
const workflowData = { name: currentName, diagram_data: currentDiagramJSON, user_id: user.id, org_id: userProfile.org_id };
if (currentWorkflowId == null) {
  // Create new
  const { data, error } = await supabase.from('workflows').insert(workflowData).select().single();
} else {
  // Update existing
  const { data, error } = await supabase.from('workflows').update({ name: ..., diagram_data: ..., updated_at: 'now()' }).eq('id', currentWorkflowId).select().single();
}
We include user_id and org_id in the data. However, we might not allow the client to freely set those for security – but since RLS will check them, it's okay as long as it matches the logged-in user. Alternatively, to prevent any shenanigans, we could exclude user_id and just rely on a Postgres trigger to set user_id = auth.uid() on insert. Supabase's auth.uid() can be used in a DEFAULT or trigger. We can do: in the insert policy, use auth.uid() to set fields. Simpler: set it in code for now.
The select().single() just returns the inserted/updated row for confirmation (optional).
We will handle error by notifying the user if save failed.
Using the client approach means we must load the user's org_id on client side too (for inserting). We can get that via the profiles table. So after login, we should fetch the current user's profile (e.g., const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single()). We might do this once and store it in a context or global state. We can also fetch organization.name via a join if we want the org name. This profile fetch will be done as soon as user is logged in and we navigate to main page, to have the org_id readily available.
Alternative via backend: If we were to use an API route for save, the backend would use the Supabase Service Role key (from env) to perform inserts, which bypass RLS. We would then have to implement checks manually. This is more code and potential for mistakes, so using the client with RLS is cleaner and fully secure.
Loading Workflows: When the user opens the app after login, they should see either an empty canvas for a new workflow or a list of existing workflows to choose from. We will implement a simple dashboard or sidebar listing:
The frontend can query Supabase for all workflows where org_id == userProfile.org_id. For example: supabase.from('workflows').select('id, name, updated_at').order('updated_at', {ascending: false}) to get a list of workflows for that org, most recent first. This gives the user the ability to switch workflows.
We will display this list in a sidebar or a modal "Open Workflow" dialog. A basic approach: a left sidebar that shows the names of workflows as clickable items. Clicking one will load it into the editor.
Loading means fetching that workflow's diagram_data and setting the React Flow state to those nodes and edges. For instance,
ts
Copy
Edit
const { data: workflow } = await supabase.from('workflows').select('diagram_data, name').eq('id', someId).single();
// then:
setNodes(workflow.diagram_data.nodes);
setEdges(workflow.diagram_data.edges);
setCurrentWorkflowId(someId);
setCurrentName(workflow.name);
React Flow can take initial nodes/edges via its props, or we may need to use state update methods to set them when loading dynamically. We'll manage that carefully (React Flow has an utility to parse JSON to elements; since we stored it from the same library, it should align perfectly).
If there are no saved workflows yet for a user, the UI can either start with an empty unnamed workflow or prompt "No workflows yet, create a new workflow".
Editing/Updating Workflows: If a user wants to modify a workflow, they must continue or restart the conversation that generated it. Since the workflow is created through the AI-guided discovery process, any changes to the workflow structure require updating the conversation. When a conversation is updated and the AI extracts new workflow information, the system will regenerate the diagram data and update the workflow in the database with both the new workflow data and diagram representation. The updated_at timestamp is updated on each modification.
Deleting Workflows: Not explicitly mentioned as a requirement, but for completeness: we may allow deletion of a workflow. We can add a "Delete" button in the UI list for each workflow. This would call supabase.from('workflows').delete().eq('id', workflowId) and remove it. RLS will ensure only org members can delete their own. We will implement this if time permits; it's straightforward but must be confirmed if needed.
5. Additional Implementation Notes and Constraints
Environment Configuration: All sensitive configuration will be stored in a .env file (which will not be committed to source control). Specifically, we require the following keys in the environment (and they will be provided to the application either via .env.local in development or via Vercel project settings in production):
OPENAI_API_KEY – the secret API key for OpenAI GPT-4.1. This will be used in the serverless function calls to OpenAI. (No default; must be set in the env for the feature to work.)
SUPABASE_URL – the URL of the Supabase instance (format: https://<uniqueid>.supabase.co). This is provided when you create a Supabase project.
SUPABASE_ANON_KEY – the public anon API key for Supabase. This is used by the frontend to make authenticated requests as the user. Even though it's called anon, with the user's JWT it becomes an authenticated context. This key is safe to expose to the client (it only has the permissions we set via RLS).
SUPABASE_SERVICE_ROLE_KEY – the secret service role key for Supabase (optional in our design). This key has admin rights to the database (bypassing RLS). We will use it only on the server if needed (for example, to verify user tokens or perform special operations like the org assignment if not done via trigger). This key must be kept private (never sent to client). If we implement the org creation in a DB trigger, we might not need to use the service key in application code; but it's good to have available for potential admin tasks.
(Optional) NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY – in Next.js, environment variables prefixed with NEXT_PUBLIC_ are exposed to the browser. We will likely define the Supabase URL and anon key with this prefix in the .env, so that the frontend React code can initialize the supabase client. For example, .env.local will contain:
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI... (a long JWT string).
Vercel's environment variables should be set the same (with those names) so that the production build also injects them. The OpenAI key and service role key will NOT be prefixed (so they remain server-only).
We will explicitly list these in documentation and ensure the deployment engineer sets them. The application at startup will check for required keys (we can throw an error or warning if any are missing).
Package Installation: To set up the project, the engineer will run npx create-next-app@latest (ensuring a Next.js 14 project with TypeScript). Then install the required dependencies via npm or yarn:
openai@4.x – Official OpenAI API client.
@supabase/supabase-js@2.x – Supabase client.
reactflow@11.x – React Flow diagram library.
lucide-react – Icon library for UI components.
We may also install typescript (if not already included) and types for Node if needed, but create-next-app with TypeScript will handle that. Other utility libraries (if any required for formatting, etc.) will be added as needed, but at this point, these four cover our core needs.
(Optional dev dependency) If we use ESLint/Prettier, Next.js setup can include those, but not critical to list here.
Project Structure: We will follow Next.js conventions:
Pages:
pages/login.tsx – Login/Register page.
pages/index.tsx – Main application page (requires auth).
pages/api/suggestAutomation.ts – API route for LLM suggestions.
(We might not need other API routes if using Supabase client directly for CRUD. If we choose to implement any server-side endpoints for data, e.g., pages/api/workflows.ts or [id].ts for RESTful workflow access, we could, but it's likely unnecessary with direct Supabase use.)
Components:
We can create a components/WorkflowEditor.tsx to encapsulate the React Flow canvas and related UI (buttons). This can be used inside the index page.
Maybe a components/WorkflowList.tsx for the sidebar listing workflows.
Possibly components/SuggestionsPanel.tsx for the modal/panel that displays AI suggestions.
We will also have a file like utils/supabaseClient.ts where we initialize the Supabase client with the URL and anon key. This can be imported wherever we need to make Supabase calls (both in pages and potentially in API routes if we needed). Example:
ts
Copy
Edit
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
Then in pages, we can use this supabase instance.
For calling OpenAI, we may create a helper function in utils/openai.ts that encapsulates the chat completion call (passing the system prompts and user prompt), to keep the API route code clean. Or we can code it directly in the API route – either is fine, but encapsulating might allow re-use if we had multiple AI endpoints.
Security & Privacy Considerations:
We ensure that no workflow data is sent to OpenAI without user action (they must click "Suggest Automation"). When it is sent, we assume that's intended by the user. However, we should communicate to users that their workflow description will be sent to OpenAI (a third-party) for analysis. Depending on the sensitivity of workflows, this could be a concern. We could include a note in the UI or terms that "By using the suggestion feature, your workflow content will be processed by OpenAI's GPT-4.1 model." In an enterprise setting, if needed, we could allow an opt-out or self-hosted model in future, but not in v1 (we strictly use GPT-4.1).
We will configure OpenAI API usage such that data is not retained by OpenAI (OpenAI allows us to disable data logging if we go to their settings, or by default OpenAI might not use API data for training as of 2025 for business accounts). We will assume this is handled out-of-band.
The Supabase database will contain potentially sensitive workflow information. We rely on Supabase's managed security and our RLS policies to protect it. The engineer should also ensure the Supabase service role key is kept secret and that no admin endpoints are exposed.
The application should implement HTTPS in production (Vercel enforces HTTPS by default on custom domains or their domain).
There is no role-based differentiation beyond organization in v1 (no admin vs user rights distinct; all users in org are equal). If needed, we could designate certain users as org admins who can delete workflows or invite others, but not in this scope.
Deterministic Behavior:
All major decisions have been made explicitly in this document. The implementation should follow these without deviation:
Use OpenAI GPT-4.1 for suggestions exclusively.
Host on Vercel (so the repository must be connected to Vercel; any CI/CD should be through Vercel's Git integration).
Use Next.js for everything (no separate Express server or anything; utilize pages and API routes as specified).
Use Supabase for persistence and auth – no other database or auth system.
Use React Flow for diagram UI – no custom diagramming library or canvas implementation.
The system prompts text must be exactly as given (in Appendix) when used in code – copy-paste them into a constants file or directly into the API call array. These are carefully crafted; even minor wording changes can alter AI output, so treat them as immutable.
All feature implementations (login, saving, suggesting) should be done as described, using the libraries in their intended way. For instance, do not custom-build a different login unless necessary – stick to Supabase's provided methods.
Every dependency version should be the specified major version (or a specific version if we provided) to avoid incompatibilities. If a newer version is out, the engineer should be cautious and stick to known stable choices unless there's a good reason.
Step-by-Step Development Plan:
To implement this product in a structured way, here is a stepwise plan:
Setup Project: Initialize a Next.js 14 project with TypeScript:
npx create-next-app@latest --typescript workflow-ai-tool (or similar name).
Verify it runs (npm run dev) and commit the base to version control.
Install Packages:
graphql
Copy
Edit
npm install openai@4.x @supabase/supabase-js@2.x reactflow@11.x lucide-react
Also install type definitions if needed (most of these include their own types). Ensure these are added to package.json.
Configure Environment: Create a .env.local file in the project root (this is git-ignored by default with Next.js):
Add the keys:
OPENAI_API_KEY=<your OpenAI API key>
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon public key>
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key> (if using server role in code)
(For development, you can fill these with test or dummy values initially, but real values are needed to fully test functionality. On Vercel, set these in the dashboard before deploying.)
Supabase Setup: In the Supabase web console, create the necessary schema:
Create the organizations table and insert any initial data if needed (can be empty to start – the app will create new entries on the fly).
Create the profiles table with user_id and org_id. Optionally include email for convenience.
Create the workflows table with columns as defined. Enable uuid_generate_v4() extension if not already (Supabase usually has it).
Set up the trigger on auth.users to populate profiles and orgs:
Go to SQL editor and run the function and trigger creation SQL as per our plan. Test it by creating a new user (you can simulate in Supabase auth or wait to test via the app).
Enable RLS on workflows (and profiles if needed). Write policies:
For workflows, use the example policy conditions given. Test the policy by simulating queries as a user (Supabase has a policy tester). Ensure that without a JWT of a user, no data returns, and with a user JWT, only that org's data returns.
For profiles, you might allow each user to select their own profile (auth.uid() = user_id) just in case we need to read org_id easily via supabase (though we can also decode JWT if custom claims were added).
Add a policy on organizations if we will read it (like allow a user to select their org by id via their profile's org_id).
Generate an anon key and service role key from Supabase settings and plug them into the .env.
Auth Page: Implement pages/login.tsx:
Use React state to manage form (email, password).
Provide a toggle or separate forms for Sign In and Sign Up.
On submit, call supabase.auth.signInWithPassword() or signUp() accordingly.
Handle success: on login success, redirect (use Next/router to push to /).
Handle error: display error message (e.g., incorrect credentials, or "user already exists" on sign up).
(If using magic link instead, adapt accordingly – but password is fine).
Style the form simply (labels and inputs, a button). Since this is for a senior engineer, design polish is not primary, but clarity is – ensure the form is clearly labeled.
Test the signup flow: after sign up, check Supabase that the new user is created, trigger inserted profile and org correctly.
Initialize Supabase Client: Create utils/supabaseClient.ts as described to create and export a Supabase client instance using the NEXT_PUBLIC_ env variables. This will be imported in pages/components rather than initializing Supabase in each file.
Main App Page (Workflow Editor): Implement pages/index.tsx:
This page should first ensure the user is authenticated. If not, it should redirect to login. We can implement this by checking supabase auth state on mount. Supabase has an auth state change listener or we can use supabase.auth.getUser() which returns the user immediately if logged in (since session is stored). If user is null, we redirect. Alternatively, Next.js middleware could protect this route. Simpler: do it in useEffect:
ts
Copy
Edit
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      router.push('/login');
    }
  });
}, []);
Also, if rendering server-side, we might want to redirect in getServerSideProps by reading a cookie. However, using client-side redirect is acceptable for now.
Once we know user is logged in, fetch the user's profile (org_id).
ts
Copy
Edit
const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
Store this (e.g., in a state orgId or a context if many components need it). This will be needed to filter workflows or include in inserts.
Now, fetch workflow list:
ts
Copy
Edit
const { data: workflows } = await supabase.from('workflows').select('id, name, updated_at').eq('org_id', profile.org_id);
This returns an array of workflows for that org. Store it in state workflowList.
UI layout: perhaps a sidebar listing workflowList and a main panel with React Flow.
Sidebar: simply map through workflowList and display each name (and maybe last updated). On click, call a function openWorkflow(id) that loads that workflow's data.
Also include a button "New Workflow" to start a fresh one. That could just clear the current editor state and set currentWorkflowId = null with empty nodes.
Main Panel: Integrate the WorkflowEditor component.
Within index.tsx or in a separate component, set up React Flow as described. Use nodes and edges state. When openWorkflow is called with an ID:
ts
Copy
Edit
const { data: wf } = await supabase.from('workflows').select('name, diagram_data').eq('id', id).single();
setCurrentWorkflowId(id);
setCurrentWorkflowName(wf.name);
const { nodes, edges } = wf.diagram_data;
setNodes(nodes);
setEdges(edges);
React Flow will then render the nodes/edges. We might need to also call setViewport if we want to reset zoom/position to fit.
Provide a text input or heading to display/edit the workflow name. For example, an <input value={currentWorkflowName} onChange={...}/> at top of the canvas.
Add the Save button: on click, if currentWorkflowId is null, do insert; if not null, do update. (As outlined earlier with supabase calls).
Use the nodes and edges state to form diagram_data: in React Flow, nodes and edges are already serializable (they are plain objects including functions? Actually, nodes have functions like position? But they should be serializable as JSON, React Flow docs show saving the elements object).
Possibly remove any cyclical data before saving (React Flow's nodes might include extra fields). Usually, one would pick only the relevant properties (id, position, data, type for nodes; id, source, target for edges, etc.) to store. We can store everything except functions.
If necessary, we can transform nodes/edges to plain objects by JSON.stringify({nodes, edges}) – if that fails, filter out functions. Alternatively, React Flow might provide a utility, but not sure. For simplicity, we attempt to store as is; if some fields cause error, we refine.
Add the Suggest Automation button: on click, call a function to request suggestions:
Prepare the data to send: either send the workflow id or the serialized nodes/edges. We decide to send the actual content to avoid an extra db call on the server (since we already have it in client). The content could be large, but typically fine.
So do:
ts
Copy
Edit
const response = await fetch('/api/suggestAutomation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
  body: JSON.stringify({ nodes: nodes, edges: edges, workflowName: currentWorkflowName })
});
const result = await response.json();
We include the auth token in an Authorization header for security. Alternatively, we could rely on Supabase session cookie if we set that up, but since we didn't, we do this manual step. The backend will verify it.
While this request is pending, set some state loadingSuggestions=true to show a spinner or disabled UI.
On response, it should contain suggestions text. Set suggestionsText = result.suggestions and show the SuggestionsPanel with that content.
SuggestionsPanel: if suggestionsText state is non-empty, render a modal (absolute positioned div over the app) with the content. Include a close button to hide it (simply set suggestionsText back to null or empty).
Render the text as received. If it's markdown, we can either render as raw text with line breaks (since likely it's a list). A quick solution is to use <pre> to preserve formatting, or include a minimal markdown parser if needed. Given time, we can just display it in a <div> with basic styling (the model might output numbered list which will look fine if inserted into a div).
We ensure the panel is scrollable if content is long, etc.
Backend Suggestion API Route: Implement pages/api/suggestAutomation.ts:
Parse the JSON body (Next.js provides the body automatically if content-type is JSON, or we can use req.body since Next 12+, it parses JSON by default).
Optionally verify auth: We expect an Authorization Bearer token. We can verify this token by using the Supabase Admin (service key) to call auth.getUser(token) or by decoding JWT. Easiest: use Supabase's admin client.
Create an admin supabase client in this API route (with SUPABASE_SERVICE_ROLE_KEY).
Do const { data: user, error } = await supabaseAdmin.auth.getUser(token) – this returns the user if token is valid. If invalid or not provided, return 401 Unauthorized.
Additionally, we can verify that the user's org matches the org of the provided workflow data if an ID was provided. But since we send nodes, no ID, we skip that.
Construct the workflow description text from nodes/edges as described previously. Possibly, the client could send workflowName and nodes list. We can incorporate the name in the description (like "Workflow Name: X" if that helps context).
Load the system prompts. We will use the system prompts from the prompts.ts file. For example:
ts
Copy
Edit
import { systemPrompts } from '@/lib/prompts';

const messages = [
  { role: "system", content: systemPrompts.aiOpportunities },
  { role: "user", content: userPromptContent }  // where userPromptContent includes the workflow description
];

const completion = await openai.createChatCompletion({
  model: "gpt-4-1",  // if actual model name differs, use appropriate
  messages: messages,
  temperature: 0.7,
  max_tokens: 500
});

const assistantMessage = completion.data.choices[0].message?.content;

Check for existence of content and choices. Then format the response JSON with that content.
Return the response with res.status(200).json({ suggestions: assistantMessage });.
Testing: Once all components are built, thoroughly test each aspect:
Sign up a new user, verify profile created, org created, login works.
Create a workflow: add nodes, connect them. Save it. Check in Supabase DB that the workflow row is created, with correct org_id and user_id, and JSON data.
Refresh or re-login to see if the saved workflow appears in list and can be loaded.
Click suggest on a simple workflow. See that the suggestion comes back and is displayed. Validate the content is sensible (tweak prompts if not – but since prompts are fixed given, hopefully they were already tuned).
Try a workflow with multiple branches to see how description and suggestions handle it.
Test concurrent usage: log in as two different org users (if possible) and ensure they cannot see each other's workflows.
Test error scenarios: invalid login, suggestion when OpenAI key is wrong (should show error).
Ensure the environment variables are properly read in production (maybe run a staging deployment to Vercel and test there with real keys).
By following the above steps and adhering strictly to the specified technologies and configurations, the resulting product will be built exactly to the prescribed design. The senior engineer implementing this should not need to make subjective decisions; all key choices (from stack to data model to API usage) have been explicitly made here.
10. Create Opportunities and Implementation Components:
- Implement OpportunitiesDisplay component to show automation suggestions
- Create workflow-opportunities page to display workflow diagram and suggestions
- Implement implementation page for detailed implementation guidance
- Add API routes for generating suggestions and implementation guidance
- Create UI components for cards, buttons, and loading indicators
API and Integration Constraints:
OpenAI API calls are hard to predict for cost management. We will set an upper limit on tokens per request to control costs.
The system prompts text must be exactly as implemented in the prompts.ts file when used in code. These are carefully crafted; even minor wording changes can alter AI output, so treat them as immutable.