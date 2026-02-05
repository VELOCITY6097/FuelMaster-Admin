/* --- SUPABASE CONFIGURATION & IMPORTS --- */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ REPLACE THESE WITH YOUR FREE SUPABASE PROJECT CREDENTIALS ⚠️
const SUPABASE_URL = 'https://hmfuxypluzozbwoleqnn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mP-3LuhOE7uXLOV5t4IrBg_WWvUUmmb';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CONSTANTS ---
const BOSS_PHONE = "9875345863"; // Kept for reference in admin table logic
const ROLES = {
    OWNER: 'Owner',
    MODERATOR: 'Moderator',
    STAFF: 'Staff'
};

let currentUser = null;
let currentStations = [];
let currentAdmins = [];
let ALLOWED_TANK_TYPES = []; 
let GLOBAL_WEBHOOK_URL = "";

// Track previous states to control webhook spam
let PREV_WEBHOOK_URL = "";
let PREV_BROADCAST_MSG = "";

/* --- INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', async () => {
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('en-US', dateOpts);

    // 1. Check for Saved Credentials (Remember Me)
    checkRememberMe();

    // 2. Check for Active Session
    const savedUser = localStorage.getItem('fm_user');
    if (savedUser) {
        verifySession(JSON.parse(savedUser));
    }

    await loadSystemConfig();
});

/* --- UI HELPERS: NOTIFICATIONS & DIALOGS --- */
window.showAlert = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = `toast show ${type === 'error' ? 'error' : 'success'}`;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
};

let confirmCallback = null;
window.showConfirm = function(message, callback) {
    document.getElementById('confirmMessage').innerText = message;
    document.getElementById('confirmModal').style.display = 'flex';
    confirmCallback = callback;
};

window.closeConfirm = function(result) {
    document.getElementById('confirmModal').style.display = 'none';
    if (result && confirmCallback) confirmCallback();
    confirmCallback = null;
};

document.getElementById('btnConfirmAction').addEventListener('click', () => closeConfirm(true));

/* --- NEW FEATURE: TOGGLE PASSWORD --- */
window.togglePassword = function() {
    const passInput = document.getElementById('loginPin');
    const iconShow = document.getElementById('iconShow');
    const iconHide = document.getElementById('iconHide');

    if (passInput.type === "password") {
        passInput.type = "text";
        iconShow.style.display = 'none';
        iconHide.style.display = 'block';
    } else {
        passInput.type = "password";
        iconShow.style.display = 'block';
        iconHide.style.display = 'none';
    }
};

/* --- NEW FEATURE: REMEMBER ME --- */
function checkRememberMe() {
    const savedId = localStorage.getItem('fm_saved_id');
    const savedPin = localStorage.getItem('fm_saved_pin');
    
    if (savedId && savedPin) {
        document.getElementById('loginId').value = savedId;
        document.getElementById('loginPin').value = savedPin;
        document.getElementById('rememberMe').checked = true;
    }
}

