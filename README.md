# Building a CSS Tutor MCP Server

This repository contains a simple Model Context Protocol (MCP) server built with Node.js and TypeScript. It acts as a "CSS Tutor," providing personalized updates about CSS features to a connected AI client. This guide walks you through how it was built, step by step.

This server demonstrates key MCP concepts: defining **Resources**, **Tools**, and **Prompts**.

## Prerequisites

*   Node.js (v18 or later recommended)
*   `npm` (or your preferred Node.js package manager like `yarn` or `pnpm`)
*   An AI client capable of connecting to an MCP server (e.g., the Claude desktop app)
*   An [OpenRouter API Key](https://openrouter.ai/) (for fetching live CSS updates via Perplexity)

## 1. Project Setup

First, clone the repository and install the dependencies:

```bash
git clone https://github.com/3mdistal/css-mcp-server.git
cd css-mcp-server
npm install # Or: yarn install / pnpm install
```

The key dependencies used are:

*   `@modelcontextprotocol/sdk`: The official TypeScript SDK for building MCP servers.
*   `dotenv`: To load API keys from a `.env` file.
*   `node-fetch`: To make HTTP requests to the OpenRouter API.
*   `zod`: For data validation (schemas for resource data and tool inputs).
*   `typescript`, `@types/node`, etc.: Standard TypeScript development tools.

## 2. Understanding MCP Concepts

Before diving into the code, let's briefly review the MCP components we'll build:

*   **Resource:** Represents data or state that the server manages. Our server will have one resource: `css_knowledge_memory`, representing which CSS concepts the user knows.
*   **Tool:** Represents an action the server can perform on behalf of the client AI. Our server will have three tools:
    *   `get_latest_updates`: Fetches recent CSS news.
    *   `read_from_memory`: Reads the user's knowledge state from the resource.
    *   `write_to_memory`: Updates the user's knowledge state.
*   **Prompt:** Provides guidance or instructions to the connected AI client on how to use the server's capabilities effectively. Our server will have one prompt: `css-tutor-guidance`.

## 3. Step-by-Step Implementation

We'll organize our code into `src/resources`, `src/tools`, and `src/prompts` directories, with an `index.ts` in each to handle registrations, plus the main server entry point `src/index.ts`.

### Step 3.1: Defining the Resource (`src/resources/index.ts`)

We need a way to store which CSS concepts the user knows. For this demo, we use a simple JSON file (`data/memory.json`) as our persistent storage.

**`data/memory.json` (Initial State):**

```json
{
  "user_id": "default_user",
  "known_concepts": {}
}
```
*(A default version of this file is included in the repository to ensure the server runs correctly out-of-the-box. Remember to keep `!data/memory.json` in your `.gitignore` if you modify it)*

**`src/resources/index.ts`:**

This file does several things:
1.  Defines a Zod schema (`MemorySchema`) to validate the structure of `memory.json`.
2.  Creates helper functions (`readMemory`, `writeMemory`) to safely read/write/validate the JSON file.
3.  Registers the `css_knowledge_memory` resource with the MCP server using `server.resource`.

```typescript
// src/resources/index.ts (Key parts)
import { server } from "../index.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
// ... other imports and path setup ...

// Path to the JSON file
const memoryFilePath = path.resolve(__dirname, '../../data/memory.json');

// Zod schema for validation
const MemorySchema = z.object({ /* ... schema definition ... */ });
export type MemoryData = z.infer<typeof MemorySchema>;

// Reads and validates data from memory.json
export async function readMemory(): Promise<MemoryData> { /* ... fs.readFile, JSON.parse, MemorySchema.parse ... */ }

// Validates and writes data to memory.json
export async function writeMemory(newData: MemoryData): Promise<void> { /* ... MemorySchema.parse, JSON.stringify, fs.writeFile ... */ }

// Registers the resource
function registerCssKnowledgeMemoryResource() {
    const resourceName = "css_knowledge_memory";
    const resourceUriBase = `memory://${resourceName}/`; // Custom URI scheme

    server.resource(
        resourceName,
        resourceUriBase,
        { read: true, write: true }, // Permissions
        async (uri: URL) => { // Read handler
            // Demo always reads the same file, ignoring specific URI path
            try {
                const memoryData = await readMemory();
                return { /* ... contents with JSON string ... */ };
            } catch (error) { /* ... error handling ... */ }
        }
    );
}

