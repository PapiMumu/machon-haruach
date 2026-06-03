import { DeviceEventEmitter } from "react-native";

export class ErrorHelper {

  static logEvent(_eventType: string, _source: string, _message: string) {
    //FirebaseAnalyticsHelper.trackEvent(eventType, { source, message });
  }


  static logError(_source: string, _message: string) {
    //FirebaseAnalyticsHelper.trackEvent("Error", { source, message });
  }

  static onJavaError(event: { source: string; message: string }) {
    ErrorHelper.logError(event.source, event.message);
  }

  static onJavaEvent(event: { eventType: string; source: string; message: string }) {
    ErrorHelper.logEvent(event.eventType, event.source, event.message);
  }

  static init() {
    ErrorHelper.initJava();
    ErrorHelper.initUnhandled();
  }

  static initJava() {
    DeviceEventEmitter.addListener("onError", ErrorHelper.onJavaError);
    DeviceEventEmitter.addListener("onEvent", ErrorHelper.onJavaEvent);
  }

  static initUnhandled() {
    try {
      const exceptionHandler = require("react-native-exception-handler") as {
        setJSExceptionHandler?: (handler: (error: Error) => void, allowInDevMode?: boolean) => void;
        setNativeExceptionHandler?: (
          handler: (exceptionString: string) => void,
          forceAppToQuit?: boolean,
          executeDefaultHandler?: boolean
        ) => void;
      };

      if (typeof exceptionHandler.setJSExceptionHandler === "function") {
        exceptionHandler.setJSExceptionHandler(error => {
          ErrorHelper.logError("Unhandled Javascript", error.toString());
        });
      }

      if (typeof exceptionHandler.setNativeExceptionHandler === "function") {
        exceptionHandler.setNativeExceptionHandler(
          (exceptionString: string) => {
            ErrorHelper.logError("Unhandled Native", exceptionString);
          },
          false,
          true
        );
      } else {
        console.log("[ErrorHelper] Native exception handler unavailable in this build; skipping.");
      }
    } catch (error) {
      console.log("[ErrorHelper] Failed to initialize exception handlers; skipping.", error);
    }
  }
}
