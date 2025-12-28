/**
 * WhatsApp Notification Utility
 * 
 * Supports multiple methods:
 * 1. Fonnte API (Recommended - easiest)
 * 2. WA Gateway API 
 * 3. WhatsApp Business API
 * 4. Custom webhook
 */

const axios = require('axios');

// Configuration - Change these based on your WhatsApp provider
const WHATSAPP_CONFIG = {
    // Method: 'fonnte', 'wagateway', 'business', 'webhook'
    method: process.env.WA_METHOD || 'fonnte',
    
    // Fonnte Configuration (https://fonnte.com)
    fonnte: {
        token: process.env.FONNTE_TOKEN || 'YOUR_FONNTE_TOKEN',
        target: process.env.WA_GROUP_ID || '6281234567890-1234567890@g.us' // Group ID
    },
    
    // WA Gateway Configuration
    wagateway: {
        apiUrl: process.env.WA_API_URL || 'https://api.wagateway.com/send',
        apiKey: process.env.WA_API_KEY || 'YOUR_API_KEY',
        groupId: process.env.WA_GROUP_ID || '120363021234567890@g.us'
    },
    
    // WhatsApp Business API
    business: {
        phoneNumberId: process.env.WA_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID',
        accessToken: process.env.WA_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
        groupId: process.env.WA_GROUP_ID || '120363021234567890@g.us'
    },
    
    // Custom Webhook
    webhook: {
        url: process.env.WA_WEBHOOK_URL || 'https://your-webhook-url.com/send',
        secret: process.env.WA_WEBHOOK_SECRET || 'YOUR_SECRET'
    }
};

/**
 * Format check-in message
 */
function formatCheckInMessage(data) {
    const { memberName, memberRole, checkInTime, method, location } = data;
    
    const methodEmoji = method === 'qr' ? '🎫' : '👤';
    const methodText = method === 'qr' ? 'QR Code' : 'Face Detection';
    
    const message = `
✅ *ABSEN MASUK - LURUNG ANGKERS*

👤 *${memberName}* sudah absen!
📋 Jabatan: ${memberRole}
⏰ Waktu: ${checkInTime}
${methodEmoji} Metode: ${methodText}
📍 Lokasi: ${location}

_Sistem Check-in Otomatis_
    `.trim();
    
    return message;
}

/**
 * Send via Fonnte API
 * Website: https://fonnte.com
 * Free tier: 100 messages/day
 */
async function sendViaFonnte(message) {
    try {
        const response = await axios.post('https://api.fonnte.com/send', {
            target: WHATSAPP_CONFIG.fonnte.target,
            message: message,
            countryCode: '62' // Indonesia
        }, {
            headers: {
                'Authorization': WHATSAPP_CONFIG.fonnte.token
            }
        });
        
        return { success: true, response: response.data };
    } catch (error) {
        throw new Error(`Fonnte error: ${error.message}`);
    }
}

/**
 * Send via WA Gateway
 * You can use services like:
 * - https://wagateway.com
 * - https://wappin.id
 * - https://watzap.id
 */
async function sendViaWAGateway(message) {
    try {
        const response = await axios.post(WHATSAPP_CONFIG.wagateway.apiUrl, {
            api_key: WHATSAPP_CONFIG.wagateway.apiKey,
            receiver: WHATSAPP_CONFIG.wagateway.groupId,
            data: {
                message: message
            }
        });
        
        return { success: true, response: response.data };
    } catch (error) {
        throw new Error(`WA Gateway error: ${error.message}`);
    }
}

/**
 * Send via WhatsApp Business API
 * Official Meta/Facebook WhatsApp Business API
 */
async function sendViaBusinessAPI(message) {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v17.0/${WHATSAPP_CONFIG.business.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: WHATSAPP_CONFIG.business.groupId,
                type: 'text',
                text: {
                    body: message
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_CONFIG.business.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return { success: true, response: response.data };
    } catch (error) {
        throw new Error(`Business API error: ${error.message}`);
    }
}

/**
 * Send via Custom Webhook
 * For custom integrations with your own WhatsApp bot
 */
async function sendViaWebhook(message) {
    try {
        const response = await axios.post(WHATSAPP_CONFIG.webhook.url, {
            secret: WHATSAPP_CONFIG.webhook.secret,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        return { success: true, response: response.data };
    } catch (error) {
        throw new Error(`Webhook error: ${error.message}`);
    }
}

/**
 * Main function to send WhatsApp notification
 * Automatically selects the configured method
 */
async function sendWhatsAppNotification(data) {
    // Skip if not enabled
    if (process.env.WA_NOTIFICATIONS_ENABLED === 'false') {
        console.log('WhatsApp notifications disabled');
        return { success: false, message: 'Notifications disabled' };
    }
    
    const message = formatCheckInMessage(data);
    
    console.log('\n🔔 Sending WhatsApp notification...');
    console.log('Method:', WHATSAPP_CONFIG.method);
    console.log('Message:', message);
    
    try {
        let result;
        
        switch (WHATSAPP_CONFIG.method) {
            case 'fonnte':
                result = await sendViaFonnte(message);
                break;
                
            case 'wagateway':
                result = await sendViaWAGateway(message);
                break;
                
            case 'business':
                result = await sendViaBusinessAPI(message);
                break;
                
            case 'webhook':
                result = await sendViaWebhook(message);
                break;
                
            default:
                throw new Error(`Unknown method: ${WHATSAPP_CONFIG.method}`);
        }
        
        console.log('✅ Notification sent successfully!');
        return result;
        
    } catch (error) {
        console.error('❌ WhatsApp notification error:', error.message);
        
        // Don't throw error - we don't want to fail check-in if notification fails
        return { success: false, error: error.message };
    }
}

/**
 * Test function - send test message
 */
async function sendTestNotification() {
    return await sendWhatsAppNotification({
        memberName: 'Test User',
        memberRole: 'Member',
        checkInTime: new Date().toLocaleTimeString('id-ID'),
        method: 'face',
        location: 'Test Location'
    });
}

module.exports = {
    sendWhatsAppNotification,
    sendTestNotification,
    formatCheckInMessage
};
