import { messageRouter } from "../../messaging/messageRouter";
import { initializeListeners } from "./listeners";
import { setupHandlers } from "./messaging/handlers";

// Initialize message router
messageRouter();

// Start all listeners
initializeListeners();

// Set up message handlers
setupHandlers();
