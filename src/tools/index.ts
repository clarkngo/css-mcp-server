import { server } from "../index.js";
import { z } from "zod";

function registerHistorianHelloTool() {
    server.tool(
        "historian-hello",
        "Say hello from the Historian.",
        { message: z.string() },
        async ({ message }) => ({
            content: [{
                type: "text",
                text: `Egbert the Historian says: ${message}`
            }]
        })
    );
}

function registerGetRandomCityTool() {
    server.tool(
        "get-random-city",
        "Get a random city from the database.",
        async () => ({
            content: [{
                type: "text",
                text: "Chicago"
            }]
        })
    );
}

function registerGetRandomYearTool() {
    server.tool(
        "get-random-year",
        "Get a random year from the database.",
        async () => ({
            content: [{
                type: "text",
                text: "1920"
            }]
        })
    );
}



export function registerTools() {
    registerHistorianHelloTool();
    registerGetRandomCityTool();
    registerGetRandomYearTool();
}