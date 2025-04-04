# Building a CSS Tutor MCP Server

This repository contains a simple Model Context Protocol (MCP) server built with Node.js and TypeScript. It acts as a "CSS Tutor," providing personalized updates about CSS features to a connected AI client.

This server demonstrates key MCP concepts: defining **Resources**, **Tools**, and **Prompts**.

## Prerequisites

*   Node.js (v18 or later recommended)
*   `npm` (or your preferred Node.js package manager like `yarn` or `pnpm`)
*   An AI client capable of connecting to an MCP server (e.g., the Claude desktop app)
*   An [OpenRouter API Key](https://openrouter.ai/) (for fetching live CSS updates via Perplexity)

## Quick Start

Follow these steps to get the server running quickly:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/3mdistal/css-mcp-server.git
    cd css-mcp-server
    ```

2.  **Install Dependencies:**
    ```bash
    npm install # Or: yarn install / pnpm install
    ```

3.  **Configure API Key:** The `get_latest_updates` tool requires an OpenRouter API key. You have two main options:

    *   **Option A (Using `.env` file):** Copy the example file and add your key. The server will load this when it starts.
        ```bash
        cp .env.example .env
        # Now edit the .env file and add your OPENROUTER_API_KEY
        ```
    *   **Option B (Client Configuration):** Configure your MCP client to pass the API key as an environment variable when it launches the server. This is often preferred, especially if you run multiple servers or deploy elsewhere. (See client configuration example below).

4.  **Build the Server:** Compile the TypeScript code.
    ```bash
    npm run build # Or: yarn build / pnpm run build
    ```

5.  **Configure Your MCP Client:** Tell your client how to launch the server. Here's an example for the Claude desktop app's `claude_desktop_config.json`:

    ```json
    {
      "mcpServers": {
        "css-tutor": {
          "command": "node",
          "args": [
            "/full/path/to/your/css-mcp-server/build/index.js" // Use the ABSOLUTE path
          ],
          "env": {
            // Provide the API key here if using Option B above
            "OPENROUTER_API_KEY": "sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxx"
          }
        }
      }
    }
    ```
    *(Ensure the path in `args` is the correct **absolute path** to the built `index.js` file on your system.)*

6.  **Connect:** Start the connection from your MCP client. The client will launch the server process, and you can start interacting!

## Understanding the Code

This section provides a higher-level overview of how the server is implemented.

### MCP Concepts Used

*   **Resource (`css_knowledge_memory`):** Represents the user's known CSS concepts, stored persistently in `data/memory.json`.
*   **Tools:** Actions the server can perform:
    *   `get_latest_updates`: Fetches CSS news from OpenRouter/Perplexity.
    *   `read_from_memory`: Reads the content of the `css_knowledge_memory` resource.
    *   `write_to_memory`: Modifies the `css_knowledge_memory` resource.
*   **Prompt (`css-tutor-guidance`):** Static instructions guiding the AI client on how to interact with the tools and resource effectively.

### Code Structure

The code is organized as follows:

*   **`data/memory.json`**: A simple JSON file acting as the database for known CSS concepts. A default version is included in the repo.
*   **`src/resources/index.ts`**: Defines the `css_knowledge_memory` resource. It includes:
    *   A Zod schema for validating the data.
    *   `readMemory` and `writeMemory` functions for file I/O.
    *   Registration using `server.resource`, specifying the `memory://` URI scheme and read/write permissions. The read handler returns the content of `data/memory.json`.
*   **`src/tools/index.ts`**: Defines the three tools using `server.tool`:
    *   `read_from_memory`: Calls `readMemory`.
    *   `write_to_memory`: Takes `concept` and `known` as input (schema defined with Zod), uses `readMemory` and `writeMemory` to update the JSON file.
    *   `get_latest_updates`: Requires `OPENROUTER_API_KEY`, calls the OpenRouter API using `node-fetch` and the `perplexity/sonar-small-online` model, returns the AI-generated summary.
*   **`src/prompts/index.ts`**: Defines the static `css-tutor-guidance` prompt using `server.prompt`. The prompt text is embedded directly in the code.
*   **`src/index.ts`**: The main server entry point.
    *   Initializes the `McpServer` instance from `@modelcontextprotocol/sdk`.
    *   Imports and calls the `registerPrompts`, `registerResources`, and `registerTools` functions from the other modules.
    *   Uses `StdioServerTransport` to handle communication over standard input/output.
    *   Connects the server to the transport and includes basic error handling.
*   **`package.json`**: Defines dependencies (`@modelcontextprotocol/sdk`, `dotenv`, `node-fetch`, `zod`) and the `build` script (`tsc`).
*   **`.env.example` / `.env`**: Used for storing the `OPENROUTER_API_KEY` (if using Option A for configuration).
*   **`.gitignore`**: Configured to ignore `node_modules`, `build`, `.env`, and the contents of `data/` except for the default `data/memory.json`.
*   **`tsconfig.json`**: Standard TypeScript configuration.

## Debugging with MCP Inspector

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