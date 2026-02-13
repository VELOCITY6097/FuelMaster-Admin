/* src/logs.js */

// Helper to tag user in Discord (<@ID>) or bold their name
const getUserTag = (data) => data.discordId ? `<@${data.discordId}>` : `**${data.user}**`;

// Helper for nicely formatted timestamps (Relative time: "2 minutes ago")
const getTimestamp = () => `<t:${Math.floor(Date.now() / 1000)}:R>`;

export const LOG_CONFIG = {
    // --- SYSTEM ACCESS ---
    'LOGIN': {
        title: "🔐 Admin Access Granted",
        color: 3447003, // Blue
        build: (data) => ({
            description: `Authentication successful for ${getUserTag(data)}.`,
            fields: [
                { name: "👤 User Identity", value: `**${data.name || data.user}**`, inline: true },
                { name: "🛡️ Access Role", value: `\`${(data.role || 'Unknown').toUpperCase()}\``, inline: true },
                { name: "⏰ Time", value: getTimestamp(), inline: true }
            ]
        })
    },

    // --- CONFIGURATION ---
    'SETTINGS_UPDATE': {
        title: "⚙️ System Configuration Modified",
        color: 16776960, // Yellow
        build: (data) => ({
            description: `**CRITICAL:** System settings were modified by ${getUserTag(data)}.`,
            fields: [
                { name: "📝 Detailed Change Log", value: `\`\`\`diff\n${data.changes || "No specific details provided."}\n\`\`\`` }
            ]
        })
    },
    'MAINTENANCE_TOGGLE': {
        title: "🛡️ Maintenance Mode Status Change",
        color: 15548997, // Red
        build: (data) => ({
            description: `System access status has been toggled by ${getUserTag(data)}.`,
            fields: [
                { name: "🚦 New System Status", value: data.status === 'OFFLINE' ? "🔴 **LOCKED (Offline)**" : "🟢 **LIVE (Online)**" }
            ]
        })
    },

    // --- STATION MANAGEMENT ---
    'STATION_CREATED': {
        title: "⛽ New Station Provisioned",
        color: 5763719, // Green
        build: (data) => ({
            description: `A new station has been added to the network by ${getUserTag(data)}.`,
            fields: [
                { name: "📍 Station Name", value: `**${data.name}**`, inline: true },
                { name: "🆔 Station ID", value: `\`${data.id}\``, inline: true },
                { name: "👨‍💼 Manager", value: `\`${data.manager}\``, inline: true }
            ]
        })
    },
    'STATION_UPDATED': {
        title: "📝 Station Details Updated",
        color: 15105570, // Orange
        build: (data) => {
            const changeLog = Array.isArray(data.changes) 
                ? data.changes.join('\n') 
                : (data.changes || "- No detailed changes detected");

            return {
                description: `Configuration for **${data.name}** (\`${data.id}\`) was updated by ${getUserTag(data)}.`,
                fields: [
                    { 
                        name: "📋 Modification Report", 
                        value: `\`\`\`diff\n${changeLog}\n\`\`\`` 
                    }
                ]
            };
        }
    },
    'STATION_DELETED': {
        title: "🗑️ Station Permanently Deleted",
        color: 15548997, // Red
        build: (data) => ({
            description: `**WARNING:** Station removed from database by ${getUserTag(data)}.`,
            fields: [
                { name: "🚫 Deleted ID", value: `\`${data.id}\``, inline: true },
                { name: "⏰ Time", value: getTimestamp(), inline: true }
            ]
        })
    },

    // --- TEAM & SECURITY (UPDATED) ---
    'TEAM_ADD': {
        title: "✅ Security Team Expanded",
        color: 5763719, // Green
        build: (data) => ({
            description: `**${data.name}** has been added to the team by ${getUserTag(data)}.`,
            fields: [
                { name: "👤 Member Name", value: `**${data.name}**`, inline: true },
                { name: "🆔 Discord Tag", value: data.targetDiscord ? `<@${data.targetDiscord}>` : "`Not Linked`", inline: true },
                { name: "🛡️ Assigned Role", value: `\`${data.role}\``, inline: true }
            ]
        })
    },
    'TEAM_UPDATED': {
        title: "👮 Team Member Modified",
        color: 16776960, // Yellow/Orange
        build: (data) => ({
            description: `Profile for **${data.name}** was updated by ${getUserTag(data)}.`,
            fields: [
                { name: "📝 Changes Applied", value: `\`\`\`diff\n${data.changes}\n\`\`\`` }
            ]
        })
    },
    'TEAM_REMOVE': {
        title: "🚫 Access Revoked",
        color: 15548997, // Red
        build: (data) => ({
            description: `**${data.name}** has been removed from the administration team.`,
            fields: [
                { name: "👤 Removed User", value: `**${data.name}**` },
                { name: "🆔 Discord Tag", value: data.targetDiscord ? `<@${data.targetDiscord}>` : "`N/A`" },
                { name: "❓ Reason", value: `\`${data.reason}\`` }, // <--- ADD THIS LINE
                { name: "👮 Action By", value: getUserTag(data) }
            ]
        })
    },

    // --- ASSETS ---
    'ASSET_UPLOAD': {
        title: "📤 Database Asset Synced",
        color: 10181046, // Purple
        build: (data) => ({
            description: `New data asset uploaded by ${getUserTag(data)}.`,
            fields: [
                { name: "📂 Asset Key", value: `\`${data.key}\``, inline: true },
                { name: "🏷️ Operation", value: `\`${data.action}\``, inline: true }
            ]
        })
    },
    'ASSET_DELETE': {
        title: "❌ Database Asset Pruned",
        color: 9807270, // Grey
        build: (data) => ({
            description: `Data asset removed by ${getUserTag(data)}.`,
            fields: [
                { name: "📂 Target Key", value: `\`${data.key}\`` }
            ]
        })
    },

    // --- BROADCASTS ---
    'BROADCAST_SENT': {
        title: "📢 Global Broadcast Dispatched",
        color: 16729871, // Pink
        build: (data) => ({
            description: `A notification was pushed to active clients by ${getUserTag(data)}.`,
            fields: [
                { name: "🔔 Headline", value: `**${data.title || 'General Announcement'}**` },
                { name: "💬 Message Body", value: `>>> ${data.msg}` },
                { name: "🚨 Priority", value: `\`${(data.type || 'info').toUpperCase()}\``, inline: true }
            ]
        })
    },
    'BROADCAST_CLEARED': {
        title: "🔇 Broadcast Feed Cleared",
        color: 9807270, // Grey
        build: (data) => ({
            description: `The active global broadcast was manually cleared.`,
            fields: [
                 { name: "👤 Action By", value: getUserTag(data) }
            ]
        })
    }
};

export async function sendLog(webhookUrl, eventType, data) {
    if (!webhookUrl) return;
    const config = LOG_CONFIG[eventType];
    if (!config) return console.error(`Unknown log type: ${eventType}`);

    // Determine if we are using the new 'build' system (Objects/Fields) 
    // or the old 'template' system (Strings).
    const embedData = config.build 
        ? config.build(data) 
        : { description: config.template ? config.template(data) : "No details provided." };

    try {
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                embeds: [{
                    title: config.title,
                    color: config.color,
                    ...embedData, // Spreads 'description', 'fields', etc. into the embed object
                    footer: { text: "FuelMaster Admin System" },
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (e) { console.error("Log Error:", e); }
}