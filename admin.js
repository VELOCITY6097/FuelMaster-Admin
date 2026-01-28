import { auth, db, sendDiscordLog } from './config.js';
import { 
    signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword,
    setPersistence, browserLocalPersistence, browserSessionPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, 
    getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DOMAIN = "@fuelmaster.app";
const MASTER_ADMIN_MOBILE = "9875345863"; // 🔒 VELOCITY
let allPumpsCache = [];
let currentUserProfile = {}; 

// --- THEME ---
window.toggleTheme = () => {
    const isDark = document.getElementById('checkbox').checked;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};
if(localStorage.getItem('theme') === 'dark') {
    document.getElementById('checkbox').checked = true;
    document.documentElement.setAttribute('data-theme', 'dark');
}

// --- LOGIN ---
window.handleLogin = async () => {
    const mobile = document.getElementById('loginMobile').value;
    const pass = document.getElementById('loginPass').value;
    const remember = document.getElementById('rememberMe').checked;

    if(!mobile || !pass) return alert("Please enter Mobile and Password");

    const btn = document.querySelector('.btn-auth');
    btn.innerText = "VERIFYING...";
    btn.disabled = true;

    try {
        const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        await signInWithEmailAndPassword(auth, mobile + DOMAIN, pass);
    } catch (e) { 
        alert("Login Failed: " + e.message);
        btn.innerText = "AUTHENTICATE";
        btn.disabled = false;
    }
};

window.handleLogout = () => signOut(auth);

// --- AUTH STATE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists() && docSnap.data().role === 'super_admin') {
            currentUserProfile = docSnap.data();
            const displayName = currentUserProfile.nickname || currentUserProfile.mobile || "Super Admin";
            document.getElementById('admin-display-name').innerText = displayName;

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'flex';
            initDashboard();
        } else {
            alert("Access Denied: Not a Super Admin");
            signOut(auth);
        }
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
});

getDocs(collection(db, "users")).then(snap => {
    if(snap.empty) document.getElementById('setup-hint').style.display = 'block';
});

// --- DASHBOARD INIT ---
function initDashboard() {
    loadPumps();
    loadSuperAdmins();
    loadGlobalSettings();
}

// --- 1. SUPER ADMIN MANAGER ---
function loadSuperAdmins() {
    const q = query(collection(db, "users"), where("role", "==", "super_admin"));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('super-admin-list');
        if(!list) return;
        
        list.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            const div = document.createElement('div');
            div.style.cssText = "padding:10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;";
            
            const isMe = u.mobile === currentUserProfile.mobile;
            const isBoss = u.mobile === MASTER_ADMIN_MOBILE;

            let deleteBtn = '';
            if (isMe) deleteBtn = '<span style="font-size:0.7rem; background:var(--primary); color:white; padding:2px 6px; border-radius:4px;">YOU</span>';
            else if (isBoss) deleteBtn = '<span style="font-size:0.7rem; background:#fbbf24; color:black; padding:2px 6px; border-radius:4px;">👑 BOSS</span>';
            else deleteBtn = `<button onclick="deleteSuperAdmin('${d.id}', '${u.nickname}', '${u.mobile}')" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`;

            div.innerHTML = `
                <div>
                    <strong style="color:var(--text-main);">${u.nickname || 'Admin'}</strong>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${u.mobile}</div>
                </div>
                ${deleteBtn}
            `;
            list.appendChild(div);
        });
    });
}

window.addNewAdmin = async () => {
    const mobile = document.getElementById('newAdminMobile').value;
    const pass = document.getElementById('newAdminPass').value;
    const nick = document.getElementById('newAdminNick').value;
    const discord = document.getElementById('newAdminDiscord').value;

    if(!mobile || !pass) return alert("Credentials required");
    if(!confirm("Creating a new Admin requires re-authentication. You will be logged out. Proceed?")) return;

    try {
        const cred = await createUserWithEmailAndPassword(auth, mobile + DOMAIN, pass);
        await setDoc(doc(db, "users", cred.user.uid), {
            mobile, role: 'super_admin', nickname: nick, discordId: discord
        });
        alert("Admin Created. Please Log In again.");
        location.reload();
    } catch(e) { handleAuthError(e); }
};

window.deleteSuperAdmin = async (uid, name, mobile) => {
    if(mobile === MASTER_ADMIN_MOBILE) return alert("⚠️ Cannot delete the Boss.");
    if(!confirm(`Delete ${name}?`)) return;
    
    try {
        await deleteDoc(doc(db, "users", uid));
        sendDiscordLog("Super Admin Removed", `Removed: ${name}`, currentUserProfile.nickname, currentUserProfile.discordId);
    } catch(e) { alert("Error: " + e.message); }
};