export function registerResources() {
    registerCssKnowledgeMemoryResource();
}
```
We use the `memory://` scheme as a conventional way to identify this internal server state.

### Step 3.2: Defining the Tools (`src/tools/index.ts`)

Tools define the actions the server can perform.

**`src/tools/index.ts`:**

This file registers our three tools:

1.  **`read_from_memory`**:
    *   Takes no input.
    *   Calls the `readMemory` function from `src/resources/index.ts`.
    *   Returns the memory data as a JSON string.

    ```typescript
    // Inside src/tools/index.ts
    import { readMemory /* ... */ } from "../resources/index.js";

    function registerReadFromMemoryTool() {
        server.tool(
            "read_from_memory",
            "Reads the user's current CSS knowledge from memory.",
            {}, // No input
            async () => {
                const memoryData = await readMemory();
                return { content: [{ type: "text", text: JSON.stringify(memoryData, null, 2) }] };
                // Error handling omitted for brevity
            }
        );
    }
    ```

2.  **`write_to_memory`**:
    *   Takes `concept` (string) and `known` (boolean) as input (defined using a Zod shape).
    *   Calls `readMemory` to get the current state.
    *   Updates the state in memory.
    *   Calls `writeMemory` to save the changes back to `data/memory.json`.
    *   Returns a success message.

    ```typescript
    // Inside src/tools/index.ts
    import { readMemory, writeMemory, MemoryData } from "../resources/index.js";
    import { z } from "zod";

    function registerWriteToMemoryTool() {
        const writeMemoryInputShape = {
            concept: z.string().describe("..."),
            known: z.boolean().describe("...")
        };
        server.tool(
            "write_to_memory",
            "Updates the user's CSS knowledge memory...",
            writeMemoryInputShape, // Input schema definition
            async (args) => {
                const { concept, known } = args;
                const currentMemory = await readMemory();
                const updatedMemory: MemoryData = { /* ... update logic ... */ };
                await writeMemory(updatedMemory);
                return { content: [{ type: "text", text: `Memory updated...` }] };
                // Error handling omitted for brevity
            }
        );
    }
    ```

3.  **`get_latest_updates`**:
    *   Takes no input.
    *   Requires `OPENROUTER_API_KEY` from the environment (`.env` file).
    *   Uses `node-fetch` to call the OpenRouter Chat Completions API (`https://openrouter.ai/api/v1/chat/completions`).
    *   Specifies the `perplexity/sonar-small-online` model to get up-to-date web information.
    *   Includes system and user messages to guide the Perplexity model.
    *   Parses the response and returns the AI-generated summary of CSS updates.

    ```typescript
    // Inside src/tools/index.ts
    import fetch from 'node-fetch';
    import dotenv from 'dotenv';
    dotenv.config();
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    function registerGetLatestUpdatesTool() {
        if (!openRouterApiKey) { /* ... handle missing key ... */ return; }
        server.tool(
            "get_latest_updates",
            "Fetches recent news and updates about CSS features...",
            {}, // No input
            async () => {
                const openRouterUrl = "...";
                const headers = { /* ... Authorization header ... */ };
                const body = JSON.stringify({
                    model: "perplexity/sonar-small-online",
                    messages: [ /* ... system and user prompts ... */ ]
                });
                const response = await fetch(openRouterUrl, { /* ... */ });
                // Check response.ok, parse JSON, extract content
                const data: any = await response.json();
                const assistantMessage = data.choices?.[0]?.message?.content;
                // Handle errors if extraction fails
                return { content: [{ type: "text", text: assistantMessage }] };
                // Error handling omitted for brevity
            }
        );
    }
    ```
Finally, an exported `registerTools` function calls the registration function for each tool.

### Step 3.3: Defining the Prompt (`src/prompts/index.ts`)

The prompt guides the AI client. We store the prompt text directly in the code for simplicity.

**`src/prompts/index.ts`:**

```typescript
import { server } from "../index.js";

// Static prompt text providing guidance to the AI client.
const cssTutorPromptText = `You are a helpful assistant connecting to a CSS knowledge server...
// ... (Full prompt text here) ...
`;

// Registers the static guidance prompt with the MCP server.
function registerCssTutorPrompt() {
    server.prompt(
        "css-tutor-guidance",
        "Provides guidance on how to use the CSS tutor tools and resources.",
        {}, // No input arguments
        async () => ({ // Handler returns the static text
            messages: [
                { role: "assistant", content: { type: "text", text: cssTutorPromptText } }
            ]
        })
    );
}

// Function called by src/index.ts to register all prompts for this server.
export function registerPrompts() {
    registerCssTutorPrompt();
}
```

