import { server } from "../index.js";
import { z } from "zod";
import fs from 'fs/promises'; // Use promises for async operations
import path from 'path';
import { fileURLToPath } from 'url';

// Derive __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Adjust path to go up one level from src/resources to the project root, then to data/
const memoryFilePath = path.resolve(__dirname, '../../data/memory.json');

// Zod schema for memory structure
const MemorySchema = z.object({
    user_id: z.string(),
    known_concepts: z.record(z.string(), z.boolean()) // Concept name -> known status
});

// Define a TypeScript type based on the schema
export type MemoryData = z.infer<typeof MemorySchema>;

// Function to read memory from the JSON file
export async function readMemory(): Promise<MemoryData> {
    try {
        const data = await fs.readFile(memoryFilePath, 'utf-8');
        const jsonData = JSON.parse(data);
        // Validate the parsed data against the schema
        return MemorySchema.parse(jsonData);
    } catch (error) {
        console.error("Error reading or parsing memory file:", error);
        // In a real app, might return a default structure or handle specific errors
        throw new Error(`Failed to read/parse memory file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Function to write memory to the JSON file
export async function writeMemory(newData: MemoryData): Promise<void> {
    try {
        // Validate the data before writing
        MemorySchema.parse(newData);
        const dataString = JSON.stringify(newData, null, 2); // Pretty print JSON
        await fs.writeFile(memoryFilePath, dataString, 'utf-8');
    } catch (error) {
        console.error("Error validating or writing memory file:", error);
        throw new Error(`Failed to validate/write memory file: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// Function to register the resource with the MCP server
function registerCssKnowledgeMemoryResource() {
    const resourceName = "css_knowledge_memory";
    // Define a base URI for this resource type
    const resourceUriBase = `memory://${resourceName}/`;

    server.resource(
        resourceName,
        resourceUriBase, // Use a base URI; specific user could be part of the path
        { // Define permissions for this resource
            read: true, // Allows reading the resource state
            write: true // Allows tools to modify the resource state
            // Note: The server SDK and client capabilities determine actual enforcement
        },
        async (uri: URL) => { // Handler fetches the current state
            // For this demo, we ignore the specific URI path and always read the single file
            // In a multi-user scenario, uri.pathname might determine which user's data to load
            console.log(`Resource request for: ${uri.toString()}`); // Log the request
            try {
                const memoryData = await readMemory();
                return {
                    // Contents should be an array
                    contents: [{
                        uri: uri.toString(), // Echo back the specific URI requested
                        mimeType: "application/json",
                        // Return the memory data as a JSON string
                        text: JSON.stringify(memoryData)
                    }]
                };
            } catch (error) {
                console.error(`Error handling resource request for ${uri}:`, error);
                // Rethrow the error to be handled by the server framework
                throw error;
            }
        }
    );
    console.log(`Registered resource: ${resourceName} with base URI ${resourceUriBase}`);
}

// Main function to register all resources for this server
export function registerResources() {
    // Register the new CSS knowledge memory resource
    registerCssKnowledgeMemoryResource();
}