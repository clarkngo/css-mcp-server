import { server } from "../index.js";
import { z } from "zod";

function registerRandomCityResource() {
    server.resource(
        "random-city",
        "random-city://current",
        async (uri: URL) => ({
            contents: [{
                uri: uri.toString(),
                mimeType: "text/plain",
                text: "Chicago" // This would be randomly selected in a real implementation
            }]
        })
    );
}

function registerRandomYearResource() {
    server.resource(
        "random-year",
        "random-year://current",
        async (uri: URL) => ({
            contents: [{
                uri: uri.toString(),
                mimeType: "text/plain",
                text: "1871" // This would be randomly selected in a real implementation
            }]
        })
    );
}

function registerHistoricalEventsResource() {
    server.resource(
        "historical-events",
        "historical-events://chicago/1871", // We'll use a static URI for now
        async (uri: URL) => {
            try {
                // In a real implementation, this would parse the URI to get city and year
                // and fetch actual historical events
                return {
                    contents: [{
                        uri: uri.toString(),
                        mimeType: "application/json",
                        text: JSON.stringify({
                            city: "Chicago",
                            year: 1871,
                            events: [
                                {
                                    title: "The Great Chicago Fire",
                                    date: "October 8-10, 1871",
                                    description: "A major conflagration that burned from October 8-10, 1871"
                                }
                            ]
                        }, null, 2)
                    }]
                };
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to fetch historical events: ${errorMessage}`);
            }
        }
    );
}

export function registerResources() {
    registerRandomCityResource();
    registerRandomYearResource();
    registerHistoricalEventsResource();
}