/** Set VITE_SUC_MODE=1 to white-label as Solo Unicorn Club. */
export const SUC_MODE = import.meta.env.VITE_SUC_MODE === "1";
export const APP_NAME = SUC_MODE ? "Solo Unicorn Club" : "Paperclip";
