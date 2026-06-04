/**
 * Feature flag to temporarily enable/disable the WhatsApp Automation module.
 * 
 * To enable: Set WHATSAPP_MODULE_ENABLED=true in the .env file.
 * To disable: Set WHATSAPP_MODULE_ENABLED=false in the .env file.
 * 
 * Changing this configuration flag will automatically show/hide the WhatsApp
 * module throughout the application.
 */
export const WHATSAPP_MODULE_ENABLED = process.env.WHATSAPP_MODULE_ENABLED !== 'false';