// --- 2. PUMP MANAGER ---
function loadPumps() {
    onSnapshot(collection(db, "pumps"), (snap) => {
        allPumpsCache = [];
        snap.forEach(d => allPumpsCache.push({ id: d.id, ...d.data() }));
        filterPumps();
    });
}

window.filterPumps = () => {
    const term = document.getElementById('pumpSearch').value.toLowerCase();
    const filtered = allPumpsCache.filter(p => p.name.toLowerCase().includes(term));
    renderPumps(filtered);
};

function renderPumps(pumps) {
    const list = document.getElementById('pump-list');
    list.innerHTML = "";
    pumps.forEach(p => {
        const isDown = p.downtimeMsg ? true : false;
        const card = document.createElement('div');
        card.className = "card";
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3>${p.name}</h3>
                    <small style="text-transform:uppercase; color:var(--text-muted);">${p.theme}</small>
                </div>
                <span class="status-badge ${isDown ? 'offline' : 'online'}">${isDown ? 'DOWN' : 'LIVE'}</span>
            </div>
            <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:15px;">
                ${p.tanks ? p.tanks.length + ' Tanks' : 'No tanks'}
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid var(--border); padding-top:15px;">
                <button class="btn-icon" onclick="editPump('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon" onclick="deletePump('${p.id}', '${p.name}')" style="color:var(--danger); border-color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(card);
    });
}

// --- ADD/EDIT STATION ---
window.openPumpModal = () => {
    document.getElementById('editPumpId').value = "";
    document.getElementById('inpName').value = "";
    document.getElementById('inpNote').value = "";
    document.getElementById('tank-container').innerHTML = ""; 
    document.getElementById('inpAdminMobile').value = "";
    document.getElementById('inpAdminPass').value = "";
    document.getElementById('pass-container').style.display = 'block';
    document.getElementById('reset-password-box').style.display = 'none';
    document.getElementById('modal-title').innerText = "New Station";
    document.getElementById('modal-pump').style.display = 'flex';
};

window.editPump = async (id) => {
    const p = allPumpsCache.find(x => x.id === id);
    if (!p) return;

    document.getElementById('editPumpId').value = id;
    document.getElementById('inpName').value = p.name;
    document.getElementById('inpTheme').value = p.theme;
    document.getElementById('inpNote').value = p.note || "";
    
    const tankContainer = document.getElementById('tank-container');
    tankContainer.innerHTML = "";
    if (p.tanks) p.tanks.forEach(t => window.addTankRow(t.name, t.chartId));

    const q = query(collection(db, "users"), where("pumpId", "==", id), where("role", "==", "pump_admin"));
    getDocs(q).then(snap => {
        if(!snap.empty) {
            document.getElementById('inpAdminMobile').value = snap.docs[0].data().mobile;
            document.getElementById('pass-container').style.display = 'none';
            document.getElementById('reset-password-box').style.display = 'block';
        } else {
            document.getElementById('inpAdminMobile').value = "";
            document.getElementById('pass-container').style.display = 'block';
            document.getElementById('reset-password-box').style.display = 'none';
        }
    });

    document.getElementById('modal-title').innerText = "Edit Station";
    document.getElementById('modal-pump').style.display = 'flex';
};

window.savePump = async () => {
    const id = document.getElementById('editPumpId').value;
    const name = document.getElementById('inpName').value;
    const theme = document.getElementById('inpTheme').value;
    const note = document.getElementById('inpNote').value;
    const mobile = document.getElementById('inpAdminMobile').value;
    const pass = document.getElementById('inpAdminPass').value;

    if(!name) return alert("Station Name Required");

    const tanks = [];
    document.querySelectorAll('.tank-row-item').forEach(row => {
        const tName = row.querySelector('.t-name').value;
        const tChart = row.querySelector('.t-chart').value;
        if(tName) tanks.push({ name: tName, chartId: tChart });
    });

    const data = { name, theme, note, tanks };

    try {
        if (id) {
            // Update
            await updateDoc(doc(db, "pumps", id), data);
            sendDiscordLog("Station Updated", `Updated: ${name}`, currentUserProfile.nickname, currentUserProfile.discordId);
        } else {
            // Create
            const ref = await addDoc(collection(db, "pumps"), { ...data, createdAt: new Date() });
            sendDiscordLog("Station Created", `Created: ${name}`, currentUserProfile.nickname, currentUserProfile.discordId);
            
            if(mobile && pass) {
                if(confirm("Create Pump Admin now? (Logs out current session)")) {
                    const cred = await createUserWithEmailAndPassword(auth, mobile + DOMAIN, pass);
                    await setDoc(doc(db, "users", cred.user.uid), {
                        mobile, role: 'pump_admin', pumpId: ref.id
                    });
                    location.reload(); 
                    return;
                }
            }
        }
        closeModal('modal-pump');
    } catch(e) { handleAuthError(e); }
};

