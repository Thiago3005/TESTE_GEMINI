// google-genai-shim.ts
// Imports the actual GoogleGenerativeAI class and types from the specified CDN URL.
import {
    GoogleGenerativeAI as InternalGoogleGenerativeAI_SDK_CLASS,
    type GenerateContentResponse as InternalGenerateContentResponse,
    type Chat as InternalChat,
    // Add other types here if they need to be re-exported by the shim
    // and are specified to be imported from "@google/genai" in guidelines
    // For example:
    // type Part as InternalPart,
    // type Content as InternalContent,
} from 'https://esm.sh/@google/generative-ai@^0.24.1';

/**
 * The Google AI SDK for JS exports its main class as GoogleGenerativeAI.
 * The project guidelines mandate importing { GoogleGenAI } from "@google/genai".
 * This shim achieves that by assigning the imported class to a constant 
 * named GoogleGenAI and then exporting that constant.
 * It also re-exports types to be available under the "@google/genai" path
 * via the import map.
 */
export const GoogleGenAI = InternalGoogleGenerativeAI_SDK_CLASS; // Value export
export type GoogleGenAI = InstanceType<typeof InternalGoogleGenerativeAI_SDK_CLASS>; // Instance type export

// Re-export types so they can be imported like `import { GenerateContentResponse } from '@google/genai'`
export type GenerateContentResponse = InternalGenerateContentResponse;
export type Chat = InternalChat;
// export type Part = InternalPart; // Example if Part was needed
// export type Content = InternalContent; // Example if Content was needed