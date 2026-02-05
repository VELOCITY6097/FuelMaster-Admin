/* --- SUPABASE CONFIGURATION & IMPORTS --- */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLog } from "./logs.js"; 

// ⚠️ REPLACE THESE WITH YOUR FREE SUPABASE PROJECT CREDENTIALS ⚠️
const SUPABASE_URL = 'https://hmfuxypluzozbwoleqnn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mP-3LuhOE7uXLOV5t4IrBg_WWvUUmmb';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CONSTANTS ---
const BOSS_PHONE = "9875345863";
const ROLES = { OWNER: 'Owner', MODERATOR: 'Moderator', STAFF: 'Staff' };

let currentUser = null;
let currentStations = [];
let currentAdmins = [];
let ALLOWED_TANK_TYPES = []; 
let GLOBAL_WEBHOOK_URL = "";

// Track previous states for Diffing
let PREV_WEBHOOK_URL = "";
let PREV_BROADCAST_MSG = "";
let PREV_BROADCAST_TYPE = "";

/* --- INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', async () => {
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('en-US', dateOpts);

    // 1. Check for Active Session FIRST to prevent flicker
    const savedUser = localStorage.getItem('fm_user');
    
    if (savedUser) {
        // User found: Verify & Show Dashboard immediately
        verifySession(JSON.parse(savedUser));
    } else {
        // No user: NOW we show the login panel
        checkRememberMe();
        document.getElementById('login-panel').style.display = 'flex';
    }

    await loadSystemConfig();
});

/* --- UI HELPERS --- */
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
        ALLOWED_TANK_TYPES = (tankData && tankData.length > 0) ? tankData.map(i => i.type_name) : ['MS_15KL', 'HSD_20KL'];

        const { data: settingsData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
        if (settingsData) {
            GLOBAL_WEBHOOK_URL = settingsData.webhook_url || "";
            PREV_WEBHOOK_URL = GLOBAL_WEBHOOK_URL;
            PREV_BROADCAST_MSG = settingsData.broadcast_msg || "";
            PREV_BROADCAST_TYPE = settingsData.broadcast_type || "info";

            const webhookInput = document.getElementById('webhookUrl');
            if(webhookInput) webhookInput.value = GLOBAL_WEBHOOK_URL;
            
            const downtimeToggle = document.getElementById('downtimeToggle');
            if(downtimeToggle) downtimeToggle.checked = settingsData.downtime_active;
            
            const noticeInput = document.getElementById('globalNotice');
            if(noticeInput) noticeInput.value = settingsData.broadcast_msg || "";
            const typeInput = document.getElementById('noticeType');
            if(typeInput) typeInput.value = settingsData.broadcast_type || "info";

            updateStatusUI(settingsData.downtime_active);
        }
        
        await refreshChartDropdown();

    } catch (e) { console.error("Config Error:", e); }
}

function updateStatusUI(isDown) {
    const statusEl = document.querySelector('.status-ok');
    if (statusEl) {
        statusEl.innerText = isDown ? "Maintenance Mode" : "Online";
        statusEl.style.color = isDown ? "#ef4444" : "#10b981";
    }
}

async function refreshChartDropdown() {
    const dropdown = document.getElementById('deleteChartSelect');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="" disabled selected>Select chart to delete...</option>';
    
    const { data } = await supabase.from('system_assets').select('data').eq('key', 'tank_charts').single();
    if (data && data.data) {
        Object.keys(data.data).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.innerText = key;
            dropdown.appendChild(opt);
        });
    }
}

/* --- AUTH --- */
async function verifySession(userObj) { completeLogin(userObj); }

window.handleLogin = async function(e) {
    e.preventDefault();
    const id = document.getElementById('loginId').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    const btn = document.getElementById('loginBtn');
    
    if (!id || !pin) return showAlert("Please enter both ID and PIN.", "error");

    btn.innerHTML = '<span>Verifying...</span>';
    btn.disabled = true;

    try {
        const { data, error } = await supabase.from('admins').select('*').eq('phone', id).eq('pin', pin).single();
        if (error || !data) {
            showAlert("Access Denied: Invalid Credentials.", "error");
        } else {
            handleSuccess(data, rememberMe, id, pin);
        }
    } catch (err) {
        showAlert("Connection Error: " + err.message, "error");
    } finally {
        btn.innerHTML = '<span>Authenticate</span><i data-lucide="arrow-right"></i>';
        btn.disabled = false;
    }
};

