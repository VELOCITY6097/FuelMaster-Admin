// Import Supabase Client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- PASTE YOUR SUPABASE KEYS HERE ---
const SUPABASE_URL = 'https://hmfuxypluzozbwoleqnn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mP-3LuhOE7uXLOV5t4IrBg_WWvUUmmb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Brand Icons for Discord Logs
const BRAND_ICONS = {
    bpcl: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Bharat_Petroleum_Logo.svg/1200px-Bharat_Petroleum_Logo.svg.png",
    iocl: "https://upload.wikimedia.org/wikipedia/en/thumb/6/62/Indian_Oil_Corporation_Logo.svg/1200px-Indian_Oil_Corporation_Logo.svg.png",
    hpcl: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Hindustan_Petroleum_Logo.svg/1200px-Hindustan_Petroleum_Logo.svg.png",
    jio: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Jio_logo.png/600px-Jio_logo.png",
    default: "https://cdn-icons-png.flaticon.com/512/9131/9131546.png"
};

export async function sendDiscordLog(action, details, adminName, discordId, brand = 'default') {
    try {
        const { data } = await supabase.from('settings').select('discord_webhook').eq('id', 'global').single();
        if (!data || !data.discord_webhook) return;

        const userTag = discordId ? `<@${discordId}>` : "";
        const contentMsg = (action.includes("Deleted") || action.includes("Downtime")) 
            ? `${userTag} **ADMIN ALERT**` 
            : "";

        await fetch(data.discord_webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "FuelMaster Audit",
                content: contentMsg,
                embeds: [{
                    title: action,
                    description: details,
                    color: action.includes("Deleted") ? 15158332 : 3447003,
                    thumbnail: { url: BRAND_ICONS[brand] || BRAND_ICONS['default'] },
                    fields: [
                        { name: "👨‍✈️ Admin", value: adminName || "Unknown", inline: true },
                        { name: "🕒 Time", value: new Date().toLocaleString(), inline: true }
                    ],
                    footer: { text: "Secure System Log (Supabase)" }
                }]
            })
        });
    } catch (e) { console.error("Discord Log Error", e); }
}