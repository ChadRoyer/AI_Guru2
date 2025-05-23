# Workflow Automation Tool

A web-based tool that allows users to visually map their workflows and receive AI-generated suggestions for automation and optimization.

## Features

- **Workflow Discovery**: Guided conversation to map out business workflows
- **AI Opportunities Identification**: Get AI-powered automation suggestions based on your workflow
- **Implementation Guidance**: Receive detailed guidance on how to implement identified automation opportunities
- **Organization-based Isolation**: Share workflows with members of your organization

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Data Visualization**: React Flow
- **Authentication & Database**: Supabase (Auth, PostgreSQL)
- **AI Integration**: OpenAI GPT-4.1

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and authentication)
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/workflow-automation-tool.git
   cd workflow-automation-tool
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` to add your Supabase and OpenAI API credentials.

4. Set up Supabase tables and policies:
   - Create a new Supabase project
   - Run the SQL queries in the `supabase/` directory to set up tables and policies

5. Start the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
workflow-automation-tool/
├── src/                              # Source code
│   ├── components/                   # React components
│   │   ├── auth/                     # Authentication components
│   │   ├── layout/                   # Layout components
│   │   └── workflow/                 # Workflow components
│   ├── lib/                          # Utility libraries
│   │   ├── supabaseClient.ts         # Supabase client
│   │   ├── openai.ts                 # OpenAI client
│   │   └── prompts.ts                # System prompts for OpenAI
│   ├── pages/                        # Next.js Pages
│   │   ├── _app.tsx                  # Custom App component
│   │   ├── index.tsx                 # Home page
│   │   ├── workflow-discovery.tsx    # Workflow discovery page
│   │   ├── workflow-opportunities.tsx # AI opportunities page
│   │   └── api/                      # API routes
│   ├── types/                        # TypeScript type definitions
│   ├── utils/                        # Utility functions
│   └── styles/                       # CSS styles
```

## Key Workflows

1. **Workflow Discovery**:
   - User starts a new workflow discovery
   - System guides the user through mapping their workflow
   - User confirms the final workflow
   - System saves the workflow data

2. **AI Opportunities**:
   - User selects a mapped workflow
   - System analyzes the workflow using OpenAI
   - System presents automation opportunities in a table
   - User can select an opportunity to get implementation guidance

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 