/* --- SYSTEM CONFIG --- */
async function loadSystemConfig() {
    try {
        const { data: tankData } = await supabase.from('tank_configs').select('type_name');
        if (tankData && tankData.length > 0) {
            ALLOWED_TANK_TYPES = tankData.map(item => item.type_name);
        } else {
            ALLOWED_TANK_TYPES = ['MS_15KL', 'HSD_20KL'];
        }

        const { data: settingsData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
        if (settingsData) {
            GLOBAL_WEBHOOK_URL = settingsData.webhook_url || "";
            PREV_WEBHOOK_URL = GLOBAL_WEBHOOK_URL; // Initial Cache
            PREV_BROADCAST_MSG = settingsData.broadcast_msg || "";

            const webhookInput = document.getElementById('webhookUrl');
            if(webhookInput) webhookInput.value = GLOBAL_WEBHOOK_URL;
            
            const downtimeToggle = document.getElementById('downtimeToggle');
            if(downtimeToggle) downtimeToggle.checked = settingsData.downtime_active;
            
            // Populate Broadcast Fields
            const noticeInput = document.getElementById('globalNotice');
            if(noticeInput) noticeInput.value = settingsData.broadcast_msg || "";
            const typeInput = document.getElementById('noticeType');
            if(typeInput) typeInput.value = settingsData.broadcast_type || "info";

            updateStatusUI(settingsData.downtime_active);
        }
    } catch (e) { console.error("Config Error:", e); }
}

function updateStatusUI(isDown) {
    const statusEl = document.querySelector('.status-ok');
    if (statusEl) {
        statusEl.innerText = isDown ? "Maintenance Mode" : "Online";
        statusEl.style.color = isDown ? "#ef4444" : "#10b981";
    }
}

/* --- AUTHENTICATION & RBAC --- */
async function verifySession(userObj) {
    completeLogin(userObj);
}

window.handleLogin = async function(e) {
    e.preventDefault();
    const id = document.getElementById('loginId').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    const btn = document.getElementById('loginBtn');
    const originalBtnText = btn.innerHTML;

    if (!id || !pin) return showAlert("Please enter both ID and PIN.", "error");

    btn.innerHTML = '<span>Verifying...</span>';
    btn.disabled = true;

    // SECURE LOGIN: Check against Supabase 'admins' table
    try {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('phone', id)
            .eq('pin', pin) 
            .single();

        if (error || !data) {
            // This handles incorrect PINs or IDs safely without revealing details
            showAlert("Access Denied: Invalid Credentials.", "error");
        } else {
            handleSuccess(data, rememberMe, id, pin);
        }
    } catch (err) {
        showAlert("Connection Error: " + err.message, "error");
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
};

function handleSuccess(user, remember, id, pin) {
    // 1. Session Storage
    localStorage.setItem('fm_user', JSON.stringify(user));

    // 2. Remember Me Logic
    if (remember) {
        localStorage.setItem('fm_saved_id', id);
        localStorage.setItem('fm_saved_pin', pin);
    } else {
        localStorage.removeItem('fm_saved_id');
        localStorage.removeItem('fm_saved_pin');
    }

    completeLogin(user);
}

function completeLogin(user) {
    currentUser = user;
    document.getElementById('displayUsername').innerText = user.name;
    document.getElementById('displayRole').innerText = user.role;
    document.getElementById('userAvatar').innerText = user.name.substring(0,2).toUpperCase();

    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'flex';
    
    applyRolePermissions();

    if(window.lucide) lucide.createIcons();
    initRealtimeListeners();
}

function applyRolePermissions() {
    const role = currentUser.role;
    const isOwner = role === ROLES.OWNER;
    const isMod = role === ROLES.MODERATOR; 
    
    // 1. Settings Access
    const settingsBtn = document.querySelector('#view-settings button');
    const webhookInput = document.getElementById('webhookUrl');
    const hasSettingsAccess = isOwner || isMod;

    if (webhookInput) webhookInput.disabled = !hasSettingsAccess;
    // Don't disable the entire view button, just internal inputs
    
    // 2. User Management
    const addAdminBtn = document.querySelector('#view-team .primary-btn');
    if (addAdminBtn) addAdminBtn.style.display = isOwner ? 'flex' : 'none';
}

window.logout = function() {
    localStorage.removeItem('fm_user');
    window.location.reload();
};

/* --- REAL-TIME UPDATES --- */
function initRealtimeListeners() {
    fetchStations();
    fetchAdmins();

    // Instant UI updates via Subscription
    supabase.channel('stations-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, () => fetchStations()).subscribe();
    supabase.channel('admins-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => fetchAdmins()).subscribe();
    
    supabase.channel('settings-changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, payload => {
        if(payload.new) {
            GLOBAL_WEBHOOK_URL = payload.new.webhook_url;
            updateStatusUI(payload.new.downtime_active);
            
            const toggle = document.getElementById('downtimeToggle');
            if(toggle) toggle.checked = payload.new.downtime_active;
            
            // Sync local inputs if updated remotely to avoid stale data
            const noticeInput = document.getElementById('globalNotice');
            if(noticeInput && document.activeElement !== noticeInput) noticeInput.value = payload.new.broadcast_msg || "";
            
            // Update cache to avoid redundant alerts
            PREV_WEBHOOK_URL = payload.new.webhook_url;
            PREV_BROADCAST_MSG = payload.new.broadcast_msg;
        }
    }).subscribe();
}

/* --- CRUD OPERATIONS --- */

// 1. STATIONS
async function fetchStations() {
    const { data, error } = await supabase.from('stations').select('*').order('created_at', { ascending: false });
    if (!error) {
        currentStations = data;
        document.getElementById('stat-stations').innerText = data.length;
        renderStations(data);
    }
}

window.saveStation = async function() {
    const id = document.getElementById('stId').value; 
    const name = document.getElementById('stName').value;
    const user = document.getElementById('stUser').value;
    const pass = document.getElementById('stPass').value;
    
    const tankRows = document.querySelectorAll('.tank-row-item');
    let tanks = [];
    let isValid = true;

    tankRows.forEach(row => {
        const n = row.querySelector('.t-name').value;
        const type = row.querySelector('.t-type').value;
        if (n && type && ALLOWED_TANK_TYPES.includes(type)) {
            tanks.push({ name: n, type: type, currentVolume: 0 });
        } else {
            isValid = false;
        }
    });

    if (!name || !user || !pass) return showAlert("All fields are required.", "error");
    if (!isValid || tanks.length === 0) return showAlert("Invalid Tank Configuration.", "error");

    const stationData = {
        name: name,
        location: document.getElementById('stNotes').value,
        theme: document.getElementById('stTheme').value,
        manager_user: user,
        manager_pass: pass,
        tanks: tanks 
    };

    let error;
    
    if (id) {
        const res = await supabase.from('stations').update(stationData).eq('station_id', id);
        error = res.error;
        if(!error) sendDiscordEmbed("Station Updated", `Station **${name}** was updated by ${currentUser.name} (${currentUser.role}).`, 3447003); 
    } else {
        stationData.station_id = "ST-" + Math.floor(Math.random() * 10000);
        stationData.created_at = new Date().toISOString(); 
        const res = await supabase.from('stations').insert([stationData]);
        error = res.error;
        if(!error) sendDiscordEmbed("New Station Created", `Station **${name}** created by ${currentUser.name} (${currentUser.role}).`, 5763719); 
    }
    
    if (error) {
        showAlert(error.message, "error");
    } else {
        window.closeModal('stationModal');
        showAlert("Station Saved Successfully!");
        fetchStations();
    }
};

window.deleteStation = function(id) {
    if (currentUser.role === ROLES.STAFF) {
        return showAlert("ACCESS DENIED: Staff members cannot delete stations.", "error");
    }

    showConfirm("Permanently delete this station? This cannot be undone.", async () => {
        const { error } = await supabase.from('stations').delete().eq('station_id', id);
        if (error) showAlert(error.message, "error");
        else {
            showAlert("Station deleted.");
            fetchStations(); 
            sendDiscordEmbed("Station Deleted", `Station ID **${id}** deleted by ${currentUser.name}.`, 15548997); 
        }
    });
};

window.renderStations = function(stations = currentStations) {
    const container = document.getElementById('stations-grid');
    const search = document.getElementById('stationSearch').value.toLowerCase();
    
    const filterTheme = document.getElementById('filterTheme').value;
    const sortDate = document.getElementById('sortDate').value;

    container.innerHTML = '';

    let filtered = stations.filter(st => {
        const matchesSearch = (st.name && st.name.toLowerCase().includes(search)) || (st.station_id && st.station_id.toLowerCase().includes(search));
        const matchesTheme = filterTheme === 'all' || st.theme === filterTheme;
        return matchesSearch && matchesTheme;
    });

    filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return sortDate === 'newest' ? dateB - dateA : dateA - dateB;
    });

    const canDelete = currentUser.role !== ROLES.STAFF;

    filtered.forEach(st => {
        const card = document.createElement('div');
        card.className = `station-card theme-${st.theme}`;
        card.innerHTML = `
            <div class="station-header">
                <div>
                    <h3>${st.name}</h3>
                    <p style="font-size:0.8rem; color:var(--text-muted)">${st.location || 'No Location'}</p>
                </div>
                <span class="badge-theme">${st.theme}</span>
            </div>
            <div class="station-body">
                <p><strong>ID:</strong> ${st.station_id}</p>
                <p><strong>Mgr:</strong> ${st.manager_user}</p>
                <p style="margin-top:8px; font-size:0.85rem; color:var(--text-muted)">
                    <strong>Tanks:</strong> ${(st.tanks || []).map(t => `${t.name} (${t.type})`).join(', ')}
                </p>
                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="secondary-btn" style="padding:6px 12px; font-size:0.8rem" onclick="editStation('${st.station_id}')">Edit</button>
                    ${canDelete ? `<button class="secondary-btn" style="padding:6px 12px; font-size:0.8rem; color:#ef4444;" onclick="deleteStation('${st.station_id}')">Delete</button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

// 2. ADMINS
async function fetchAdmins() {
    const { data, error } = await supabase.from('admins').select('*');
    if (!error) {
        currentAdmins = data;
        document.getElementById('stat-admins').innerText = data.length;
        renderAdmins(data);
    }
}

window.addSuperAdmin = async function() {
    if (currentUser.role !== ROLES.OWNER) {
        return showAlert("ACCESS DENIED: Only the Boss can add users.", "error");
    }

    const name = document.getElementById('newAdminName').value;
    const phone = document.getElementById('newAdminPhone').value;
    const discord = document.getElementById('newAdminDiscord').value;
    const role = document.getElementById('newAdminRole').value;
    const pin = document.getElementById('newAdminPin').value;
    
    if (!name || !phone || !pin) return showAlert("Name, Phone and PIN are required.", "error");

    const { error } = await supabase.from('admins').insert([{
        name, phone, discord, pin, role
    }]);

    if (error) showAlert(error.message, "error");
    else {
        window.closeModal('adminModal');
        showAlert("User added successfully.");
        sendDiscordEmbed("Team Member Added", `**${name}** added as **${role}** by Boss.`, 5763719);
        fetchAdmins();
    }
};

window.removeAdmin = function(id) {
    if (currentUser.role !== ROLES.OWNER) {
        return showAlert("ACCESS DENIED: Only the Boss can remove users.", "error");
    }

    showConfirm("Remove access for this user?", async () => {
        await supabase.from('admins').delete().eq('id', id); 
        showAlert("User removed.");
        fetchAdmins(); 
        sendDiscordEmbed("Team Member Removed", `User removed by Boss.`, 15105570); 
    });
};

window.renderAdmins = function(admins = currentAdmins) {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '';
    
    const isOwner = currentUser.role === ROLES.OWNER;

    admins.forEach(admin => {
        const isTargetBoss = admin.phone === BOSS_PHONE;
        const showDelete = isOwner && !isTargetBoss;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div style="font-weight:600">${admin.name}</div></td>
            <td>${admin.phone}</td>
            <td><span style="font-weight:bold; color:${isTargetBoss?'#92400e':'#475569'}">${admin.role || 'Admin'}</span></td>
            <td>${admin.discord || '-'}</td>
            <td>${showDelete ? `<button class="close-btn" onclick="removeAdmin('${admin.id}')"><i data-lucide="trash"></i></button>` : ''}</td>
        `;
        tbody.appendChild(tr);
    });
    if(window.lucide) lucide.createIcons();
};

/* --- SYSTEM SETTINGS & BROADCASTS (UPDATED) --- */
window.saveSettings = async function() {
    if (currentUser.role === ROLES.STAFF) {
        return showAlert("ACCESS DENIED: Staff cannot modify settings.", "error");
    }

    // 1. Get Values
    const newUrl = document.getElementById('webhookUrl').value.trim();
    const noticeMsg = document.getElementById('globalNotice').value.trim();
    const noticeType = document.getElementById('noticeType').value;

    const updateData = {
        id: 1,
        webhook_url: newUrl,
        broadcast_msg: noticeMsg,
        broadcast_type: noticeType
    };

    const { error } = await supabase.from('system_settings').upsert(updateData);
    
    if(error) {
        showAlert(error.message, "error");
    } else {
        showAlert("System Settings & Broadcast Saved.");

        // SMART LOGIC: Only notify about URL if it actually changed
        if (newUrl !== PREV_WEBHOOK_URL) {
            GLOBAL_WEBHOOK_URL = newUrl; 
            sendDiscordEmbed("System Config Updated", `Webhook URL updated by ${currentUser.name}.`, 3447003);
            PREV_WEBHOOK_URL = newUrl;
        } else {
            // URL didn't change, proceed with Broadcast notification logic
            GLOBAL_WEBHOOK_URL = newUrl; 
        }

        // Notify about Broadcast (if changed or resent)
        // Note: We typically notify on every explicit 'Push' action for broadcasts
        const title = noticeMsg ? "📢 New Global Broadcast" : "🔇 Broadcast Cleared";
        const color = noticeMsg ? 16776960 : 9807270; // Yellow vs Grey
        sendDiscordEmbed(title, `Message: "${noticeMsg || 'None'}"\nType: ${noticeType}\nUpdated by: ${currentUser.name}`, color);
        
        PREV_BROADCAST_MSG = noticeMsg;
    }
};

window.toggleDowntimeMode = function() {
    const isDown = document.getElementById('downtimeToggle').checked;

    if (currentUser.role === ROLES.STAFF) {
        showAlert("ACCESS DENIED: Staff cannot toggle Maintenance Mode.", "error");
        document.getElementById('downtimeToggle').checked = !isDown; 
        return;
    }
    
    const msg = isDown ? "Activate Maintenance Mode? (Logs out all clients)" : "Go Online?";
    
    showConfirm(msg, async () => {
        const { error } = await supabase.from('system_settings').upsert({ id: 1, downtime_active: isDown });

        if(error) {
            showAlert("Failed to update status.", "error");
            document.getElementById('downtimeToggle').checked = !isDown;
        } else {
            sendDiscordEmbed("System Status Change", isDown ? "⚠️ **MAINTENANCE MODE ACTIVATED**" : "✅ **SYSTEM ONLINE**", isDown ? 15548997 : 5763719);
            updateStatusUI(isDown); 
        }
    });
};

/* --- NEW FEATURE: DATABASE ASSET MANAGEMENT (From upload.html) --- */

window.uploadAsset = async function(type) {
    if (currentUser.role === ROLES.STAFF) {
        return showAlert("ACCESS DENIED: Staff cannot update system assets.", "error");
    }

    let inputId = type === 'density' ? 'densityInput' : 'chartsInput';
    let rawContent = document.getElementById(inputId).value;
    let dataToUpload = null;
    let dbKey = type === 'density' ? 'density_table' : 'tank_charts';

    if (!rawContent.trim()) {
        return showAlert("Please paste the JS content first.", "error");
    }

    try {
        if (type === 'density') {
            // Logic to parse densityData.js (removes 'const densityTable =' and parses object)
            const cleanDensity = rawContent.replace(/const\s+densityTable\s*=\s*/, '').replace(/;\s*$/, '');
            dataToUpload = new Function('return ' + cleanDensity)();
        } else {
            // Logic to parse charts.js (removes 'export' and captures exports)
            const fakeScope = {};
            const scriptContent = rawContent.replace(/export\s+const/g, 'exports.');
            new Function('exports', scriptContent)(fakeScope);
            dataToUpload = fakeScope;
        }

        if (!dataToUpload) throw new Error("Parsed data is empty");

        const { error } = await supabase.from('system_assets').upsert({
            key: dbKey,
            data: dataToUpload
        });

        if (error) throw error;

        showAlert(`✅ ${type === 'density' ? 'Density Data' : 'Charts'} updated successfully!`);
        sendDiscordEmbed("System Asset Updated", `**${dbKey}** was updated by ${currentUser.name}.`, 5763719);

    } catch (err) {
        console.error(err);
        showAlert("Parsing Error: " + err.message, "error");
    }
};

window.deleteAsset = function(dbKey) {
    if (currentUser.role === ROLES.STAFF) {
        return showAlert("ACCESS DENIED: Staff cannot delete system assets.", "error");
    }

    showConfirm(`⚠️ remove the asset '${dbKey}'? This will break client calculators until re-uploaded.`, async () => {
        const { error } = await supabase.from('system_assets').delete().eq('key', dbKey);
        
        if (error) {
            showAlert(error.message, "error");
        } else {
            showAlert("Asset removed from database.");
            sendDiscordEmbed("System Asset Deleted", `**${dbKey}** was REMOVED by ${currentUser.name}.`, 15548997);
            
            // Clear the input box to reflect the reset
            if(dbKey === 'density_table') document.getElementById('densityInput').value = '';
            if(dbKey === 'tank_charts') document.getElementById('chartsInput').value = '';
        }
    });
};

/* --- DISCORD WEBHOOKS (EMBED FORMAT) --- */
async function sendDiscordEmbed(title, description, color) {
    if (GLOBAL_WEBHOOK_URL) {
        const payload = {
            embeds: [{
                title: title,
                description: description,
                color: color,
                footer: { text: "FuelMaster Admin System" },
                timestamp: new Date().toISOString()
            }]
        };
        try {
            await fetch(GLOBAL_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (e) { console.error("Webhook Failed:", e); }
    }
}

/* --- UI HELPERS --- */
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
};

window.addTankRow = function(name = "", type = "") {
    const list = document.getElementById('tank-list');
    const div = document.createElement('div');
    div.className = 'tank-row-item';
    
    let options = `<option value="" disabled ${!type ? 'selected' : ''}>Select Config</option>`;
    ALLOWED_TANK_TYPES.forEach(t => {
        options += `<option value="${t}" ${type === t ? 'selected' : ''}>${t}</option>`;
    });

    div.innerHTML = `
        <input type="text" placeholder="Tank Name" class="t-name" style="flex:1" value="${name}" autocomplete="off">
        <select class="t-type" style="flex:1; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--input-bg); color:var(--text-main)">
            ${options}
        </select>
        <button class="close-btn" onclick="this.parentElement.remove()"><i data-lucide="trash-2"></i></button>
    `;
    list.appendChild(div);
    if(window.lucide) lucide.createIcons(); 
};

window.editStation = function(stationId) {
    const station = currentStations.find(s => s.station_id === stationId);
    if (!station) return;

    document.getElementById('stId').value = station.station_id;
    document.getElementById('stName').value = station.name;
    document.getElementById('stTheme').value = station.theme;
    document.getElementById('stNotes').value = station.location || '';
    document.getElementById('stUser').value = station.manager_user;
    document.getElementById('stPass').value = station.manager_pass;

    const list = document.getElementById('tank-list');
    list.innerHTML = ''; 
    if (station.tanks && Array.isArray(station.tanks)) {
        station.tanks.forEach(tank => {
            addTankRow(tank.name, tank.type);
        });
    }

    document.getElementById('stationModalTitle').innerText = "Edit Station";
    document.getElementById('btnSaveStation').innerText = "Update Station";
    document.getElementById('stationModal').style.display = 'flex';
};

window.openStationModal = function() {
    document.getElementById('stId').value = ''; 
    document.getElementById('stName').value = '';
    document.getElementById('stNotes').value = '';
    document.getElementById('stUser').value = '';
    document.getElementById('stPass').value = '';
    document.getElementById('tank-list').innerHTML = '';
    
    document.getElementById('stationModalTitle').innerText = "Add New Station";
    document.getElementById('btnSaveStation').innerText = "Create Station";
    
    addTankRow(); 
    document.getElementById('stationModal').style.display = 'flex';
};

window.openModal = function(id) { document.getElementById(id).style.display = 'flex'; };
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };
window.switchTab = function(tabId) {
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');
};
window.toggleDarkMode = function() { document.body.classList.toggle('dark-mode'); if(window.lucide) lucide.createIcons(); };