function handleSuccess(user, remember, id, pin) {
    localStorage.setItem('fm_user', JSON.stringify(user));
    if (remember) {
        localStorage.setItem('fm_saved_id', id);
        localStorage.setItem('fm_saved_pin', pin);
    } else {
        localStorage.removeItem('fm_saved_id');
        localStorage.removeItem('fm_saved_pin');
    }
    completeLogin(user);
    sendLog(GLOBAL_WEBHOOK_URL, 'LOGIN', { name: user.name, role: user.role, user: user.name, discordId: user.discord });
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
    const isOwner = currentUser.role === ROLES.OWNER;
    const isMod = currentUser.role === ROLES.MODERATOR; 
    const webhookInput = document.getElementById('webhookUrl');
    if (webhookInput) webhookInput.disabled = !(isOwner || isMod);
    const addAdminBtn = document.querySelector('#view-team .primary-btn');
    if (addAdminBtn) addAdminBtn.style.display = isOwner ? 'flex' : 'none';
}

window.logout = function() {
    localStorage.removeItem('fm_user');
    window.location.reload();
};

/* --- REALTIME --- */
function initRealtimeListeners() {
    fetchStations();
    fetchAdmins();
    supabase.channel('stations-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, () => fetchStations()).subscribe();
    supabase.channel('admins-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => fetchAdmins()).subscribe();
    supabase.channel('settings-changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, payload => {
        if(payload.new) {
            GLOBAL_WEBHOOK_URL = payload.new.webhook_url;
            updateStatusUI(payload.new.downtime_active);
            
            const toggle = document.getElementById('downtimeToggle');
            if(toggle) toggle.checked = payload.new.downtime_active;
            
            const noticeInput = document.getElementById('globalNotice');
            if(noticeInput && document.activeElement !== noticeInput) noticeInput.value = payload.new.broadcast_msg || "";
            
            PREV_WEBHOOK_URL = payload.new.webhook_url;
            PREV_BROADCAST_MSG = payload.new.broadcast_msg;
            PREV_BROADCAST_TYPE = payload.new.broadcast_type;
        }
    }).subscribe();
}

/* --- STATIONS & ADMINS (CRUD) --- */

async function fetchStations() {
    const { data } = await supabase.from('stations').select('*').order('created_at', { ascending: false });
    if (data) { currentStations = data; document.getElementById('stat-stations').innerText = data.length; renderStations(data); }
}

async function fetchAdmins() {
    const { data } = await supabase.from('admins').select('*');
    if (data) { currentAdmins = data; document.getElementById('stat-admins').innerText = data.length; renderAdmins(data); }
}

window.saveStation = async function() {
    const id = document.getElementById('stId').value; 
    const name = document.getElementById('stName').value;
    const user = document.getElementById('stUser').value;
    const pass = document.getElementById('stPass').value;
    const location = document.getElementById('stNotes').value;
    const theme = document.getElementById('stTheme').value;
    
    const tankRows = document.querySelectorAll('.tank-row-item');
    let tanks = [];
    tankRows.forEach(row => {
        const n = row.querySelector('.t-name').value;
        const type = row.querySelector('.t-type').value;
        if (n && type) tanks.push({ name: n, type: type, currentVolume: 0 });
    });

    if (!name || !user || !pass) return showAlert("Fields missing", "error");

    const stationData = { name, location, theme, manager_user: user, manager_pass: pass, tanks };

    let error;
    if (id) {
        // --- DETAILED DIFF LOGIC ---
        const oldSt = currentStations.find(s => s.station_id === id);
        let changes = [];
        if(oldSt) {
            if(oldSt.name !== name) changes.push(`- Name: \`${oldSt.name}\` ➝ \`${name}\``);
            if((oldSt.location||'') !== location) changes.push(`- Location: \`${oldSt.location||'None'}\` ➝ \`${location||'None'}\``);
            if(oldSt.theme !== theme) changes.push(`- Theme: \`${oldSt.theme}\` ➝ \`${theme}\``);
            if(oldSt.manager_user !== user) changes.push(`- User: \`${oldSt.manager_user}\` ➝ \`${user}\``);
            if(oldSt.manager_pass !== pass) changes.push(`- Password: *(Changed)*`);
            
            // Tanks Diff
            const oldTanks = oldSt.tanks || [];
            if(JSON.stringify(oldTanks) !== JSON.stringify(tanks)) {
                changes.push(`- Tank Configuration Adjusted (Count: ${oldTanks.length}➝${tanks.length})`);
                if(oldTanks.length === tanks.length) {
                    oldTanks.forEach((t, i) => {
                        if(t.name !== tanks[i].name) changes.push(`  • Tank #${i+1} Name: ${t.name} ➝ ${tanks[i].name}`);
                        if(t.type !== tanks[i].type) changes.push(`  • Tank #${i+1} Type: ${t.type} ➝ ${tanks[i].type}`);
                    });
                }
            }
        }
        const changeLog = changes.length > 0 ? changes.join('\n') : 'No significant changes detected.';

        const res = await supabase.from('stations').update(stationData).eq('station_id', id);
        error = res.error;
        if(!error) sendLog(GLOBAL_WEBHOOK_URL, 'STATION_UPDATED', { 
            name, id, user: currentUser.name, discordId: currentUser.discord, changes: changeLog 
        });
    } else {
        stationData.station_id = "ST-" + Math.floor(Math.random() * 10000);
        const res = await supabase.from('stations').insert([stationData]);
        error = res.error;
        if(!error) sendLog(GLOBAL_WEBHOOK_URL, 'STATION_CREATED', { 
            name, id: stationData.station_id, manager: user, user: currentUser.name, discordId: currentUser.discord 
        });
    }
    
    if (error) showAlert(error.message, "error");
    else { window.closeModal('stationModal'); showAlert("Saved!"); fetchStations(); }
};

window.deleteStation = function(id) {
    if (currentUser.role === ROLES.STAFF) return showAlert("Access Denied", "error");
    showConfirm("Permanently delete this station?", async () => {
        const { error } = await supabase.from('stations').delete().eq('station_id', id);
        if (error) showAlert(error.message, "error");
        else {
            showAlert("Station deleted.");
            fetchStations(); 
            sendLog(GLOBAL_WEBHOOK_URL, 'STATION_DELETED', { id, user: currentUser.name, discordId: currentUser.discord });
        }
    });
};

/* --- RENDER FUNCTIONS --- */
window.renderStations = function(stations = currentStations) {
    const container = document.getElementById('stations-grid');
    const search = document.getElementById('stationSearch').value.toLowerCase();
    const filterTheme = document.getElementById('filterTheme').value;
    container.innerHTML = '';

    const filtered = stations.filter(st => {
        return (st.name.toLowerCase().includes(search) || st.station_id.toLowerCase().includes(search)) && 
               (filterTheme === 'all' || st.theme === filterTheme);
    });

    // Check permission once
    const canDelete = currentUser.role !== ROLES.STAFF;

    filtered.forEach(st => {
        container.innerHTML += `
            <div class="station-card theme-${st.theme}">
                <div class="station-header">
                    <div><h3>${st.name}</h3><p>${st.location || 'No Location'}</p></div>
                    <span class="badge-theme">${st.theme}</span>
                </div>
                <div class="station-body">
                    <p><strong>ID:</strong> ${st.station_id}</p>
                    <p><strong>Mgr:</strong> ${st.manager_user}</p>
                    <p><strong>Tanks:</strong> ${(st.tanks || []).length}</p>
                    <div style="margin-top:15px; display:flex; gap:10px;">
                        <button class="secondary-btn" onclick="editStation('${st.station_id}')">Edit</button>
                        ${canDelete ? `<button class="secondary-btn btn-danger" onclick="deleteStation('${st.station_id}')" style="color:var(--danger);border-color:var(--danger)">Delete</button>` : ''}
                    </div>
                </div>
            </div>`;
    });
};

window.addSuperAdmin = async function() {
    if (currentUser.role !== ROLES.OWNER) return showAlert("Access Denied", "error");
    const name = document.getElementById('newAdminName').value;
    const phone = document.getElementById('newAdminPhone').value;
    const discord = document.getElementById('newAdminDiscord').value;
    const role = document.getElementById('newAdminRole').value;
    const pin = document.getElementById('newAdminPin').value;
    
    if (!name || !phone || !pin) return showAlert("Missing Fields", "error");

    const { error } = await supabase.from('admins').insert([{ name, phone, discord, pin, role }]);
    if (error) showAlert(error.message, "error");
    else {
        window.closeModal('adminModal');
        showAlert("User added.");
        sendLog(GLOBAL_WEBHOOK_URL, 'TEAM_ADD', { name, role, user: currentUser.name, discordId: currentUser.discord });
        fetchAdmins();
    }
};

window.removeAdmin = function(id) {
    if (currentUser.role !== ROLES.OWNER) return showAlert("Access Denied", "error");
    showConfirm("Remove user?", async () => {
        await supabase.from('admins').delete().eq('id', id); 
        showAlert("Removed.");
        fetchAdmins();
        sendLog(GLOBAL_WEBHOOK_URL, 'TEAM_REMOVE', { user: currentUser.name, discordId: currentUser.discord });
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
        tr.innerHTML = `<td><div style="font-weight:600">${admin.name}</div></td><td>${admin.phone}</td><td><span style="font-weight:bold; color:${isTargetBoss?'#92400e':'#475569'}">${admin.role || 'Admin'}</span></td><td>${admin.discord || '-'}</td><td>${showDelete ? `<button class="close-btn" onclick="removeAdmin('${admin.id}')"><i data-lucide="trash"></i></button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
    if(window.lucide) lucide.createIcons();
};

/* --- SYSTEM SETTINGS --- */
window.saveSettings = async function() {
    if (currentUser.role === ROLES.STAFF) return showAlert("Access Denied", "error");

    const url = document.getElementById('webhookUrl').value;
    const msg = document.getElementById('globalNotice').value;
    const type = document.getElementById('noticeType').value;

    const { error } = await supabase.from('system_settings').upsert({
        id: 1,
        webhook_url: url,
        broadcast_msg: msg,
        broadcast_type: type
    });
    
    if(error) showAlert(error.message, "error");
    else {
        GLOBAL_WEBHOOK_URL = url;
        showAlert("Settings Saved.");
        
        let settingChanges = [];
        if (url !== PREV_WEBHOOK_URL) settingChanges.push(`- Webhook URL updated`);
        if (msg !== PREV_BROADCAST_MSG) settingChanges.push(`- Broadcast Msg: "${PREV_BROADCAST_MSG}" ➝ "${msg}"`);
        if (type !== PREV_BROADCAST_TYPE && msg) settingChanges.push(`- Broadcast Type: ${PREV_BROADCAST_TYPE} ➝ ${type}`);

        if (settingChanges.length > 0) {
            // Send Detailed Settings Log
            sendLog(url, 'SETTINGS_UPDATE', { 
                user: currentUser.name, 
                discordId: currentUser.discord, 
                changes: settingChanges.join('\n') 
            });
        }

        // Always send broadcast log if content changed
        if (msg !== PREV_BROADCAST_MSG) {
            sendLog(url, 'BROADCAST_SENT', { user: currentUser.name, discordId: currentUser.discord, msg, type });
        }
        
        PREV_WEBHOOK_URL = url;
        PREV_BROADCAST_MSG = msg;
        PREV_BROADCAST_TYPE = type;
    }
};

window.clearBroadcast = async function() {
    if (currentUser.role === ROLES.STAFF) return showAlert("Access Denied", "error");
    
    document.getElementById('globalNotice').value = "";
    
    const { error } = await supabase.from('system_settings').upsert({ id: 1, broadcast_msg: "" });
    if(error) showAlert(error.message, "error");
    else {
        showAlert("Broadcast Cleared.");
        sendLog(GLOBAL_WEBHOOK_URL, 'BROADCAST_CLEARED', { user: currentUser.name, discordId: currentUser.discord });
        PREV_BROADCAST_MSG = ""; // Reset cache so next save triggers log if needed
    }
};

window.toggleDowntimeMode = function() {
    if (currentUser.role === ROLES.STAFF) {
        document.getElementById('downtimeToggle').checked = !document.getElementById('downtimeToggle').checked;
        return showAlert("Access Denied", "error");
    }
    
    const isDown = document.getElementById('downtimeToggle').checked;
    showConfirm(isDown ? "Activate Maintenance Mode?" : "Go Online?", async () => {
        const { error } = await supabase.from('system_settings').upsert({ id: 1, downtime_active: isDown });
        if(error) {
            showAlert("Failed", "error");
            document.getElementById('downtimeToggle').checked = !isDown;
        } else {
            sendLog(GLOBAL_WEBHOOK_URL, 'MAINTENANCE_TOGGLE', { 
                user: currentUser.name, 
                discordId: currentUser.discord,
                status: isDown ? "OFFLINE (MAINTENANCE)" : "ONLINE" 
            });
            updateStatusUI(isDown);
        }
    });
};

/* --- ASSET MANAGEMENT (INTELLIGENT PARSER) --- */

window.uploadAsset = async function(type) {
    if (currentUser.role === ROLES.STAFF) return showAlert("Access Denied", "error");

    const inputId = type === 'density' ? 'densityInput' : 'chartsInput';
    const rawContent = document.getElementById(inputId).value.trim();
    const dbKey = type === 'density' ? 'density_table' : 'tank_charts';

    if (!rawContent) return showAlert("Input is empty.", "error");

    let finalData = {};

    try {
        // --- LOGIC 1: FETCH EXISTING DATA FIRST (TO MERGE) ---
        const { data: existing } = await supabase.from('system_assets').select('data').eq('key', dbKey).single();
        if (existing && existing.data) finalData = existing.data;

        // --- LOGIC 2: INTELLIGENT PARSING ---
        let actionDescription = "Full Update";
        
        if (type === 'density') {
            const cleanDensity = rawContent.replace(/const\s+densityTable\s*=\s*/, '').replace(/;\s*$/, '');
            finalData = new Function('return ' + cleanDensity)();
        } else {
            // TANK CHARTS - Handle "export const 20KL_CHART = { ... }"
            // SMART REGEX: Captures name even if it starts with numbers (e.g. 20KL)
            const regex = /(?:export\s+const\s+|const\s+|var\s+|let\s+)?([a-zA-Z0-9_]+)\s*=\s*(\{[\s\S]*?\})(?:;|$)/;
            const match = rawContent.match(regex);

            if (match) {
                const varName = match[1]; // e.g., "20KL_CHART"
                const jsonString = match[2]; // e.g., "{ '0.5': ... }"
                
                const parsedObj = new Function('return ' + jsonString)();
                
                // MERGE: Add/Update this specific chart
                finalData[varName] = parsedObj;
                actionDescription = `Updated Chart: ${varName}`;
                showAlert(`Detected Chart: ${varName}. Merging...`);
            } else {
                throw new Error("Could not parse chart format. Ensure it looks like 'export const NAME = { ... }'");
            }
        }

        // --- LOGIC 3: SAVE BACK TO DB ---
        const { error } = await supabase.from('system_assets').upsert({
            key: dbKey,
            data: finalData
        });

        if (error) throw error;

        showAlert(`✅ ${type === 'density' ? 'Density' : 'Chart'} updated successfully!`);
        sendLog(GLOBAL_WEBHOOK_URL, 'ASSET_UPLOAD', { 
            key: dbKey, 
            action: actionDescription,
            user: currentUser.name, 
            discordId: currentUser.discord 
        });
        
        if (type === 'charts') refreshChartDropdown();

    } catch (err) {
        console.error(err);
        showAlert("Parsing Error: " + err.message, "error");
    }
};

window.deleteSingleChart = async function() {
    if (currentUser.role === ROLES.STAFF) return showAlert("Access Denied", "error");

    const select = document.getElementById('deleteChartSelect');
    const chartKey = select.value;

    if (!chartKey) return showAlert("Please select a chart to delete.", "error");

    showConfirm(`Delete chart '${chartKey}'?`, async () => {
        try {
            const { data } = await supabase.from('system_assets').select('data').eq('key', 'tank_charts').single();
            if (!data || !data.data) return showAlert("No charts found.", "error");

            const allCharts = data.data;
            
            if (allCharts[chartKey]) {
                delete allCharts[chartKey];
                
                const { error } = await supabase.from('system_assets').upsert({ key: 'tank_charts', data: allCharts });
                if (error) throw error;

                showAlert(`Chart '${chartKey}' deleted.`);
                sendLog(GLOBAL_WEBHOOK_URL, 'ASSET_DELETE', { key: `Chart: ${chartKey}`, user: currentUser.name, discordId: currentUser.discord });
                refreshChartDropdown();
            } else {
                showAlert("Chart not found.", "error");
            }
        } catch (err) {
            showAlert("Delete Error: " + err.message, "error");
        }
    });
};

/* --- COMMON UI FUNCTIONS --- */
window.toggleSidebar = function() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('open'); };
window.openStationModal = function() { document.getElementById('stationModal').style.display = 'flex'; };
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };
window.switchTab = function(id) { 
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`view-${id}`).classList.add('active');
};
window.openModal = function(id) { document.getElementById(id).style.display = 'flex'; };
window.addTankRow = function(name = "", type = "") {
    const list = document.getElementById('tank-list');
    const div = document.createElement('div');
    div.className = 'tank-row-item';
    let options = `<option value="" disabled ${!type ? 'selected' : ''}>Select Config</option>`;
    ALLOWED_TANK_TYPES.forEach(t => { options += `<option value="${t}" ${type === t ? 'selected' : ''}>${t}</option>`; });
    div.innerHTML = `<input type="text" placeholder="Tank Name" class="t-name" style="flex:1" value="${name}" autocomplete="off"><select class="t-type" style="flex:1; padding:10px; border-radius:10px; border:1px solid var(--border); background:var(--input-bg); color:var(--text-main)">${options}</select><button class="close-btn" onclick="this.parentElement.remove()"><i data-lucide="trash-2"></i></button>`;
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
    if (station.tanks && Array.isArray(station.tanks)) station.tanks.forEach(tank => addTankRow(tank.name, tank.type));
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
window.toggleDarkMode = function() { document.body.classList.toggle('dark-mode'); if(window.lucide) lucide.createIcons(); };
