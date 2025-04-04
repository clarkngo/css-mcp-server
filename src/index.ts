import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

// Initialize the server
export const server = new McpServer({
    name: "the-historian",
    version: "0.0.1",
    capabilities: {
        prompts: {},
        resources: {},
        tools: {},
    }
});

// Register prompts, resources, and tools
registerPrompts();
registerResources();
registerTools();

// Main entry point
async function main(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log(`The Historian MCP Server is running`);
}

main().catch((error: Error) => {
    console.error(error);
    process.exit(1);
});