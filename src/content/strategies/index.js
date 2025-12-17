/**
 * Strategy Registry - Central registry for all AI platform strategies
 * 
 * To add support for a new AI platform:
 * 1. Create a new strategy file (e.g., claude.js) extending BaseStrategy
 * 2. Add a new entry to the STRATEGIES array below
 * 3. Update manifest.json to include the new domain in matches and host_permissions
 * 
 * That's it! The strategy will be automatically loaded when the user visits the platform.
 */

import { GeminiStrategy } from './gemini.js';
import { ChatGPTStrategy } from './chatgpt.js';
import { AIStudioStrategy } from './ai-studio.js';

/**
 * Strategy configuration array
 * Each entry contains:
 * - pattern: RegExp to match against window.location.hostname
 * - Strategy: The strategy class to instantiate
 * - name: Human-readable name (for logging)
 */
const STRATEGIES = [
    {
        pattern: /gemini\.google\.com/,
        Strategy: GeminiStrategy,
        name: 'Gemini'
    },
    {
        pattern: /chatgpt\.com|chat\.openai\.com/,
        Strategy: ChatGPTStrategy,
        name: 'ChatGPT'
    },
    {
        pattern: /aistudio\.google\.com/,
        Strategy: AIStudioStrategy,
        name: 'AI Studio'
    },
    // ========== Add new platforms below ==========
    // Example:
    // {
    //     pattern: /claude\.ai/,
    //     Strategy: ClaudeStrategy,
    //     name: 'Claude'
    // },
    // {
    //     pattern: /poe\.com/,
    //     Strategy: PoeStrategy,
    //     name: 'Poe'
    // },
    // {
    //     pattern: /grok\.x\.ai|x\.com/,
    //     Strategy: GrokStrategy,
    //     name: 'Grok'
    // },
];

/**
 * Get the appropriate strategy for the current hostname
 * @param {string} hostname - The hostname to match (e.g., 'gemini.google.com')
 * @returns {BaseStrategy|null} - The strategy instance or null if no match
 */
export function getStrategyForHost(hostname) {
    for (const { pattern, Strategy, name } of STRATEGIES) {
        if (pattern.test(hostname)) {
            console.log(`Thoughtful Voice: Matched ${name} strategy for ${hostname}`);
            return new Strategy();
        }
    }

    console.log(`Thoughtful Voice: No strategy found for ${hostname}`);
    return null;
}

/**
 * Get list of all supported platforms (for UI display)
 * @returns {string[]} - Array of platform names
 */
export function getSupportedPlatforms() {
    return STRATEGIES.map(s => s.name);
}

/**
 * Check if a URL is supported
 * @param {string} url - Full URL to check
 * @returns {boolean}
 */
export function isUrlSupported(url) {
    try {
        const hostname = new URL(url).hostname;
        return STRATEGIES.some(({ pattern }) => pattern.test(hostname));
    } catch {
        return false;
    }
}
