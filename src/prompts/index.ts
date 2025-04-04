import { server } from "../index.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Remove zod import if no longer needed
// import { z } from "zod";

// Derive __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function registerCssTutorPrompt() {
    // Construct the absolute path to the prompt file
    const promptFilePath = path.resolve(__dirname, 'css_updater_prompt.txt');
    try {
        const promptText = fs.readFileSync(promptFilePath, 'utf-8');
        server.prompt(
            "css-tutor-guidance",
            "Provides guidance on how to use the CSS tutor tools and resources.",
            {}, // No input schema needed for a static prompt
            async () => ({ // Simple handler returning the static prompt content
                messages: [
                    {
                        role: "assistant", // System prompt not supported yet in MCP
                        content: {
                            type: "text",
                            text: promptText
                        }
                    }
                ]
            })
        );
    } catch (error) {
        console.error(`Error reading prompt file ${promptFilePath}:`, error);
        // Handle error appropriately, maybe throw or register a default prompt
    }
}

export function registerPrompts() {
    // registerHistorianStoryPrompt(); // Remove old prompt registration
    registerCssTutorPrompt(); // Register the new CSS tutor prompt
}