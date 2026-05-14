/* src/logs.js */

// Helper to tag user in Discord (<@ID>) or bold their name
const getUserTag = (data) => data.discordId ? `<@${data.discordId}>` : `**${data.user}**`;

// Helper for nicely formatted timestamps (Relative time: "2 minutes ago")
const getTimestamp = () => `<t:${Math.floor(Date.now() / 1000)}:R>`;

// Standardized Color Palette
const COLORS = {
  SUCCESS: 5763719,  // Green
  INFO: 3447003,     // Blue
  WARNING: 16776960, // Yellow
  DANGER: 15548997,  // Red
  PURPLE: 10181046,  // Purple
  GREY: 9807270      // Grey
};

export const LOG_CONFIG = {

  // ==========================================
  // AUTHENTICATION & ACCESS
  // ==========================================
  'LOGIN': {
    title: "🔐 Admin Access Granted", color: COLORS.INFO,
    build: (data) => ({
      description: `Authentication successful for ${getUserTag(data)}.`,
      fields: [
        { name: "👤 User Identity", value: `**${data.name || data.user}**`, inline: true },
        { name: "🛡️ Access Role", value: `\`${(data.role || 'Unknown').toUpperCase()}\``, inline: true },
        { name: "⏰ Time", value: getTimestamp(), inline: true }
      ]
    })
  },
  'LOGIN_FAILED': {
    title: "⚠️ Failed Login Attempt", color: COLORS.WARNING,
    build: (data) => ({
      description: `Someone attempted to log in but failed.`,
      fields: [
        { name: "👤 Attempted User ID", value: `\`${data.attemptedId || 'Unknown'}\``, inline: true },
        { name: "❓ Reason", value: `\`${data.reason || 'Invalid Credentials'}\``, inline: true }
      ]
    })
  },
  'LOGOUT': {
    title: "👋 Admin Logged Out", color: COLORS.GREY,
    build: (data) => ({
      description: `${getUserTag(data)} securely ended their session.`,
    })
  },

  // ==========================================
  // CORE SYSTEM & SETTINGS
  // ==========================================
  'SETTINGS_UPDATE': {
    title: "⚙️ System Configuration Modified", color: COLORS.WARNING,
    build: (data) => ({
      description: `**CRITICAL:** System settings were modified by ${getUserTag(data)}.`,
      fields: [{ name: "📝 Detailed Change Log", value: `\`\`\`diff\n${data.changes || "No specific details provided."}\n\`\`\`` }]
    })
  },
  'MAINTENANCE_TOGGLE': {
    title: "🛡️ Maintenance Mode Status Change", color: COLORS.DANGER,
    build: (data) => ({
      description: `System access status has been toggled by ${getUserTag(data)}.`,
      fields: [{ name: "🚦 New System Status", value: data.status === 'OFFLINE' ? "🔴 **LOCKED (Offline)**" : "🟢 **LIVE (Online)**" }]
    })
  },
  'SYSTEM_ALERT': {
    title: "🚨 System Data Action", color: COLORS.INFO,
    build: (data) => ({
      description: `System state modified.`,
      fields: [{ name: "📋 Action Details", value: `>>> ${data.message}` }]
    })
  },

  // ==========================================
  // STATION MANAGEMENT
  // ==========================================
  'STATION_CREATED': {
    title: "⛽ New Station Provisioned", color: COLORS.SUCCESS,
    build: (data) => ({
      description: `A new station has been added to the network by ${getUserTag(data)}.`,
      fields: [
        { name: "📍 Station Name", value: `**${data.name}**`, inline: true },
        { name: "🆔 Station ID", value: `\`${data.id}\``, inline: true },
        { name: "👨‍💼 Manager ID", value: `\`${data.manager}\``, inline: true }
      ]
    })
  },
  'STATION_UPDATED': {
    title: "📝 Station Details Updated", color: COLORS.WARNING,
    build: (data) => {
      const changeLog = Array.isArray(data.changes) ? data.changes.join('\n') : (data.changes || "- No detailed changes detected");
      return {
        description: `Configuration for **${data.name}** (\`${data.id}\`) was updated by ${getUserTag(data)}.`,
        fields: [{ name: "📋 Modification Report", value: `\`\`\`diff\n${changeLog}\n\`\`\`` }]
      };
    }
  },
  'STATION_DELETED': {
    title: "🗑️ Station Permanently Deleted", color: COLORS.DANGER,
    build: (data) => ({
      description: `**WARNING:** Station removed from database by ${getUserTag(data)}.`,
      fields: [
        { name: "🚫 Deleted ID", value: `\`${data.id}\``, inline: true },
        { name: "⏰ Time", value: getTimestamp(), inline: true }
      ]
    })
  },

  // ==========================================
  // SECURITY TEAM MANAGEMENT
  // ==========================================
  'TEAM_ADD': {
    title: "✅ Security Team Expanded", color: COLORS.SUCCESS,
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
    title: "👮 Team Member Modified", color: COLORS.WARNING,
    build: (data) => ({
      description: `Profile for **${data.name}** was updated by ${getUserTag(data)}.`,
      fields: [{ name: "📝 Changes Applied", value: `\`\`\`diff\n${data.changes}\n\`\`\`` }]
    })
  },
  'TEAM_REMOVE': {
    title: "🚫 Access Revoked", color: COLORS.DANGER,
    build: (data) => ({
      description: `**${data.name}** has been removed from the administration team.`,
      fields: [
        { name: "👤 Removed User", value: `**${data.name}**`, inline: true },
        { name: "❓ Reason", value: `\`${data.reason}\``, inline: true },
        { name: "👮 Action By", value: getUserTag(data) }
      ]
    })
  },

  // ==========================================
  // DATABASE ASSETS
  // ==========================================
  'ASSET_UPLOAD': {
    title: "📤 Database Asset Synced", color: COLORS.PURPLE,
    build: (data) => ({
      description: `New data asset uploaded by ${getUserTag(data)}.`,
      fields: [
        { name: "📂 Asset Key", value: `\`${data.key}\``, inline: true },
        { name: "🏷️ Operation", value: `\`${data.action}\``, inline: true }
      ]
    })
  },

  'BACKUP_EXPORTED': { 
    title: "📦 💾 CRITICAL SYSTEM BACKUP EXPORTED", color: COLORS.SUCCESS, 
    build: (data) => ({ 
      description: `A complete structural snapshot of the FuelMaster database was successfully generated and downloaded.`, 
      fields: [ 
        { name: "👤 Exported By", value: getUserTag(data), inline: true }, 
        { name: "📊 File Size", value: `\`${data.fileSize || 'Unknown'}\``, inline: true }, 
        { name: "🛡️ Security Notice", value: "This backup contains sensitive database information. Ensure it is stored securely.", inline: false }
      ]
    })
  },

  // ==========================================
  // GLOBAL BROADCASTS
  // ==========================================
  'BROADCAST_SENT': {
    title: "📢 Global Broadcast Dispatched", color: COLORS.PURPLE,
    build: (data) => ({
      description: `A notification was pushed to active clients by ${getUserTag(data)}.`,
      fields: [
        { name: "💬 Message Body", value: `>>> ${data.msg}` },
        { name: "🚨 Priority", value: `\`${(data.type || 'info').toUpperCase()}\``, inline: true }
      ]
    })
  },
  'BROADCAST_CLEARED': {
    title: "🔇 Broadcast Feed Cleared", color: COLORS.GREY,
    build: (data) => ({
      description: `The active global broadcast was manually cleared.`,
      fields: [{ name: "👤 Action By", value: getUserTag(data) }]
    })
  }
};

