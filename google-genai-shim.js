// google-genai-shim.js
// Imports the actual GoogleGenerativeAI class from the specified CDN URL.
import { GoogleGenerativeAI as InternalGoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@^0.24.1';

/**
 * The Google AI SDK for JS exports its main class as GoogleGenerativeAI.
 * The project guidelines mandate importing { GoogleGenAI } from "@google/genai".
 * This shim achieves that by assigning the imported class to a constant 
 * named GoogleGenAI and then exporting that constant.
 * This file should be the compiled output of google-genai-shim.ts.
 */
const GoogleGenAI = InternalGoogleGenerativeAI;

export { GoogleGenAI };
