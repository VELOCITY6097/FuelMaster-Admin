/* logs.js - Centralized Discord Logging */

// Helper to tag user in Discord (<@ID>)
const getUserTag = (data) => data.discordId ? `<@${data.discordId}>` : `**${data.user}**`;

export const LOG_CONFIG = {
    // SYSTEM EVENTS
    'LOGIN': {
        title: "🔐 Admin Login",
        color: 3447003, // Blue
        template: (data) => `User: ${getUserTag(data)}\nRole: ${data.role}`
    },
    'SETTINGS_UPDATE': {
        title: "⚙️ System Config Changed",
        color: 16776960, // Yellow
        template: (data) => `**Admin:** ${getUserTag(data)}\n\n**DETAILED CHANGES:**\n${data.changes}`
    },
    
    // STATION EVENTS (Deeply Detailed)
    'STATION_CREATED': {
        title: "⛽ New Station Provisioned",
        color: 5763719, // Green
        template: (data) => `**Station:** ${data.name}\n**ID:** \`${data.id}\`\n**Manager:** ${data.manager}\n\n**Created By:** ${getUserTag(data)}`
    },
    'STATION_UPDATED': {
        title: "📝 Station Modified",
        color: 15105570, // Orange
        template: (data) => `**Station:** ${data.name} (${data.id})\n**Editor:** ${getUserTag(data)}\n\n**WHAT CHANGED:**\n${data.changes}`
    },
    'STATION_DELETED': {
        title: "🗑️ Station Deleted",
        color: 15548997, // Red
        template: (data) => `Station ID \`${data.id}\` was permanently deleted by ${getUserTag(data)}.`
    },

    // ASSET EVENTS
    'ASSET_UPLOAD': {
        title: "📤 Database Asset Updated",
        color: 10181046, // Purple
        template: (data) => `**Asset:** ${data.key}\n**Action:** ${data.action}\n**By:** ${getUserTag(data)}`
    },
    'ASSET_DELETE': {
        title: "❌ Database Asset Removed",
        color: 9807270, // Grey
        template: (data) => `**${data.key}** was removed from the database by ${getUserTag(data)}.`
    },

    // BROADCAST EVENTS
    'BROADCAST_SENT': {
        title: "📢 Global Broadcast Sent",
        color: 16729871, // Pink
        template: (data) => `**Sender:** ${getUserTag(data)}\n\n**Message:**\n"${data.msg}"\n\n**Type:** ${data.type}`
    },
    'BROADCAST_CLEARED': {
        title: "🔇 Broadcast Cleared",
        color: 9807270, // Grey
        template: (data) => `Global broadcast was cleared by ${getUserTag(data)}.`
    },
    'MAINTENANCE_TOGGLE': {
        title: "🛡️ Maintenance Mode Change",
        color: 15548997, // Red
        template: (data) => `**New Status:** ${data.status}\n**Action by:** ${getUserTag(data)}`
    },

    // TEAM EVENTS
    'TEAM_ADD': {
        title: "👤 Team Member Added",
        color: 5763719, // Green
        template: (data) => `**Name:** ${data.name}\n**Role:** ${data.role}\n**Added By:** ${getUserTag(data)}`
    },
    'TEAM_REMOVE': {
        title: "🚫 Team Member Removed",
        color: 15105570, // Orange
        template: (data) => `User removed by ${getUserTag(data)}.`
    }
};

export async function sendLog(webhookUrl, eventType, data) {
    if (!webhookUrl) return;
    const config = LOG_CONFIG[eventType];
    if (!config) return console.error(`Unknown log type: ${eventType}`);

    try {
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                embeds: [{
                    title: config.title,
                    description: config.template(data),
                    color: config.color,
                    footer: { text: "FuelMaster Admin & Logs System" },
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (e) { console.error("Log Error:", e); }
}