window.deletePump = async (id, name) => {
    if(!confirm(`Delete Station: ${name}?\nWARNING: This will delete the station AND its Admin user data.`)) return;
    
    try {
        // 1. Delete associated users (Docs Only)
        const q = query(collection(db, "users"), where("pumpId", "==", id));
        const userSnaps = await getDocs(q);
        const promises = userSnaps.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(promises);

        // 2. Delete pump
        await deleteDoc(doc(db, "pumps", id));
        
        sendDiscordLog("Station Deleted", `Deleted: ${name}`, currentUserProfile.nickname, currentUserProfile.discordId, "global");
    } catch(e) {
        alert("Error deleting: " + e.message);
    }
};

// --- ERROR HANDLER (Handles the "User Exists" Issue) ---
function handleAuthError(e) {
    if (e.code === 'auth/email-already-in-use') {
        alert("⚠️ IMPORTANT ACTION REQUIRED ⚠️\n\nThis Mobile Number is still registered in Firebase Authentication.\n\nSince you are using the Free Plan on GitHub, you must:\n1. Go to Firebase Console -> Authentication\n2. Find this mobile number\n3. Click 'Delete Account'\n\nThen try again.");
    } else {
        alert("Error: " + e.message);
    }
}

window.addTankRow = (name="", chart="15KL_Horizontal") => {
    const container = document.getElementById('tank-container');
    const row = document.createElement('div');
    row.className = "tank-row-item"; 
    row.style.cssText = "display:flex; gap:10px; margin-bottom:10px; align-items:center;";
    row.innerHTML = `
        <input class="form-input t-name" placeholder="Tank Name" value="${name}" style="flex:2">
        <select class="form-input t-chart" style="flex:1">
            <option value="15KL_Horizontal" ${chart==='15KL_Horizontal'?'selected':''}>15KL</option>
            <option value="20KL_Horizontal" ${chart==='20KL_Horizontal'?'selected':''}>20KL</option>
        </select>
    `;
    const btn = document.createElement('button');
    btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    btn.style.cssText = "color:var(--danger); background:none; border:1px solid var(--danger); border-radius:6px; cursor:pointer; padding:8px 12px;";
    btn.onclick = () => row.remove();
    row.appendChild(btn);
    container.appendChild(row);
};

// --- GLOBAL SETTINGS ---
async function loadGlobalSettings() {
    onSnapshot(doc(db, "settings", "global"), (snap) => {
        if(snap.exists()) {
            const d = snap.data();
            document.getElementById('confWebhook').value = d.discordWebhook || "";
            document.getElementById('globalDowntimeToggle').checked = d.downtimeActive || false;
            document.getElementById('globalDowntimeMsg').value = d.downtimeMsg || "";
        }
    });
}

window.toggleGlobalDowntime = async () => {
    const checkbox = document.getElementById('globalDowntimeToggle');
    const isChecked = checkbox.checked; 
    const msg = document.getElementById('globalDowntimeMsg').value || "Maintenance";

    await setDoc(doc(db, "settings", "global"), {
        downtimeActive: isChecked,
        downtimeMsg: msg
    }, { merge: true });

    sendDiscordLog(
        isChecked ? "🔴 Global Lock ACTIVATED" : "🟢 Global Lock REMOVED",
        isChecked ? `Reason: ${msg}` : "System Online",
        currentUserProfile.nickname, currentUserProfile.discordId, "global"
    );
};

window.saveGlobalConfig = async () => {
    const hook = document.getElementById('confWebhook').value;
    await setDoc(doc(db, "settings", "global"), { discordWebhook: hook }, { merge: true });
    alert("Configuration Saved");
};

// --- INITIAL SETUP ---
window.runInitialSetup = async () => {
    const mobile = document.getElementById('setupMobile').value;
    const pass = document.getElementById('setupPass').value;
    const nick = document.getElementById('setupNick').value;
    const discord = document.getElementById('setupDiscord').value;

    try {
        const cred = await createUserWithEmailAndPassword(auth, mobile + DOMAIN, pass);
        await setDoc(doc(db, "users", cred.user.uid), {
            mobile, role: 'super_admin', nickname: nick, discordId: discord
        });
        await setDoc(doc(db, "settings", "global"), { discordWebhook: "" });
        alert("Setup Complete. Please Login.");
        location.reload();
    } catch(e) { handleAuthError(e); }
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.showTab = (id) => {
    document.querySelectorAll('.tab-pane').forEach(e => e.style.display = 'none');
    document.getElementById('tab-'+id).style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(e => e.classList.remove('active'));
    event.currentTarget.classList.add('active');
};
window.showSetup = () => document.getElementById('setup-modal').style.display = 'flex';