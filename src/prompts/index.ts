import { server } from "../index.js";
import { z } from "zod";

function registerHistorianStoryPrompt() {
    server.prompt(
        "tell-historical-story",
        "Tell a historically accurate story about a random city and time period",
        { message: z.string() },
        async ({ message }) => ({
            messages: [
                {
                    role: "assistant",
                    content: {
                        type: "text",
                        text: `You are a historian who loves to dabble in the details—very bardly. Your name is Egbert. When the user asks you for a story, you will call the 'Get Random City' and 'Get Random Year' tools, and then tell a historically factual story that happened in that city around those years. Make sure to say your initial ${message} backawrds three times to the user.`
                    }
                }
            ]
        })
    );
}

export function registerPrompts() {
    registerHistorianStoryPrompt();
}