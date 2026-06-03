import serverlessExpress from "@codegenie/serverless-express";

// Import Environment from the shared helpers
import { Environment } from "./dist/shared/helpers/Environment.js";

// Import the app creator
import { createApp } from "./dist/app.js";

// Import socket and timer handlers
import { handleSocket } from "./dist/lambda/socket-handler.js";
import { handle15MinTimer, handleMidnightTimer, handleScheduledTasks } from "./dist/lambda/timer-handler.js";

// Initialize environment and database pools
const initializeEnvironment = async () => {
  if (!Environment.currentEnvironment) {
    const stage = process.env.STAGE || process.env.ENVIRONMENT || "dev";
    console.log("Initializing environment with stage:", stage);
    console.log("Environment variables:", {
      STAGE: process.env.STAGE,
      ENVIRONMENT: process.env.ENVIRONMENT,
      APP_ENV: process.env.APP_ENV
    });
    await Environment.init(stage);
    console.log("Environment initialized, connection strings loaded");

    // Pools now auto-initialize on first use
  }
};

// Cache the handler
let cachedHandler;

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

/** API Gateway paths include the stage prefix (e.g. /staging/test). */
function normalizeApiPath(event) {
  const raw = event?.path || event?.rawPath || "";
  return raw.replace(/\/+$/, "") || "/";
}

function isHealthPath(path) {
  return path === "/test" || path === "/health" || path.endsWith("/test") || path.endsWith("/health");
}

// Web handler for HTTP requests
export const web = async function (event, context) {
  try {
    const path = normalizeApiPath(event);
    console.log("Web handler invoked");
    console.log("Event httpMethod:", event.httpMethod);
    console.log("Event path:", path);

    // No database — confirms Lambda + API Gateway wiring (use after deploy).
    if (isHealthPath(path)) {
      const hasMembershipConn = Boolean((process.env.MEMBERSHIP_CONNECTION_STRING || "").trim());
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Lambda is working",
          path,
          method: event.httpMethod,
          stage: process.env.STAGE,
          hasMembershipConnectionString: hasMembershipConn,
          time: new Date().toISOString()
        })
      };
    }

    // Test POST request handling
    if ((path === "/test-post" || path.endsWith("/test-post")) && event.httpMethod === "POST") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: "POST request received",
          body: event.body,
          headers: event.headers,
          method: event.httpMethod,
          time: new Date().toISOString()
        })
      };
    }

    // Test Express app routing without database
    if (path === "/api/test" || path.endsWith("/api/test")) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: "API routing working",
          path: event.path,
          method: event.httpMethod,
          modules: ["membership", "attendance", "content", "giving", "messaging", "doing"],
          time: new Date().toISOString()
        })
      };
    }

    // Ensure environment is initialized before creating the app
    await initializeEnvironment();

    // Initialize the handler only once
    if (!cachedHandler) {
      console.log("Creating Express app with fully initialized environment...");
      const app = await createApp();
      console.log("Express app created");

      cachedHandler = serverlessExpress({
        app,
        binarySettings: {
          contentTypes: ["application/octet-stream", "font/*", "image/*", "application/pdf"]
        }
      });
      console.log("Serverless Express handler created");
    }

    const result = await cachedHandler(event, context);
    return result;
  } catch (error) {
    console.error("Error in web handler:", error);
    console.error("Error stack:", error.stack);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH"
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
        stack: process.env.STAGE === "demo" ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// WebSocket handler
export const socket = async function (event, context) {
  try {
    await initializeEnvironment();
    return await handleSocket(event, context);
  } catch (error) {
    console.error("Error in socket handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Socket handler error" })
    };
  }
};

// Timer handlers
export const timer15Min = async function (event, context) {
  try {
    await initializeEnvironment();
    await handle15MinTimer(event, context);
    return { statusCode: 200, body: "Timer executed successfully" };
  } catch (error) {
    console.error("Error in 15-minute timer:", error);
    throw error;
  }
};

export const timerMidnight = async function (event, context) {
  try {
    await initializeEnvironment();
    await handleMidnightTimer(event, context);
    return { statusCode: 200, body: "Timer executed successfully" };
  } catch (error) {
    console.error("Error in midnight timer:", error);
    throw error;
  }
};

export const timerScheduledTasks = async function (event, context) {
  try {
    await initializeEnvironment();
    await handleScheduledTasks(event, context);
    return { statusCode: 200, body: "Scheduled tasks executed successfully" };
  } catch (error) {
    console.error("Error in scheduled tasks timer:", error);
    throw error;
  }
};