/**
 * Intelligent Log Dispatcher
 * Automatically detects the user's device/browser and appends it to the embed footer.
 */
export async function sendLog(webhookUrl, eventType, data = {}) {
  if (!webhookUrl) return;

  const config = LOG_CONFIG[eventType];
  if (!config) return console.error(`Unknown log type: ${eventType}`);

  // Build the specific embed structure based on the event
  const embedData = config.build ? config.build(data) : { description: "No details provided." };

  // --- DEVICE INTELLIGENCE ---
  // Try to grab basic browser/device info to track *how* changes are being made
  let deviceInfo = "FuelMaster Admin Interface";
  try {
     const ua = navigator.userAgent;
     let browser = "Unknown Browser";
     if(ua.includes("Chrome")) browser = "Chrome";
     else if(ua.includes("Firefox")) browser = "Firefox";
     else if(ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
     
     let os = "Unknown Device";
     if(ua.includes("Win")) os = "Windows";
     else if(ua.includes("Mac")) os = "MacOS / iOS";
     else if(ua.includes("Android")) os = "Android";
     else if(ua.includes("Linux")) os = "Linux";

     deviceInfo = `${os} • ${browser}`;
  } catch(e) { /* Ignore if running in non-browser context */ }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: config.title,
          color: config.color,
          ...embedData, 
          // Inject the intelligent device footprint into the footer
          footer: { text: `💻 Session: ${deviceInfo}` },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) {
    console.error("Log Error:", e);
  }
}