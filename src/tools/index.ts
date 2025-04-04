import { server } from "../index.js";
import { z } from "zod";
import { readMemory, writeMemory, MemoryData } from "../resources/index.js"; // Import resource functions and type
import fetch from 'node-fetch'; // Import node-fetch
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

// 1. Read from Memory Tool
function registerReadFromMemoryTool() {
    server.tool(
        "read_from_memory",
        "Reads the user's current CSS knowledge from memory.",
        {}, // No input parameters needed
        async () => {
            try {
                const memoryData = await readMemory();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(memoryData, null, 2)
                    }]
                };
            } catch (error) {
                console.error("Error in read_from_memory tool:", error);
                // Re-throw the error for the framework to handle
                throw error;
            }
        }
    );
}

// 2. Write to Memory Tool
function registerWriteToMemoryTool() {
    const writeMemoryInputShape = {
        concept: z.string().describe("The CSS concept name (e.g., 'Flexbox')"),
        known: z.boolean().describe("Whether the user knows this concept (true/false)")
    };
    // Define the schema using z.object, but pass the shape below
    const WriteMemoryInputSchema = z.object(writeMemoryInputShape);

    server.tool(
        "write_to_memory",
        "Updates the user's CSS knowledge memory for a specific concept.",
        // Pass the raw shape, not the ZodObject instance
        writeMemoryInputShape,
        async (args) => { // args will be automatically typed based on the shape
            // Validate input using the schema if needed (SDK might do this automatically)
            // const { concept, known } = WriteMemoryInputSchema.parse(args);
            const { concept, known } = args; // Assuming SDK handles validation based on shape
            try {
                const currentMemory = await readMemory();
                const updatedMemory: MemoryData = {
                    ...currentMemory,
                    known_concepts: {
                        ...currentMemory.known_concepts,
                        [concept]: known
                    }
                };
                await writeMemory(updatedMemory);
                return {
                    content: [{
                        type: "text",
                        text: `Memory updated successfully for concept: ${concept}`
                    }]
                };
            } catch (error) {
                console.error("Error in write_to_memory tool:", error);
                // Re-throw the error
                throw error;
            }
        }
    );
}

// 3. Get Latest CSS Updates Tool
function registerGetLatestUpdatesTool() {
    if (!openRouterApiKey) {
        console.warn("OPENROUTER_API_KEY not found in environment variables. 'get_latest_updates' tool will not be available.");
        return; // Don't register the tool if the API key is missing
    }

    server.tool(
        "get_latest_updates",
        "Fetches recent news and updates about CSS features using Perplexity Sonar via OpenRouter.",
        {}, // No input parameters needed
        async () => {
            const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
            const headers = {
                "Authorization": `Bearer ${openRouterApiKey}`,
                "Content-Type": "application/json"
            };
            const body = JSON.stringify({
                model: "perplexity/sonar-pro", // Or whichever model you want to use
                messages: [
                    { role: "system", content: "You are an AI assistant specialized in finding the latest CSS news and updates. Summarize the key recent developments." },
                    { role: "user", content: "What are the most important recent updates or newly released features in CSS? Focus on things developers should be aware of in the last few months." }
                ]
            });

            try {
                const response = await fetch(openRouterUrl, {
                    method: 'POST',
                    headers: headers,
                    body: body
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data: any = await response.json();
                const assistantMessage = data.choices?.[0]?.message?.content;

                if (!assistantMessage) {
                    console.error("Invalid response structure from OpenRouter:", data);
                    // Throw an error instead of returning custom error structure
                    throw new Error("Could not extract assistant message from OpenRouter response.");
                }

                return {
                    content: [{
                        type: "text",
                        text: assistantMessage
                    }]
                };
            } catch (error) {
                console.error("Error in get_latest_updates tool:", error);
                // Re-throw the error
                throw error;
            }
        }
    );
}

// Register all tools
export function registerTools() {
    registerReadFromMemoryTool();
    registerWriteToMemoryTool();
    registerGetLatestUpdatesTool();
}