### Step 3.4: Wiring it Together (`src/index.ts`)

This is the main entry point that initializes the server and connects everything.

**`src/index.ts`:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

// Initialize the MCP Server instance
export const server = new McpServer({
    name: "css-tutor",
    version: "0.0.1",
    capabilities: { prompts: {}, resources: {}, tools: {} } // Placeholders
});

// Load and register all defined prompts, resources, and tools
// This populates the capabilities declared above.
registerPrompts();
registerResources();
registerTools();

// Main entry point
async function main(): Promise<void> {
    // Use StdioServerTransport for communication over standard input/output
    const transport = new StdioServerTransport();
    // Connect the server logic to the transport
    await server.connect(transport);
}

// Start the server
main().catch((error: Error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
});
```
It imports the registration functions from the other `index.ts` files and calls them. It uses `StdioServerTransport`, meaning the client will communicate with this server via standard input/output when launched as a child process.

## 4. Configuration (`.env`)

The `get_latest_updates` tool requires an OpenRouter API key.

1.  Copy the example file: `cp .env.example .env`
2.  Edit the `.env` file and replace `YOUR_API_KEY_HERE` with your actual OpenRouter key:

    ```dotenv
    # .env
    OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxx
    ```
    The `.gitignore` file ensures your `.env` file (containing the secret key) is not accidentally committed to version control.

## 5. Building and Running

**Build:** Compile the TypeScript code to JavaScript:

```bash
npm run build # Or: yarn build / pnpm run build
```
This runs the `build` script defined in `package.json`, which executes `tsc` (the TypeScript compiler) and outputs the JavaScript files to the `build/` directory.

**Run:** Running an MCP server usually involves having an MCP client launch it. How you configure your specific client will vary, but you typically need to tell it the command to execute. For example, using the Claude desktop app, you might configure its `claude_desktop_config.json` like this:

```json
{
  "mcpServers": {
    "css-tutor": {
      "command": "node",
      "args": [
        "/full/path/to/your/css-mcp-server/build/index.js" // Use the absolute path
      ],
      "env": {
        // The client can inject environment variables like the API key
        "OPENROUTER_API_KEY": "sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```
*(Note: Providing the key via the client's `env` configuration is often preferred over relying solely on the `.env` file loaded by the server itself, especially in production scenarios.)*

Once configured, start the connection from your MCP client. The client will launch the `node build/index.js` process, and they will communicate over `stdio`. You can then interact with the CSS Tutor via your AI client!

## 6. Debugging with MCP Inspector

If you need to debug the server or inspect the raw JSON-RPC messages being exchanged, you can use the `@modelcontextprotocol/inspector` tool. This tool acts as a basic MCP client and launches your server, showing you the communication flow.

Run the inspector from your terminal in the project root:

```bash
npx @modelcontextprotocol/inspector node ./build/index.js
```

**Explanation:**

*   `npx @modelcontextprotocol/inspector`: Downloads (if needed) and runs the inspector package.
*   `node`: The command used to execute your server.
*   `./build/index.js`: The path (relative to your project root) to your compiled server entry point.

**Environment Variables for Inspector:**

Note that the inspector launches your server as a child process. If your server relies on environment variables (like `OPENROUTER_API_KEY` for the `get_latest_updates` tool), you need to ensure they are available in the environment where you run the `npx` command. The `.env` file might not be automatically loaded in this context. You can typically prefix the command:

```bash
# Example on Linux/macOS
OPENROUTER_API_KEY="sk-or-xxxxxxxxxx" npx @modelcontextprotocol/inspector node ./build/index.js

# Example on Windows (Command Prompt)
set OPENROUTER_API_KEY=sk-or-xxxxxxxxxx && npx @modelcontextprotocol/inspector node ./build/index.js

# Example on Windows (PowerShell)
$env:OPENROUTER_API_KEY="sk-or-xxxxxxxxxx"; npx @modelcontextprotocol/inspector node ./build/index.js
```

Replace `sk-or-xxxxxxxxxx` with your actual key.

## Conclusion

This guide demonstrates the core steps involved in creating a functional MCP server using the TypeScript SDK. We defined a resource to manage state, tools to perform actions (including interacting with an external API), and a prompt to guide the AI client. This provides a foundation for building more complex and capable MCP applications. 