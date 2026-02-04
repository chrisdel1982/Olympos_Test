const MY_TEAM = 'ΟΛΥΜΠΟΣ ΔΕΝΔΡΟΠΟΤΑΜΟΥ';
const ADMIN_PASSWORD = 'olympos';

const TEAMS = [
    'ΟΛΥΜΠΟΣ ΔΕΝΔΡΟΠΟΤΑΜΟΥ',
    'ΜΑΚΕΔΟΝΙΚΟΣ (4)',
    'ΠΡΩΤΑΘΛΗΤΕΣ ΠΕΥΚΩΝ',
    'ΑΜΣ ΝΙΚΟΠΟΛΗ',
    'ΦΟΙΝΙΚΑΣ ΠΟΛΙΧΝΗΣ',
    'ΑΕ ΦΙΛΥΡΟΥ',
    'ΝΕΑ ΠΟΛΙΤΕΙΑ ΕΥΟΣΜΟΥ',
    'ΔΟΞΑ ΡΕΤΖΙΚΙΟΥ (2)',
    'ΑΟ ΝΕΑΣ ΕΥΚΑΡΠΙΑΣ',
    'ΕΣΠΕΡΟΣ ΤΕΡΨΙΘΕΑΣ',
    'ΑΟ ΜΕΣΗΜΒΡΙΑΣ',
    'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ'
];

const FIXTURES = [];
async function loadData() {
    // 1. Πρώτα προσπάθεια φόρτωσης από GitHub (Server First)
    try {
// Το ?t=... εξασφαλίζει ότι παίρνουμε πάντα το φρέσκο, όχι cached
const response = await fetch('olympos-backup.json?t=' + new Date().getTime());

if (response.ok) {
    const serverData = await response.json();
    console.log('☁️ Φορτώθηκαν δεδομένα από Server (GitHub).');
    return serverData;
}
    } catch (e) {
console.warn('⚠️ Πρόβλημα σύνδεσης με GitHub, ψάχνω τοπικά...', e);
    }

    // 2. Αν αποτύχει το GitHub (π.χ. offline), ψάξε τοπικά
    const saved = localStorage.getItem('footballData');
    if (saved) {
console.log('📂 Φόρτωση τοπικών δεδομένων (Offline Mode).');
return JSON.parse(saved);
    }

    // 3. Fallback (Αν είναι όλα άδεια)
    return { 
fixtures: JSON.parse(JSON.stringify(FIXTURES)),
roster: [],
news: []
    };
}
    function calculateLiveMinute(startTime, half, duration) {
    if (half === "FT") return "FT";
    if (half === "HT") return "HT";
    if (!startTime) return "LIVE";

    const now = new Date();
    const [startHours, startMinutes] = startTime.split(':');
    const start = new Date();
    start.setHours(startHours, startMinutes, 0);

    // Διαφορά σε λεπτά
    let diffInMinutes = Math.floor((now - start) / 60000);
    
    if (diffInMinutes < 0) return "0'";

    // Υπολογισμός βάσει ημιχρόνου
    // Π.χ. αν είναι 2ο ημίχρονο και διάρκεια 20', ξεκινάμε από το 20' + diff
    let baseMinutes = (parseInt(half) - 1) * parseInt(duration);
    let currentMatchMinute = baseMinutes + diffInMinutes + 1; // +1 για να ξεκινάει από το 1'

    // Έλεγχος για καθυστερήσεις ημιχρόνου
    let halfLimit = parseInt(half) * parseInt(duration);
    if (currentMatchMinute > halfLimit) {
let extra = currentMatchMinute - halfLimit;
return halfLimit + "+" + extra + "'";
    }

    return currentMatchMinute + "'";
}
function saveData(dataToSave) {
    // Προσθέτουμε την τρέχουσα ώρα ως "υπογραφή" (Timestamp)
    dataToSave.lastUpdated = new Date().getTime();
    localStorage.setItem('footballData', JSON.stringify(dataToSave));
}

function exportData() {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `olympos-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Τα δεδομένα εξήχθησαν');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.fixtures || !Array.isArray(importedData.fixtures)) {
                throw new Error('Μη έγκυρη δομή δεδομένων');
            }

            // Μετατροπή παλιών null (ΡΕΠΟ) σε ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ
            importedData.fixtures.forEach(round => {
                if (round.matches) {
                    round.matches.forEach(match => {
                        if (match.home === null) {
                            match.home = 'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ';
                        }
                        if (match.away === null) {
                            match.away = 'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ';
                        }
                    });
                }
            });

            if (confirm('⚠️ ΠΡΟΣΟΧΗ!\n\nΤα τρέχοντα δεδομένα θα αντικατασταθούν.\nΕίσαι σίγουρος;')) {
                data = importedData;
                
                // Εξασφάλιση ότι υπάρχει το news array
                if (!data.news) {
                    data.news = [];
                }
                if (!data.roster) {
                    data.roster = [];
                }
                
                saveData(data);
                displayStandings();
                displayResults();
                displayFixtures();
                displayRoster();
                displayNews();
                updateRosterList();
                updateNewsList();
                showToast('Τα δεδομένα εισήχθησαν επιτυχώς!\n\n' + 
                      'Roster: ' + (data.roster ? data.roster.length : 0) + ' παίκτες\n' +
                      'Ειδήσεις: ' + (data.news ? data.news.length : 0));
                closeAdminPanel();
            }
        } catch (error) {
            console.error('Import Error:', error);
            showToast(' Σφάλμα: Μη έγκυρο αρχείο δεδομένων!\n\nΛεπτομέρειες: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

  function calculateStandings() {
    const standings = {};
    
    // Αρχικοποίηση ομάδων
    TEAMS.forEach(team => {
standings[team] = {
    team: team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    history: [] // ΝΕΟ: Αποθήκευση ιστορικού αγώνων για τη φόρμα
};
    });

    // Υπολογισμός
    data.fixtures.forEach(round => {
round.matches.forEach(match => {
    // Υπολογίζουμε μόνο αν έχει σκορ ΚΑΙ δεν είναι αναβληθέν
    if (match.home && match.away && match.homeScore !== null && match.awayScore !== null && !match.isPostponed) {
        const home = standings[match.home];
        const away = standings[match.away];

        home.played++;
        away.played++;

        home.gf += match.homeScore;
        home.ga += match.awayScore;
        away.gf += match.awayScore;
        away.ga += match.homeScore;

        if (match.homeScore > match.awayScore) {
            home.won++;
            home.points += 3;
            away.lost++;
            // Προσθήκη στο ιστορικό (Τελευταίο αποτέλεσμα μπαίνει στο τέλος)
            home.history.push('W');
            away.history.push('L');
        } else if (match.homeScore < match.awayScore) {
            away.won++;
            away.points += 3;
            home.lost++;
            home.history.push('L');
            away.history.push('W');
        } else {
            home.drawn++;
            away.drawn++;
            home.points++;
            away.points++;
            home.history.push('D');
            away.history.push('D');
        }
    }
});
    });

    Object.values(standings).forEach(team => {
team.gd = team.gf - team.ga;
    });

    // Ταξινόμηση
    const sorted = Object.values(standings).sort((a, b) => {
if (b.points !== a.points) return b.points - a.points;
if (b.gd !== a.gd) return b.gd - a.gd;
return b.gf - a.gf;
    });

    return sorted;
}

function displayStandings() {
    const standings = calculateStandings();
    
    // ΕΠΙΚΕΦΑΛΙΔΕΣ: Αφαιρέσαμε το γκρι φόντο και το bold από το 'Β'
    const tableHead = document.querySelector('#standingsTable thead tr');
    tableHead.innerHTML = `
<th style="width: 40px;">Θέση</th>
<th style="text-align: left;">Ομάδα</th>
<th style="width: 40px;">Β</th>  <th style="width: 40px;">Αγ</th>
<th style="width: 40px;">Ν</th>
<th style="width: 40px;">Ι</th>
<th style="width: 40px;">Η</th>
<th style="width: 40px;">ΓΥ</th>
<th style="width: 40px;">ΓΚ</th>
<th style="width: 40px;">ΔΤ</th>
<th style="width: 110px;">Φόρμα</th>
    `;

    const tbody = document.getElementById('standingsBody');
    tbody.innerHTML = '';

    standings.forEach((team, index) => {
const row = document.createElement('tr');
if (team.team === MY_TEAM) {
    row.classList.add('my-team');
}

// Χρώματα Μπάρας
let indicatorClass = '';
const totalTeams = standings.length;
if (index === 0) indicatorClass = 'indicator-green';
else if (index === 1 || index === 2) indicatorClass = 'indicator-blue';
else if (index >= totalTeams - 2) indicatorClass = 'indicator-red';

// Φόρμα (Form)
const last5 = team.history.slice(-5);
let formHTML = '<div class="form-container">';
last5.forEach(result => {
    let badgeClass = '';
    let letter = '';
    if (result === 'W') { badgeClass = 'form-win'; letter = 'N'; }
    else if (result === 'D') { badgeClass = 'form-draw'; letter = 'I'; }
    else if (result === 'L') { badgeClass = 'form-loss'; letter = 'H'; }
    else if (result === 'A') { badgeClass = 'form-postponed'; letter = 'A'; }
    
    formHTML += `<span class="form-badge ${badgeClass}">${letter}</span>`;
});
formHTML += '</div>';

// ΔΕΔΟΜΕΝΑ: Αφαιρέσαμε το γκρι φόντο και το bold από τους βαθμούς
row.innerHTML = `
    <td class="pos-cell ${indicatorClass}">${index + 1}</td>
    <td>${team.team}</td>
    <td style="font-size: 1.1rem;">${team.points}</td> <td>${team.played}</td>
    <td>${team.won}</td>
    <td>${team.drawn}</td>
    <td>${team.lost}</td>
    <td>${team.gf}</td>
    <td>${team.ga}</td>
    <td>${team.gd > 0 ? '+' + team.gd : team.gd}</td>
    <td>${formHTML}</td>
`;

tbody.appendChild(row);
    });
}
  function displayResults() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    let hasResults = false;
    const reversedFixtures = [...data.fixtures].reverse();

    reversedFixtures.forEach(round => {
const roundMatches = round.matches.filter(m => (m.homeScore !== null && m.awayScore !== null) || m.isPostponed);

if (roundMatches.length > 0) {
    hasResults = true;
    const section = document.createElement('div');
    section.className = 'round-section';
    
    const header = document.createElement('div');
    header.className = 'round-header';
    header.textContent = `Αγωνιστική ${round.round}`;
    section.appendChild(header);

    roundMatches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'match-row';
        div.style.display = 'block'; 
        div.style.padding = '0';

        if (match.home === MY_TEAM || match.away === MY_TEAM) { div.style.background = '#fffdf0'; }

        // ΑΛΛΑΓΗ ΕΔΩ: Γράφουμε "ΑΝΑΒΟΛΗ" αντί για "ΑΝΑΒΛΗΘΗΚΕ"
        let centerContent = match.isPostponed ? 
            `<span class="postponed-badge">ΑΝΑΒΟΛΗ</span>` : 
            `<div class="match-score-box">${match.homeScore} - ${match.awayScore}</div>`;

        let mainMatchHTML = `
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center; padding: 1rem;">
                <div class="team-left">${match.home}</div>
                <div>${centerContent}</div>
                <div class="team-right">${match.away}</div>
            </div>`;

        // --- ΕΜΦΑΝΙΣΗ ΣΤΑΤΙΣΤΙΚΩΝ ---
        let statsHTML = '';
        let hasStats = false;
        let contentHTML = [];

        if (match.scorers && match.scorers.length > 0 && !match.isPostponed) {
            hasStats = true;
            const counts = {};
            match.scorers.forEach(name => { counts[name] = (counts[name] || 0) + 1; });

            for (const [name, count] of Object.entries(counts)) {
                let shortName = name;
                const parts = name.split(' ');
                if(parts.length > 1) shortName = parts.slice(1).join(' ') + ' ' + parts[0].charAt(0) + '.';
                const goalsStr = count > 1 ? `(${count})` : '';
                contentHTML.push(`<span class="match-scorer-entry">⚽ ${shortName} ${goalsStr}</span>`);
            }
        }

        if (match.cleanSheetHolders && match.cleanSheetHolders.length > 0 && !match.isPostponed) {
            hasStats = true;
            match.cleanSheetHolders.forEach(name => {
                 let shortName = name;
                const parts = name.split(' ');
                if(parts.length > 1) shortName = parts.slice(1).join(' ') + ' ' + parts[0].charAt(0) + '.';
                contentHTML.push(`<span class="match-scorer-entry match-cs-entry">🧤 ${shortName}</span>`);
            });
        }

        if (hasStats) {
            statsHTML = `<div class="match-scorers">${contentHTML.join('<span style="margin:0 4px; opacity:0.3">|</span>')}</div>`;
        }

        div.innerHTML = mainMatchHTML + statsHTML;
        section.appendChild(div);
    });
    container.appendChild(section);
}
    });

    if (!hasResults) { container.innerHTML = '<div class="empty-state"><p>⚽ Δεν υπάρχουν αποτελέσματα ακόμα.</p></div>'; }
}
function displayFixtures() {
    const container = document.getElementById('fixturesContainer');
    container.innerHTML = '';

    let hasFixtures = false;

    data.fixtures.forEach(round => {
// Βρίσκουμε αγώνες που ΔΕΝ έχουν σκορ και ΔΕΝ είναι αναβληθέντες
const roundMatches = round.matches.filter(m => 
    m.homeScore === null && m.awayScore === null && !m.isPostponed
);

if (roundMatches.length > 0) {
    hasFixtures = true;
    
    const section = document.createElement('div');
    section.className = 'round-section';
    
    const header = document.createElement('div');
    header.className = 'round-header';
    header.textContent = `Αγωνιστική ${round.round}`;
    section.appendChild(header);

    roundMatches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'match-row';
        
        if (match.home === MY_TEAM || match.away === MY_TEAM) {
            div.style.background = '#fffdf0';
        }

        const homeTeam = match.home || 'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ';
        const awayTeam = match.away || 'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ';

        div.innerHTML = `
            <div class="team-left">${homeTeam}</div>
            <div class="match-vs-box">VS</div>
            <div class="team-right">${awayTeam}</div>
        `;
        section.appendChild(div);
    });

    container.appendChild(section);
}
    });

    if (!hasFixtures) {
container.innerHTML = '<div class="empty-state"><p>🏁 Όλοι οι αγώνες έχουν ολοκληρωθεί!</p></div>';
    }
}
// ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Βρίσκει αναλυτικά τα στατιστικά ενός παίκτη
function getPlayerDetailedStats(playerName) {
    let goalsLog = [];
    let cleanSheetsLog = [];

    // Ψάχνουμε σε όλα τα fixtures
    data.fixtures.forEach(round => {
round.matches.forEach(match => {
    // Αν δεν έχει γίνει το ματς, το αγνοούμε
    if (match.homeScore === null) return;

    const opponent = (match.home === MY_TEAM) ? match.away : match.home;
    const score = `${match.homeScore}-${match.awayScore}`;
    const info = `vs ${opponent} (${score})`;

    // 1. Έλεγχος για Γκολ
    if (match.scorers) {
        // Πόσες φορές υπάρχει το όνομα του παίκτη στη λίστα scorers;
        const goalsInMatch = match.scorers.filter(s => s === playerName).length;
        if (goalsInMatch > 0) {
            goalsLog.push({ match: info, count: goalsInMatch });
        }
    }

    // 2. Έλεγχος για Clean Sheet
    if (match.cleanSheetHolders && match.cleanSheetHolders.includes(playerName)) {
        cleanSheetsLog.push({ match: info });
    }
});
    });

    return { goalsLog, cleanSheetsLog };
}
function displayRoster() {
    const container = document.getElementById('rosterContainer');
    container.className = ''; 
    container.innerHTML = '';

    if (!data.roster || data.roster.length === 0) {
container.innerHTML = '<div class="empty-state"><p>👥 Δεν υπάρχουν παίκτες στο ρόστερ.</p></div>';
return;
    }

    const currentYear = new Date().getFullYear(); 
    const categories = [
{ title: 'ΤΕΡΜΑΤΟΦΥΛΑΚΕΣ', keywords: ['(gk)'], icon: '🧤' },
{ title: 'ΑΜΥΝΤΙΚΟΙ', keywords: ['(cb)', '(lb)', '(rb)', '(sw)', '(lwb)', '(rwb)', '(wb)'], icon: '🛡️' },
{ title: 'ΜΕΣΟΙ', keywords: ['(cm)', '(dm)', '(am)', '(lm)', '(rm)'], icon: '⚙️' },
{ title: 'ΕΠΙΘΕΤΙΚΟΙ', keywords: ['(cf)', '(ss)', '(lw)', '(rw)', '(st)'], icon: '⚡' },
{ title: 'TECHNICAL STAFF', keywords: ['προπονητής', 'coach'], icon: '👨‍🏫' }
    ];

    let availablePlayers = [...data.roster];

    categories.forEach(category => {
const groupPlayers = availablePlayers.filter(p => {
    const posFull = (p.position || '').toLowerCase();
    const primaryPos = posFull.split('/')[0]; 
    return category.keywords.some(keyword => primaryPos.includes(keyword));
});

if (groupPlayers.length > 0) {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'roster-category-title';
    titleDiv.innerHTML = `${category.icon} ${category.title}`;
    container.appendChild(titleDiv);

    const gridDiv = document.createElement('div');
    gridDiv.className = 'roster-grid';
    groupPlayers.sort((a, b) => (a.number || 999) - (b.number || 999));

    groupPlayers.forEach(player => {
        const stats = getPlayerDetailedStats(player.name);
        const isGoalKeeper = player.position.toLowerCase().includes('gk');
        const card = document.createElement('div');
        card.className = 'player-card';
        card.setAttribute('onclick', "this.classList.toggle('flipped')");

        const isCoach = category.title === 'TECHNICAL STAFF';
        const photoClass = isCoach ? 'player-photo coach-photo-bg' : 'player-photo';
        const displayNumber = player.number || (isCoach ? 'COACH' : '-');
        const captainBadge = player.isCaptain ? `<div class="captain-badge">C</div>` : '';

        let ageHTML = '';
        if (player.birthYear && !isCoach) { 
            ageHTML = `<div class="player-age">${player.birthYear} - ${currentYear - player.birthYear} ετών</div>`;
        }
        
        let backContent = '';
        if (stats.goalsLog.length > 0) {
            backContent += `<div class="stat-header">⚽ ${player.goals || 0} ΓΚΟΛ</div>`;
            stats.goalsLog.forEach(log => {
                let opponentInfo = log.match.replace('vs ', '').replace('ΟΛΥΜΠΟΣ ΔΕΝΔΡΟΠΟΤΑΜΟΥ', '').trim();
                const scoreMatch = opponentInfo.match(/\(\d+-\d+\)/);
                const scoreStr = scoreMatch ? scoreMatch[0].replace('(', '').replace(')', '') : '';
                let teamName = opponentInfo.replace(/\(\d+-\d+\)/, '').trim();
                
                // padding-left: 2px για να κολλήσει αριστερά και font-size: 0.65rem για να μικρύνει
                backContent += `
                    <div style="position: relative; padding: 5px 0 5px 2px; border-bottom: 1px solid rgba(0,0,0,0.05); min-height: 35px; text-align: left;">
                        <div style="font-weight: 650; font-size: 0.6rem; line-height: 1.2; padding-right: 52px; color: inherit;">
                            ${teamName}
                        </div>
                        <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); text-align: right; width: 48px;">
                            <div style="font-size: 0.55rem; color: #666; font-weight: bold;">${scoreStr}</div>
                            <div style="font-weight: 800; color: var(--primary-color); font-size: 0.7rem;">⚽&nbsp;<span class="goal-number-back">${log.count}</span></div>
                        </div>
                    </div>`;
            });
        } else if (!isGoalKeeper && !isCoach) {
            backContent += `<div class="stat-header" style="background:#ccc; color:#555;">⚽ ΚΑΝΕΝΑ ΓΚΟΛ</div>`;
        }

        if (isGoalKeeper && stats.cleanSheetsLog.length > 0) {
            backContent += `<div class="stat-header" style="background:#2e7d32;">🧤 ${player.cleanSheets || 0} CS</div>`;
            stats.cleanSheetsLog.forEach(log => {
                backContent += `
                    <div style="position: relative; padding: 5px 0 5px 2px; border-bottom: 1px solid rgba(0,0,0,0.05); text-align: left;">
                        <div style="font-weight: 700; font-size: 0.65rem; padding-right: 52px;">${log.match.replace('vs ', '')}</div>
                        <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-weight: 800; color: #2e7d32; font-size: 0.65rem;">🧤✅</div>
                    </div>`;
            });
        }

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div style="position:absolute; top:0; left:50%; transform:translateX(-50%); width:80%; height:4px; background:var(--primary-color); border-radius:0 0 6px 6px;"></div>
                    <div class="${photoClass}">
                        <div class="jersey-team-name">ΟΛΥΜΠΟΣ F.C.</div>
                        <div class="player-number">${displayNumber}</div>
                        ${captainBadge}
                    </div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-position">${player.position}</div>
                    ${ageHTML}
                </div>
                <div class="card-back">
                    <div style="position:relative; z-index:10; width:100%; padding: 8px;">
                        <h4 style="font-size: 0.85rem; font-weight: 800; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 8px; color: var(--primary-color); text-align: center;">${player.name}</h4>
                        ${backContent}
                    </div>
                </div>
            </div>`;
        gridDiv.appendChild(card);
    });
    container.appendChild(gridDiv);
    availablePlayers = availablePlayers.filter(p => !groupPlayers.includes(p));
}
    });
}
function displayTopScorers() {
    const container = document.getElementById('scorersContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!data.roster) return;

    const scorers = data.roster
.filter(p => p.goals && p.goals > 0)
.sort((a, b) => b.goals - a.goals);

    if (scorers.length === 0) {
container.innerHTML = '<div style="text-align: center; padding: 1rem; color: #999;">Δεν έχουν σημειωθεί γκολ ακόμα.</div>';
return;
    }

    const list = document.createElement('div');
    list.className = 'scorers-list';

    // Header
    const header = document.createElement('div');
    header.className = 'scorer-row scorer-header';
    header.innerHTML = `
<div class="col-rank">#</div>
<div class="col-name">Παίκτης</div>
<div class="col-goals">Goals</div>
    `;
    list.appendChild(header);

    scorers.forEach((player, index) => {
const rank = index + 1;
let rankClass = '';
if (rank === 1) rankClass = 'rank-1';
else if (rank === 2) rankClass = 'rank-2';
else if (rank === 3) rankClass = 'rank-3';

// Λογική: "Γιώργος Παπαδόπουλος" -> "Παπαδόπουλος Γ."
let displayName = player.name;
const parts = player.name.trim().split(' ');

if (parts.length >= 2) {
    const firstName = parts[0]; 
    const lastName = parts.slice(1).join(' ');
    displayName = `${lastName} ${firstName.charAt(0)}.`;
}

const row = document.createElement('div');
row.className = 'scorer-row';

row.innerHTML = `
    <div class="col-rank ${rankClass}">#${rank}</div>
    <div class="col-name" style="font-weight: 700;">${displayName}</div>
    <div class="col-goals">
        <span class="goals-badge">${player.goals}</span>
    </div>
`;
list.appendChild(row);
    });

    container.appendChild(list);
}
function addPlayer() {
    const number = parseInt(document.getElementById('playerNumber').value);
    const name = document.getElementById('playerName').value.trim();
    const birthYear = parseInt(document.getElementById('playerBirthYear').value);
    const positionSelect = document.getElementById('playerPosition');
    const selectedOptions = Array.from(positionSelect.selectedOptions).map(opt => opt.value);
    const position = selectedOptions.filter(p => p !== '').join(' / ');
    const isCaptain = document.getElementById('isCaptainPlayer').checked;

    if (!name || !position) {
showToast(' Συμπλήρωσε Όνομα και Θέση!');
return;
    }
    
    // Έλεγχος αριθμού
    if (number && data.roster && data.roster.some(p => p.number === number)) {
showToast(' Ο αριθμός φανέλας υπάρχει ήδη!');
return;
    }

    if (!data.roster) data.roster = [];

    data.roster.push({ 
number: number || null, 
name, 
birthYear: birthYear || null,
position,
isCaptain: isCaptain,
goals: 0 // ΝΕΟ: Αρχικοποίηση γκολ
    });
    
    saveData(data);
    displayRoster();
    displayTopScorers(); // ΝΕΟ
    updateRosterList();
    clearPlayerForm();
    showToast(' Ο παίκτης προστέθηκε επιτυχώς!');
}

function clearPlayerForm() {
    document.getElementById('playerNumber').value = '';
    document.getElementById('playerName').value = '';
    document.getElementById('playerBirthYear').value = ''; // Καθαρισμός έτους
    document.getElementById('isCaptainPlayer').checked = false;
    const select = document.getElementById('playerPosition');
    for (let option of select.options) {
option.selected = false;
    }
}

function updateRosterList() {
    const container = document.getElementById('rosterList');
    container.innerHTML = '';

    if (!data.roster || data.roster.length === 0) {
container.innerHTML = '<div style="text-align: center; color: #999;">Δεν υπάρχουν παίκτες</div>';
return;
    }

    const sortedRoster = [...data.roster].sort((a, b) => (a.number || 999) - (b.number || 999));

    sortedRoster.forEach((player) => {
const div = document.createElement('div');
div.className = 'roster-item';

const displayNum = player.number ? `#${player.number}` : '—';
const currentGoals = player.goals || 0;
const currentCS = player.cleanSheets || 0;
const isCoach = player.position && player.position.includes('Προπονητής');
const icon = isCoach ? '👨‍🏫' : '';

div.innerHTML = `
    <div style="flex: 1;">
        <strong>${displayNum}</strong> ${player.name} ${icon}
        <div style="font-size: 0.8rem; color: #666;">${player.position}</div>
    </div>
    
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
        <div style="display:flex; gap:5px;">
            <div style="font-weight: bold; color: #1a472a; background: #e8f5e9; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; border: 1px solid #c8e6c9;">
                ⚽ ${currentGoals}
            </div>
            <div style="font-weight: bold; color: #333; background: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; border: 1px solid #ccc;">
                🧤 ${currentCS}
            </div>
        </div>
    </div>

    <button class="btn btn-danger btn-small" 
            style="margin-left: 10px; height: 35px !important; width: 35px !important; padding: 0 !important; display: flex; align-items: center; justify-content: center;" 
            onclick="deletePlayer('${player.number || player.name}')">🗑️</button>
`;
container.appendChild(div);
    });
}
function deletePlayer(identifier) {
    if (confirm('⚠️ Θέλεις να διαγράψεις αυτόν τον παίκτη;')) {
data.roster = data.roster.filter(p => 
    p.number !== identifier && p.name !== identifier
);
saveData(data);
displayRoster();
displayTopScorers();
updateRosterList();
showToast(' Ο παίκτης διαγράφηκε!');
    }
}
// ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Αλλαγή γκολ από το Admin
function changeGoals(playerName, change) {
    const player = data.roster.find(p => p.name === playerName);
    if (player) {
if (!player.goals) player.goals = 0;
player.goals += change;
if (player.goals < 0) player.goals = 0; // Όχι αρνητικά γκολ

saveData(data);
updateRosterList(); // Ενημέρωση λίστας admin
displayTopScorers(); // Ενημέρωση πίνακα σκόρερ
    }
}

// ===== ΔΙΑΧΕΙΡΙΣΗ ΝΕΩΝ - ΕΙΔΗΣΕΩΝ =====
let newsPhotoBase64 = null;

function previewNewsPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
showToast(' Παρακαλώ επίλεξε μόνο εικόνες!');
event.target.value = '';
return;
    }

    if (file.size > 5 * 1024 * 1024) {
showToast(' Η φωτογραφία είναι πολύ μεγάλη! Μέγιστο μέγεθος: 5MB');
event.target.value = '';
return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
newsPhotoBase64 = e.target.result;
document.getElementById('newsPhotoPreview').style.display = 'block';
document.getElementById('newsPhotoPreviewImg').src = newsPhotoBase64;
    };
    reader.readAsDataURL(file);
}

function removeNewsPhoto() {
    newsPhotoBase64 = null;
    document.getElementById('newsPhoto').value = '';
    document.getElementById('newsPhotoPreview').style.display = 'none';
    document.getElementById('newsPhotoPreviewImg').src = '';
}
function displayNews() {
    const container = document.getElementById('newsContainer');
    container.innerHTML = '';

    if (!data.news) { data.news = []; }

    if (data.news.length === 0) {
container.innerHTML = '<div class="no-news">📭 Δεν υπάρχουν ειδήσεις αυτή τη στιγμή</div>';
return;
    }

    // Ταξινόμηση
    const sortedNews = [...data.news].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedNews.forEach(newsItem => {
const div = document.createElement('div');
// ΠΡΟΣΟΧΗ: Δίνουμε μοναδικό ID στο div για να το βρίσκουμε μετά
div.id = `news-item-${newsItem.id}`; 
div.className = 'news-item collapsed';

const formattedDate = new Date(newsItem.date).toLocaleDateString('el-GR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
});

let imageHTML = '';
if (newsItem.photo) {
    imageHTML = `<img src="${newsItem.photo}" class="news-image" alt="News Photo">`;
}

// Προσθέσαμε το κουμπί Share κάτω από τον τίτλο
div.innerHTML = `
    <div class="news-header">
        <div>
            <h3 class="news-title">${newsItem.title} <span class="news-toggle">🔽</span></h3>
            <span class="news-date">${formattedDate}</span>
        </div>
        <button class="btn-share" onclick="event.stopPropagation(); openShareModal(${newsItem.id})">
            📤 Share
        </button>
    </div>
    <div class="news-content">${newsItem.content}</div>
    ${imageHTML}
`;

// Λογική για άνοιγμα/κλείσιμο
div.addEventListener('click', function() {
    this.classList.toggle('collapsed');
});

container.appendChild(div);
    });
}

function addNews() {
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();

    if (!title || !content) {
        showToast(' Συμπλήρωσε τίτλο και περιεχόμενο!');
        return;
    }

    if (!data.news) {
        data.news = [];
    }

  const newsItem = {
    id: Date.now(),
    title: title,
    content: content,
    date: new Date().toISOString(),
    photo: newsPhotoBase64
};

    data.news.push(newsItem);
    saveData(data);
    displayNews();
    updateNewsList();
    clearNewsForm();
    showToast('Η είδηση προστέθηκε επιτυχώς!');
}

function deleteNews(id) {
    if (confirm('⚠️ Θέλεις να διαγράψεις αυτή την είδηση;')) {
        data.news = data.news.filter(n => n.id !== id);
        saveData(data);
        displayNews();
        updateNewsList();
        showToast(' Η είδηση διαγράφηκε!');
    }
}

function clearNewsForm() {
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsContent').value = '';
    removeNewsPhoto();
}

function updateNewsList() {
    const container = document.getElementById('newsList');
    container.innerHTML = '';

    if (!data.news) {
        data.news = [];
    }

    if (data.news.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">Δεν υπάρχουν ειδήσεις</div>';
        return;
    }

    const sortedNews = [...data.news].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedNews.forEach(newsItem => {
        const div = document.createElement('div');
        div.className = 'roster-item';
        const shortContent = newsItem.content.length > 50 
            ? newsItem.content.substring(0, 50) + '...' 
            : newsItem.content;
        
        div.innerHTML = `
            <div>
                <strong>${newsItem.title}</strong><br>
                <span style="color: #666; font-size: 0.85rem;">${shortContent}</span>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteNews(${newsItem.id})">🗑️</button>
        `;
        container.appendChild(div);
    });
}

       // Κώδικας Πλοήγησης (Με αυτόματο κλείσιμο καρτών & σβήσιμο NEW)
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
e.preventDefault();

// 1. ΑΝ ΠΑΤΗΣΟΥΜΕ ΤΑ "ΝΕΑ", ΣΒΗΝΟΥΜΕ ΤΟ BADGE ΑΜΕΣΩΣ
if (this.getAttribute('href') === '#news') {
    markNewsAsRead(); // Καλεί τη συνάρτηση που το κρύβει και το αποθηκεύει
}

// 2. Κλείνουμε τυχόν γυρισμένες κάρτες παικτών
document.querySelectorAll('.player-card.flipped').forEach(card => {
    card.classList.remove('flipped');
});

// 3. Η κανονική αλλαγή σελίδας
document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

this.classList.add('active');
const targetPage = this.getAttribute('href').substring(1);
document.getElementById(targetPage).classList.add('active');

window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

function openAdminPanel() {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function closeAdminPanel() {
    document.getElementById('adminModal').classList.remove('active');
}
function saveGeneralSettings() {
    console.log('🔄 Ξεκινάει η διαδικασία αποθήκευσης (Full Version)...');

    // ---------------------------------------------------------
    // 1. ΑΠΟΘΗΚΕΥΣΗ ΡΥΘΜΙΣΕΩΝ & LIVE (Όπως πριν)
    // ---------------------------------------------------------
    const dateInput = document.getElementById('matchDateInput');
    const timeInput = document.getElementById('matchTimeInput');
    const stadiumInput = document.getElementById('matchStadiumInput');
    const mapInput = document.getElementById('matchMapLinkInput');
    const countdownInput = document.getElementById('countdownTargetInput');
    const announcementInput = document.getElementById('announcementInput');

    if (dateInput) data.matchDate = dateInput.value;
    if (timeInput) data.matchTime = timeInput.value;
    if (stadiumInput) data.matchStadium = stadiumInput.value;
    if (mapInput) data.matchMapLink = mapInput.value;
    if (countdownInput) data.countdownTarget = countdownInput.value;
    if (announcementInput) data.announcement = announcementInput.value;

    // Live Score Settings
    const liveCheck = document.getElementById('liveModeCheckbox');
    const liveHome = document.getElementById('liveHomeScore');
    const liveAway = document.getElementById('liveAwayScore');
    const liveHalf = document.getElementById('liveHalf');
    const liveDur = document.getElementById('liveHalfDuration');
    const liveStart = document.getElementById('liveStartTime');

    if (!data.liveScore) data.liveScore = {};
    if (liveCheck) data.liveScore.active = liveCheck.checked;
    if (liveHome) data.liveScore.home = liveHome.value || 0;
    if (liveAway) data.liveScore.away = liveAway.value || 0;
    if (liveHalf) data.liveScore.half = liveHalf.value;
    if (liveDur) data.liveScore.duration = liveDur.value || 20;
    if (liveStart) data.liveScore.startTime = liveStart.value;

    // Special Match
    const specialCheck = document.getElementById('useSpecialMatchCheckbox');
    const specialType = document.getElementById('specialMatchTypeInput');
    const specialHome = document.getElementById('specialHomeInput');
    const specialAway = document.getElementById('specialAwayInput');

    if (!data.specialMatch) data.specialMatch = {};
    if (specialCheck && specialCheck.checked) {
data.specialMatch.type = specialType ? specialType.value : 'ΦΙΛΙΚΟΣ ΑΓΩΝΑΣ';
data.specialMatch.home = specialHome ? specialHome.value : '';
data.specialMatch.away = specialAway ? specialAway.value : '';
    } else {
data.specialMatch.home = null;
data.specialMatch.away = null;
    }

    // ---------------------------------------------------------
    // 2. ΑΠΟΘΗΚΕΥΣΗ ΣΚΟΡ & ΣΚΟΡΕΡ (Το Νέο Κομμάτι)
    // ---------------------------------------------------------
    if (data.fixtures) {
data.fixtures.forEach((round, roundIndex) => {
    round.matches.forEach((match, matchIndex) => {
        // Βρίσκουμε τα input scores
        const homeScoreIn = document.getElementById(`score-home-${roundIndex}-${matchIndex}`);
        const awayScoreIn = document.getElementById(`score-away-${roundIndex}-${matchIndex}`);
        const postponeIn = document.getElementById(`postpone-${roundIndex}-${matchIndex}`);

        // Α. Αποθήκευση Σκορ (Νούμερα)
        if (homeScoreIn) {
            const hVal = homeScoreIn.value.trim();
            match.homeScore = (hVal === '') ? null : parseInt(hVal);
        }
        if (awayScoreIn) {
            const aVal = awayScoreIn.value.trim();
            match.awayScore = (aVal === '') ? null : parseInt(aVal);
        }
        if (postponeIn) {
            match.postponed = postponeIn.checked;
        }

        // Β. Αποθήκευση Σκόρερ (ΑΥΤΟ ΕΛΕΙΠΕ!)
        // Βρίσκουμε τη γραμμή (row) του αγώνα
        if (homeScoreIn) {
            // Πάμε στον γονέα (τη γραμμή) για να ψάξουμε μέσα της
            const row = homeScoreIn.closest('.match-input-row') || homeScoreIn.parentElement.parentElement;
            
            if (row) {
                // Ψάχνουμε όλα τα ταμπελάκια με την κλάση .scorer-tag μέσα σε αυτή τη γραμμή
                const scorerTags = row.querySelectorAll('.scorer-tag');
                
                // Φτιάχνουμε μια νέα λίστα και βάζουμε τα ονόματα
                const currentScorers = [];
                scorerTags.forEach(tag => {
                    // Παίρνουμε το κείμενο και καθαρίζουμε τυχόν κενά ή το "x"
                    // (Υποθέτουμε ότι το όνομα είναι το κείμενο του tag)
                    let name = tag.innerText.replace('×', '').trim(); // Αφαιρούμε το x κλεισίματος αν υπάρχει στο text
                    if(name) currentScorers.push(name);
                });

                // Ενημερώνουμε τα δεδομένα!
                match.scorers = currentScorers;
            }
        }
    });
});
    }

    // ---------------------------------------------------------
    // 3. ΛΗΨΗ ΑΡΧΕΙΟΥ
    // ---------------------------------------------------------
    saveData(data); 
    
    displayNextMatch();
    displayStandings() 

    showToast('Οι αλλαγές αποθηκεύτηκαν επιτυχώς!');
}
let countdownInterval = null; // Μεταβλητή για να σταματάμε το χρονόμετρο αν χρειαστεί
function displayNextMatch() {
    const container = document.getElementById('nextMatchContainer');
    if (!container || !data) return;
    container.innerHTML = '';

    let nextMatch = null;
    let matchType = 'ΕΠΟΜΕΝΟΣ ΑΓΩΝΑΣ';

    // 1. Έλεγχος για Εμβόλιμο Αγώνα
    if (data.specialMatch && data.specialMatch.home) {
nextMatch = { home: data.specialMatch.home, away: data.specialMatch.away };
matchType = data.specialMatch.type || 'ΕΜΒΟΛΙΜΟΣ ΑΓΩΝΑΣ';
    } else {
// 2. Εύρεση επόμενου αγώνα
for (const round of data.fixtures) {
    const m = round.matches.find(m => (m.home === MY_TEAM || m.away === MY_TEAM) && m.homeScore === null);
    if (m) { nextMatch = m; break; }
}
    }

    if (!nextMatch) return;

    // Logic για Live Score
    const isLive = data.liveScore && data.liveScore.active;
    let liveMinuteDisplay = "";
    if (isLive) {
liveMinuteDisplay = calculateLiveMinute(
    data.liveScore.startTime, 
    data.liveScore.half, 
    data.liveScore.duration
);
    }
    
    const countdownStyle = isLive ? 'display: none;' : 'display: block;';

    // HTML Κάρτας
    container.innerHTML = `
<div class="next-match-card" style="${isLive ? 'border: 2px solid #ff0046;' : ''}">
    <div class="nm-header" style="${isLive ? 'background:#fff0f3; color:#ff0046;' : ''}">
        <span>📅 ${data.matchDate || ''}</span>
        <span style="font-weight:800; text-transform: uppercase;">${isLive ? '🔴 LIVE NOW' : matchType}</span>
        <span>⏰ ${data.matchTime || ''}</span>
    </div>
    
    <div id="countdown-display" style="background: var(--primary-color); color: #fff; text-align: center; padding: 5px; font-size: 0.9rem; font-weight: bold; ${countdownStyle}">
    </div>

    <div class="nm-body">
        <div class="nm-team home ${nextMatch.home === MY_TEAM ? 'my-team' : ''}">${nextMatch.home}</div>
        
        <div class="center-area">
            ${isLive ? `
                <div style="text-align:center;">
                    <div style="color:#ff0046; font-weight:bold; font-size:1.1rem;">${liveMinuteDisplay}</div>
                    <div class="live-badge-pulse">LIVE</div>
                    <div class="live-score-display" style="font-size:2.5rem; font-weight:900; margin:0; color:var(--text-dark);">
                        ${data.liveScore.home || 0} - ${data.liveScore.away || 0}
                    </div>
                </div>
            ` : `<div class="nm-vs">VS</div>`}
        </div>

        <div class="nm-team away ${nextMatch.away === MY_TEAM ? 'my-team' : ''}">${nextMatch.away}</div>
    </div>
    <div class="nm-stadium">🏟️ ${data.matchStadium || ''}</div>
    
    <div class="nm-footer" style="display: flex; padding: 0; align-items: stretch; height: 50px;">
        
        <a href="${data.matchMapLink || '#'}" target="_blank" 
           style="flex: 1; display: flex; align-items: center; justify-content: center; color: white; text-decoration: none; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.5px;">
            📍 ΟΔΗΓΙΕΣ ΓΙΑ ΤΟ ΓΗΠΕΔΟ
        </a>

        <div style="width: 1px; background: rgba(255,255,255,0.2); margin: 10px 0;"></div>

        <div onclick="openSquadModal('${nextMatch.home}', '${nextMatch.away}', '${data.matchDate}', '${data.matchTime}', '${data.matchStadium}', '${data.matchMapLink}')" 
             style="width: 60px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(0,0,0,0.1); transition: background 0.3s;"
             onmouseover="this.style.background='rgba(0,0,0,0.2)'" 
             onmouseout="this.style.background='rgba(0,0,0,0.1)'">
             <i class="fa-solid fa-share-nodes" style="color: white; font-size: 1.4rem;"></i>
        </div>

    </div>
</div>
    `;

    if (!isLive && data.countdownTarget) {
startCountdown(data.countdownTarget);
    }
}
// ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Υπολογισμός Χρόνου
function startCountdown(targetDateString) {
    const display = document.getElementById('countdown-display');
    if (!display) return;

    const targetDate = new Date(targetDateString).getTime();
    
    // Καθαρισμός προηγούμενου χρονομέτρου για να μην τρέχουν διπλά
    if (countdownInterval) clearInterval(countdownInterval);

    // Συνάρτηση που τρέχει κάθε δευτερόλεπτο
    const updateTimer = () => {
const now = new Date().getTime();
const distance = targetDate - now;

// Ορίζουμε το όριο των 3 ημερών σε χιλιοστά του δευτερολέπτου
// 3 μέρες * 24 ώρες * 60 λεπτά * 60 δευτ * 1000 ms
const daysLimit = 3 * 24 * 60 * 60 * 1000;

// 1. ΑΝ ΑΠΕΧΟΥΜΕ ΠΑΝΩ ΑΠΟ 3 ΜΕΡΕΣ -> ΚΡΥΨΤΟ
if (distance > daysLimit) {
    display.style.display = 'none';
    return; // Σταματάμε εδώ, δεν χρειάζεται να υπολογίσει χρόνο
}

// 2. ΑΝ ΕΙΜΑΣΤΕ ΕΝΤΟΣ 3 ΗΜΕΡΩΝ -> ΕΜΦΑΝΙΣΗ
display.style.display = 'block';

// Έλεγχος αν έληξε
if (distance < 0) {
    clearInterval(countdownInterval);
    display.innerHTML = "🔴 LIVE / ΟΛΟΚΛΗΡΩΘΗΚΕ";
    display.style.background = "#d32f2f"; 
    return;
}

// Υπολογισμός χρόνου
const days = Math.floor(distance / (1000 * 60 * 60 * 24));
const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
const seconds = Math.floor((distance % (1000 * 60)) / 1000);

display.innerHTML = `⏳ Σέντρα σε: ${days}μ ${hours}ω ${minutes}λ ${seconds}δ`;
    };

    // Το τρέχουμε μία φορά αμέσως για να κρυφτεί/φανεί χωρίς καθυστέρηση
    updateTimer();

    // Ξεκινάμε την επανάληψη κάθε δευτερόλεπτο
    countdownInterval = setInterval(updateTimer, 1000);
}
function checkPassword() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
// 1. Εμφάνιση του Admin Panel
document.getElementById('loginForm').style.display = 'none';
document.getElementById('adminContent').style.display = 'block';

// 2. ΕΛΕΓΧΟΣ ΓΙΑ "ΠΡΟΧΕΙΡΑ" ΔΕΔΟΜΕΝΑ (DRAFTS)
const localDraft = localStorage.getItem('footballData');

if (localDraft) {
    // Ρωτάμε τον Admin τι θέλει να κάνει
    const userChoice = confirm(
        "⚠️ ΒΡΕΘΗΚΑΝ ΑΠΟΘΗΚΕΥΜΕΝΕΣ ΑΛΛΑΓΕΣ ΣΤΟΝ ΥΠΟΛΟΓΙΣΤΗ ΣΟΥ!\n\n" +
        "Πατήστε 'OK' για να συνεχίσετε την επεξεργασία τους (Draft).\n" +
        "Πατήστε 'Ακύρωση' για να φορτώσετε τα δεδομένα του GitHub (Live)."
    );

    if (userChoice) {
        // Φόρτωσε τα τοπικά
        data = JSON.parse(localDraft);
        console.log('✏️ Admin: Φορτώθηκαν τα τοπικά Drafts.');
    } else {
        // Κράτα του GitHub (που έχουν ήδη φορτώσει από το loadData)
        // Και ΚΑΘΑΡΙΣΕ τα τοπικά για να μην μπερδεύουν
        localStorage.removeItem('footballData');
        console.log('☁️ Admin: Φορτώθηκαν τα Live δεδομένα. Τα τοπικά διαγράφηκαν.');
    }
}

// 3. Ενημέρωση της φόρμας με τα δεδομένα που επιλέχθηκαν (Local ή GitHub)
refreshAdminForms();

    } else {
showToast(' Λάθος κωδικός!');
    }
}

// Βοηθητική συνάρτηση για να γεμίσουν τα κουτάκια (για να μην γράφουμε τον ίδιο κώδικα 2 φορές)
function refreshAdminForms() {
    loadRoundSelector();
    updateRosterList();
    updateNewsList();
    
    if (data) {
// Γενικά
document.getElementById('announcementInput').value = data.announcement || '';
document.getElementById('matchDateInput').value = data.matchDate || '';
document.getElementById('matchTimeInput').value = data.matchTime || '';
document.getElementById('matchStadiumInput').value = data.matchStadium || '';
document.getElementById('matchMapLinkInput').value = data.matchMapLink || '';
document.getElementById('countdownTargetInput').value = data.countdownTarget || '';

// Live Score
if (data.liveScore) {
    document.getElementById('liveModeCheckbox').checked = data.liveScore.active || false;
    document.getElementById('liveHomeScore').value = data.liveScore.home ?? 0;
    document.getElementById('liveAwayScore').value = data.liveScore.away ?? 0;
    document.getElementById('liveHalf').value = data.liveScore.half || "1";
    document.getElementById('liveHalfDuration').value = data.liveScore.duration || 20;
    document.getElementById('liveStartTime').value = data.liveScore.startTime || "";
    document.getElementById('liveInputs').style.display = data.liveScore.active ? 'block' : 'none';
}

// Special Match
if (data.specialMatch) {
    document.getElementById('useSpecialMatchCheckbox').checked = (data.specialMatch.home !== null);
    document.getElementById('specialMatchTypeInput').value = data.specialMatch.type || '';
    document.getElementById('specialHomeInput').value = data.specialMatch.home || '';
    document.getElementById('specialAwayInput').value = data.specialMatch.away || '';
    toggleSpecialMatchFields();
}
    }
}
 function loadRoundSelector() {
    const select = document.getElementById('roundSelect');
    select.innerHTML = '<option value="">-- Επέλεξε Αγωνιστική --</option>';
    
    data.fixtures.forEach(round => {
        const option = document.createElement('option');
        option.value = round.round;
        option.textContent = `Αγωνιστική ${round.round}`;
        select.appendChild(option);
    });
}

  function loadMatchesForRound() {
    const roundNum = parseInt(document.getElementById('roundSelect').value);
    if (!roundNum) {
document.getElementById('matchInputs').innerHTML = '';
return;
    }

    const round = data.fixtures.find(r => r.round === roundNum);
    const container = document.getElementById('matchInputs');
    container.innerHTML = '<h4 style="margin-bottom: 1rem;">Αποτελέσματα & Στατιστικά:</h4>';

    round.matches.forEach((match, index) => {
const div = document.createElement('div');
div.className = 'match-input-row';
div.style.flexDirection = 'column'; 

const homeTeam = match.home || 'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ';
const awayTeam = match.away || 'ΚΥΨΕΛΗ ΝΕΑΠΟΛΗΣ';
const isPostponed = match.isPostponed ? 'checked' : '';
const bgStyle = match.isPostponed ? 'background: #eee;' : '';

// Έλεγχος αν παίζει ο Όλυμπος
const isMyTeamPlaying = homeTeam === MY_TEAM || awayTeam === MY_TEAM;
let statsHTML = '';

if (isMyTeamPlaying) {
    // --- SCORERS ---
    let existingScorersList = '';
    if (match.scorers && match.scorers.length > 0) {
        match.scorers.forEach((s, sIndex) => {
            existingScorersList += `
                <div class="scorer-tag">
                    ⚽ ${s} 
                    <span style="color:red; cursor:pointer; margin-left:5px;" onclick="removeScorer(${roundNum}, ${index}, ${sIndex})">✖</span>
                </div>`;
        });
    }

    // --- CLEAN SHEETS (GK) ---
    let existingCSList = '';
    if (match.cleanSheetHolders && match.cleanSheetHolders.length > 0) {
        match.cleanSheetHolders.forEach((gk, gkIndex) => {
            existingCSList += `
                <div class="scorer-tag" style="border-color: #4caf50;">
                    🧤 ${gk} 
                    <span style="color:red; cursor:pointer; margin-left:5px;" onclick="removeCleanSheetFromMatch(${roundNum}, ${index}, ${gkIndex})">✖</span>
                </div>`;
        });
    }

    // Dropdown παικτών
    let playerOptions = '<option value="">-- Επέλεξε Παίκτη --</option>';
    if (data.roster) {
        data.roster.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
            playerOptions += `<option value="${p.name}">${p.name}</option>`;
        });
    }

    statsHTML = `
        <div style="display:flex; gap: 5px; width: 100%; margin-top: 5px;">
            <button type="button" class="admin-scorers-btn" onclick="togglePanel('scorer', ${index})">⚽ Σκόρερ</button>
            <button type="button" class="admin-scorers-btn" style="background:#f1f8e9; color:#2e7d32; border-color:#a5d6a7;" onclick="togglePanel('cs', ${index})">🧤 Clean Sheet</button>
        </div>
        
        <div id="scorer-panel-${index}" class="admin-scorers-panel">
            <div style="font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Διαχείριση Σκόρερ:</div>
            <div id="scorers-list-${index}">${existingScorersList}</div>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <select id="new-scorer-select-${index}" style="padding:5px; flex:1;">${playerOptions}</select>
                <button class="btn btn-success btn-small" onclick="addScorerToMatch(${roundNum}, ${index})">➕</button>
            </div>
        </div>

        <div id="cs-panel-${index}" class="admin-scorers-panel" style="background: #e8f5e9; border-color: #a5d6a7;">
            <div style="font-size:0.8rem; font-weight:bold; margin-bottom:5px; color:#1b5e20;">🧤 Ποιος κράτησε το μηδέν;</div>
            <div id="cs-list-${index}">${existingCSList}</div>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <select id="new-cs-select-${index}" style="padding:5px; flex:1;">${playerOptions}</select>
                <button class="btn btn-success btn-small" onclick="addCleanSheetToMatch(${roundNum}, ${index})">➕</button>
            </div>
        </div>
    `;
}

div.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 140px 1fr; gap: 1rem; align-items: center; width:100%;">
        <div><input type="text" value="${homeTeam}" disabled style="font-weight: 600; background: #f5f5f5; width: 100%;"></div>
        <div class="score-inputs-wrapper">
            <div class="score-inputs">
                <input type="number" class="score-input" id="home-${roundNum}-${index}" value="${match.homeScore !== null ? match.homeScore : ''}" min="0" placeholder="0" style="${bgStyle}">
                <span>-</span>
                <input type="number" class="score-input" id="away-${roundNum}-${index}" value="${match.awayScore !== null ? match.awayScore : ''}" min="0" placeholder="0" style="${bgStyle}">
            </div>
            <label class="postpone-label"><input type="checkbox" id="postponed-${roundNum}-${index}" ${isPostponed}> Αναβλήθηκε</label>
        </div>
        <div><input type="text" value="${awayTeam}" disabled style="font-weight: 600; background: #f5f5f5; width: 100%;"></div>
    </div>
    ${statsHTML}
`;
container.appendChild(div);
    });
}
// Βοηθητικές Συναρτήσεις (ΠΡΟΣΘΕΣΕ ΤΕΣ ΚΑΤΩ ΑΠΟ ΤΗΝ loadMatchesForRound)
function toggleScorerPanel(index) {
    const panel = document.getElementById(`scorer-panel-${index}`);
    if (panel.style.display === 'none' || panel.style.display === '') {
panel.style.display = 'block';
    } else {
panel.style.display = 'none';
    }
}

function addScorerToMatch(roundNum, matchIndex) {
    const select = document.getElementById(`new-scorer-select-${matchIndex}`);
    const playerName = select.value;
    
    if (!playerName) return;

    // Βρίσκουμε το ματς και προσθέτουμε τον σκόρερ
    const round = data.fixtures.find(r => r.round === roundNum);
    const match = round.matches[matchIndex];

    if (!match.scorers) match.scorers = [];
    match.scorers.push(playerName);

    // Ανανεώνουμε ΜΟΝΟ το Admin UI (δεν σώζουμε ακόμα)
    saveData(data); // Σώζουμε προσωρινά για να μην χαθεί στο refresh του UI
    loadMatchesForRound(); // Ξαναφορτώνουμε για να φανεί η αλλαγή
}

function removeScorer(roundNum, matchIndex, scorerIndex) {
    const round = data.fixtures.find(r => r.round === roundNum);
    const match = round.matches[matchIndex];
    
    if (match.scorers) {
match.scorers.splice(scorerIndex, 1);
saveData(data);
loadMatchesForRound();
    }
}

function saveResults() {
    const roundNum = parseInt(document.getElementById('roundSelect').value);
    if (!roundNum) {
showToast('Επέλεξε πρώτα μια αγωνιστική!');
return;
    }

    const round = data.fixtures.find(r => r.round === roundNum);
    
    round.matches.forEach((match, index) => {
if (!match.home || !match.away) return;

const homeInput = document.getElementById(`home-${roundNum}-${index}`);
const awayInput = document.getElementById(`away-${roundNum}-${index}`);
const postponedInput = document.getElementById(`postponed-${roundNum}-${index}`);

const isPostponed = postponedInput.checked;

// Αν τσεκαριστεί το "Αναβλήθηκε", αποθηκεύουμε true και σβήνουμε τα σκορ
if (isPostponed) {
    match.isPostponed = true;
    match.homeScore = null;
    match.awayScore = null;
    // Καθαρίζουμε και τα inputs οπτικά
    homeInput.value = '';
    awayInput.value = '';
} else {
    // Αν ΔΕΝ είναι αναβληθέν, αποθηκεύουμε τα σκορ κανονικά
    match.isPostponed = false;
    const homeScore = homeInput.value !== '' ? parseInt(homeInput.value) : null;
    const awayScore = awayInput.value !== '' ? parseInt(awayInput.value) : null;
    
    match.homeScore = homeScore;
    match.awayScore = awayScore;
}
    });

    saveData(data);
    
    displayStandings();
    displayResults();
    displayFixtures();

    showToast('Οι αλλαγές αποθηκεύτηκαν επιτυχώς!');
}

function resetAllData() {
    if (confirm('⚠️ ΠΡΟΣΟΧΗ! Θα διαγραφούν ΟΛΑ τα δεδομένα (αποτελέσματα & ρόστερ). Είσαι σίγουρος;')) {
        if (confirm('Τελευταία επιβεβαίωση - Θα χαθούν όλα τα δεδομένα!')) {
            localStorage.removeItem('footballData');
            data = { fixtures: JSON.parse(JSON.stringify(FIXTURES)), roster: [], news: [] };
            displayStandings();
            displayResults();
            displayFixtures();
            displayRoster();
            displayNews();
            updateRosterList();
            updateNewsList();
            showToast(' Όλα τα δεδομένα διαγράφηκαν!');
            closeAdminPanel();
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Περίμενε να φορτώσουν τα δεδομένα (είτε από localStorage, είτε από fetch, είτε από fallback)
    data = await loadData(); 

    // Έλεγχος αν υπάρχει το news array, αν όχι το προσθέτουμε
    if (!data.news) {
data.news = [];
    }
// (NEO) --- Φόρτωση και εμφάνιση του Ticker ---
const tickerBar = document.getElementById('announcement-ticker');
const tickerText = document.getElementById('announcement-text');

if (data && data.announcement && data.announcement.trim() !== '') {
    tickerText.textContent = data.announcement;
    tickerBar.style.display = 'block';
}
// --- SMART AUTO-REFRESH (Χωρίς Τρεμόπαιγμα) ---
setInterval(async () => {
    const newData = await loadData();

    if (newData) {
// 1. ΣΥΓΚΡΙΣΗ: Κρατάμε "φωτογραφία" των παλιών ρυθμίσεων Live/Αγώνα
const prevMatchData = JSON.stringify({
    d: data.matchDate, 
    t: data.matchTime, 
    l: data.liveScore, 
    s: data.specialMatch, 
    c: data.countdownTarget
});

const newMatchData = JSON.stringify({
    d: newData.matchDate, 
    t: newData.matchTime, 
    l: newData.liveScore, 
    s: newData.specialMatch, 
    c: newData.countdownTarget
});

// 2. ΕΝΗΜΕΡΩΣΗ ΜΝΗΜΗΣ
data = newData;

// 3. Ανανέωση των πινάκων (μόνο αν ο χρήστης τους βλέπει εκείνη τη στιγμή)
// Εδώ δεν μας πειράζει το refresh γιατί δεν έχουν animations που χαλάνε
if (document.getElementById('standings').classList.contains('active')) {
    displayStandings();
    displayTopScorers();
}

if (document.getElementById('results').classList.contains('active')) {
    displayResults();
}

if (document.getElementById('fixtures').classList.contains('active')) {
    displayFixtures();
}

// 4. ΕΞΥΠΝΗ ΕΝΗΜΕΡΩΣΗ NEXT MATCH 💡
// Ξαναζωγραφίζουμε την κάρτα ΜΟΝΟ αν όντως άλλαξε κάτι στα δεδομένα της!
// Έτσι, το χρονόμετρο δεν θα εξαφανίζεται κάθε 20 δευτερόλεπτα.
if (prevMatchData !== newMatchData) {
    displayNextMatch();
}

// 5. Ticker & News
if (data.announcement) {
    const tickerText = document.getElementById('announcement-text');
    const tickerBar = document.getElementById('announcement-ticker');
    if (tickerText && tickerText.textContent !== data.announcement) {
        tickerText.textContent = data.announcement;
        tickerBar.style.display = 'block';
    }
}

checkNewNews();
    }
}, 20000); // Κάθε 20 δευτερόλεπτα
// --- Τέλος κώδικα Ticker ---
    // Τώρα που η μεταβλητή 'data' έχει τιμή, τρέξε τις συναρτήσεις εμφάνισης
    displayStandings();
    displayNextMatch();
    displayTopScorers();
    displayResults();
    displayFixtures();
    displayRoster();
    displayNews();
    checkDeepLink();
    checkNewNews();

});

document.getElementById('adminModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeAdminPanel();
    }
});
// --- MOBILE MENU LOGIC ---
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const navLinks = document.querySelectorAll(".nav-link");

// Όταν πατάς τις 3 γραμμές
if(hamburger) {
    hamburger.addEventListener("click", () => {
hamburger.classList.toggle("active");
navMenu.classList.toggle("active");
    });
}

// Όταν πατάς ένα λινκ (π.χ. Ρόστερ), να κλείνει το μενού αυτόματα
navLinks.forEach(n => n.addEventListener("click", () => {
    if(hamburger) {
hamburger.classList.remove("active");
navMenu.classList.remove("active");
    }
}));
/* --- SHARE FUNCTIONALITY --- */
let currentShareId = null;

function openShareModal(id) {
    const item = data.news.find(n => n.id === id);
    if(!item) return;
    
    currentShareId = id;
    document.getElementById('shareTitlePreview').textContent = item.title;
    document.getElementById('shareModal').style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
    currentShareId = null;
}

function doShare(platform) {
    if(!currentShareId) return;
    
    // Δημιουργία του "Εξυπνου Link"
    // Παίρνει το site url και κολλάει το #news-12345
    const baseUrl = window.location.href.split('#')[0];
    const deepLink = `${baseUrl}#news-${currentShareId}`;
    
    const item = data.news.find(n => n.id === currentShareId);
    const text = `🔴 ${item.title}\n\nΔείτε το εδώ: ${deepLink}`;
    
    let url = '';
    
    if (platform === 'whatsapp') {
url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    } else if (platform === 'viber') {
url = `viber://forward?text=${encodeURIComponent(text)}`;
    } else if (platform === 'facebook') {
// ΣΗΜΕΙΩΣΗ: Το Facebook βλέπει μόνο το Link, όχι το κείμενο
url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLink)}`;
    } else if (platform === 'copy') {
navigator.clipboard.writeText(text).then(() => {
    showToast(' Το Link αντιγράφηκε!');
    closeShareModal();
}).catch(() => {
    prompt("Αντιγράψτε το link:", deepLink);
});
return;
    }
    
    if(url) {
window.open(url, '_blank');
closeShareModal();
    }
}

/* --- DEEP LINK HANDLER (Αυτό ανοίγει την είδηση) --- */
function checkDeepLink() {
    // Ελέγχουμε αν το URL έχει hash τύπου #news-12345
    const hash = window.location.hash;
    
    if (hash && hash.startsWith('#news-')) {
const id = hash.replace('#news-', '');

// 1. Πάμε στη σελίδα Νέα
document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

// Βρίσκουμε το Link των νέων και το κάνουμε active
const newsLink = document.querySelector('a[href="#news"]');
if(newsLink) newsLink.classList.add('active');
document.getElementById('news').classList.add('active');

// 2. Περιμένουμε λίγο να "χτιστεί" το HTML από το displayNews
setTimeout(() => {
    const element = document.getElementById(`news-item-${id}`);
    if (element) {
        // 3. Ανοίγουμε την είδηση (αφαιρούμε το collapsed)
        element.classList.remove('collapsed');
        // 4. Σκρολάρουμε εκεί
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 5. Ένα μικρό εφέ (αναβοσβήνει)
        element.style.border = "2px solid var(--accent-color)";
        setTimeout(() => {
            element.style.border = "";
        }, 2000);
    }
}, 100); // Μικρή καθυστέρηση 0.1 δευτ.
    }
}
/* --- HELPER FUNCTIONS FOR STATS (SCORERS & CLEAN SHEETS) --- */
// 1. ΕΛΕΓΧΟΣ ΓΙΑ ΝΕΕΣ ΕΙΔΗΣΕΙΣ (Καλείται όταν φορτώνει η σελίδα)
function checkNewNews() {
    if (!data.news || data.news.length === 0) return;

    // Βρίσκουμε την πιο πρόσφατη είδηση (η πρώτη στη λίστα μετά το sort)
    // Επειδή έχουμε ήδη σορτάρει τα news στο displayNews, παίρνουμε το πιο πρόσφατο από τα data
    // Θα κάνουμε ένα γρήγορο sort εδώ για σιγουριά
    const latestNews = [...data.news].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (!latestNews) return;

    const latestId = latestNews.id;
    const lastReadId = localStorage.getItem('lastReadNewsId');

    // Αν το ID της τελευταίας είδησης είναι διαφορετικό από αυτό που αποθηκεύσαμε
    // σημαίνει ότι υπάρχει κάτι νέο!
    if (latestId.toString() !== lastReadId) {
const badge = document.getElementById('newsBadge');
if (badge) badge.style.display = 'inline-block';
    }
}

// 2. ΜΟΛΙΣ ΠΑΤΗΣΕΙ ΤΟ ΚΟΥΜΠΙ "ΝΕΑ"
function markNewsAsRead() {
    if (!data.news || data.news.length === 0) return;

    // Βρίσκουμε πάλι το πιο πρόσφατο
    const latestNews = [...data.news].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (latestNews) {
// Αποθηκεύουμε στο κινητό του χρήστη ότι "Είδε" αυτή την είδηση
localStorage.setItem('lastReadNewsId', latestNews.id);

// Κρύβουμε το σήμα
const badge = document.getElementById('newsBadge');
if (badge) badge.style.display = 'none';
    }
}
function togglePanel(type, index) {
    const panelId = type === 'scorer' ? `scorer-panel-${index}` : `cs-panel-${index}`;
    const panel = document.getElementById(panelId);
    
    // Κλείνουμε το άλλο panel για να μην είναι χαμός
    const otherType = type === 'scorer' ? 'cs' : 'scorer';
    document.getElementById(`${otherType}-panel-${index}`).style.display = 'none';

    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
}

// --- SCORERS LOGIC ---
function addScorerToMatch(roundNum, matchIndex) {
    const select = document.getElementById(`new-scorer-select-${matchIndex}`);
    const playerName = select.value;
    if (!playerName) return;

    const round = data.fixtures.find(r => r.round === roundNum);
    const match = round.matches[matchIndex];

    if (!match.scorers) match.scorers = [];
    match.scorers.push(playerName);

    // Αυτόματη αύξηση γκολ στο Ρόστερ
    const player = data.roster.find(p => p.name === playerName);
    if (player) {
if (!player.goals) player.goals = 0;
player.goals++;
    }

    saveAndRefresh();
}

function removeScorer(roundNum, matchIndex, scorerIndex) {
    const round = data.fixtures.find(r => r.round === roundNum);
    const match = round.matches[matchIndex];
    
    if (match.scorers) {
const playerName = match.scorers[scorerIndex];
match.scorers.splice(scorerIndex, 1);

// Αυτόματη μείωση γκολ στο Ρόστερ
const player = data.roster.find(p => p.name === playerName);
if (player && player.goals > 0) player.goals--;

saveAndRefresh();
    }
}

// --- CLEAN SHEETS LOGIC (ΝΕΟ) ---
function addCleanSheetToMatch(roundNum, matchIndex) {
    const select = document.getElementById(`new-cs-select-${matchIndex}`);
    const playerName = select.value;
    if (!playerName) return;

    const round = data.fixtures.find(r => r.round === roundNum);
    const match = round.matches[matchIndex];

    if (!match.cleanSheetHolders) match.cleanSheetHolders = [];
    
    // Έλεγχος: Μην βάλουμε τον ίδιο παίκτη 2 φορές στο ίδιο ματς
    if(match.cleanSheetHolders.includes(playerName)) {
showToast('Αυτός ο παίκτης έχει ήδη Clean Sheet σε αυτό το ματς!');
return;
    }

    match.cleanSheetHolders.push(playerName);

    // Αυτόματη αύξηση Clean Sheets στο Ρόστερ
    const player = data.roster.find(p => p.name === playerName);
    if (player) {
if (!player.cleanSheets) player.cleanSheets = 0;
player.cleanSheets++;
    }

    saveAndRefresh();
}

function removeCleanSheetFromMatch(roundNum, matchIndex, csIndex) {
    const round = data.fixtures.find(r => r.round === roundNum);
    const match = round.matches[matchIndex];
    
    if (match.cleanSheetHolders) {
const playerName = match.cleanSheetHolders[csIndex];
match.cleanSheetHolders.splice(csIndex, 1);

// Αυτόματη μείωση Clean Sheets στο Ρόστερ
const player = data.roster.find(p => p.name === playerName);
if (player && player.cleanSheets > 0) player.cleanSheets--;

saveAndRefresh();
    }
}

// Κοινή συνάρτηση αποθήκευσης
function saveAndRefresh() {
    saveData(data);
    loadMatchesForRound(); 
    updateRosterList();    
    displayTopScorers();
    displayResults();
    displayRoster();
}
// Εμφάνιση/Απόκρυψη πεδίων εμβόλιμου αγώνα
function toggleSpecialMatchFields() {
    const checkbox = document.getElementById('useSpecialMatchCheckbox');
    const fields = document.getElementById('specialMatchFields');
    fields.style.display = checkbox.checked ? 'block' : 'none';
}
// Εμφάνιση κουμπιού όταν κατεβαίνουμε λίγο
window.onscroll = function() {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
document.getElementById("backToTop").style.display = "block";
    } else {
document.getElementById("backToTop").style.display = "none";
    }
};
// Global μεταβλητή για να θυμόμαστε τα στοιχεία του αγώνα
let currentMatchShareData = {};
function openSquadModal(home, away, date, time, stadium, mapLink) {
    currentMatchShareData = { home, away, date, time, stadium, mapLink };

    const list = document.getElementById('squadList');
    list.innerHTML = ''; 

    document.getElementById('noSquadCheckbox').checked = false;

    const players = [...data.roster].sort((a, b) => (a.number || 999) - (b.number || 999));

    players.forEach(p => {
const div = document.createElement('div');
div.style.padding = "5px";
div.style.borderBottom = "1px solid #eee";
div.style.display = "flex";
div.style.alignItems = "center";

const isCoach = p.position.includes('Προπονητής');

div.innerHTML = `
    <label style="display: flex; align-items: center; width: 100%; cursor: pointer; margin: 0;">
        <input type="checkbox" class="squad-checkbox" value="${p.name}" data-pos="${p.position}" ${!isCoach ? 'checked' : ''} style="width: 20px; height: 20px; margin-right: 10px;">
        <span style="font-weight: 600; font-size: 0.9rem;">${p.number ? '#' + p.number : ''} ${p.name}</span>
        <span style="font-size: 0.75rem; color: #888; margin-left: auto;">${p.position.split('/')[0]}</span>
    </label>
`;
list.appendChild(div);
    });

    document.getElementById('extraPlayersInput').value = '';
    document.getElementById('squadModal').style.display = 'flex';
}
function shareFinalSquad() {
    // Κλείσιμο του squad modal
    document.getElementById('squadModal').style.display = 'none';
    
    // Άνοιγμα του PIN modal
    document.getElementById('pinModal').style.display = 'flex';
}
// PIN Configuration
const CORRECT_PIN = '1969'; // ⚠️ ΑΛΛΑΞΕ ΤΟ PIN ΕΔΩ
let enteredPin = '';

function enterPin(digit) {
    if (enteredPin.length < 4) {
enteredPin += digit;
updatePinDisplay();

if (enteredPin.length === 4) {
    setTimeout(checkPin, 300);
}
    }
}

function deleteLastPin() {
    if (enteredPin.length > 0) {
enteredPin = enteredPin.slice(0, -1);
updatePinDisplay();
document.getElementById('pinError').textContent = '';
    }
}

function clearPin() {
    enteredPin = '';
    updatePinDisplay();
    document.getElementById('pinError').textContent = '';
}

function updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
if (index < enteredPin.length) {
    dot.classList.add('filled');
} else {
    dot.classList.remove('filled');
}
    });
}

function checkPin() {
    if (enteredPin === CORRECT_PIN) {
// ✅ Σωστό PIN - Προχωράμε στο share
document.getElementById('pinError').textContent = '';
closePinModal();
executeShareSquad(); // Η πραγματική λειτουργία share
    } else {
// ❌ Λάθος PIN
document.getElementById('pinError').textContent = '❌ Λάθος PIN! Προσπάθησε ξανά.';

// Κούνημα animation
const modal = document.querySelector('#pinModal .modal-content');
modal.style.animation = 'shake 0.5s';
setTimeout(() => {
    modal.style.animation = '';
}, 500);

clearPin();
    }
}

function closePinModal() {
    document.getElementById('pinModal').style.display = 'none';
    clearPin();
}

// Η πραγματική συνάρτηση share (παλιά shareFinalSquad)
function executeShareSquad() {
    const { home, away, date, time, stadium, mapLink } = currentMatchShareData;
    const siteUrl = window.location.origin + window.location.pathname;
    
    const hideSquad = document.getElementById('noSquadCheckbox').checked;

    let squadText = "";

    if (!hideSquad) {
const checkboxes = document.querySelectorAll('.squad-checkbox:checked');

const gks = [];
const defs = [];
const mids = [];
const fwds = [];

checkboxes.forEach(box => {
    const name = box.value;
    const rawPos = (box.getAttribute('data-pos') || "").toUpperCase();
    const firstPos = rawPos.split('/')[0];
    const match = firstPos.match(/\(([A-Z]+)\)/);
    
    let category = 'mid';

    if (match && match[1].length >= 2) {
        const code = match[1];
        const secondChar = code[1];

        if (secondChar === 'K') {
            category = 'gk';
        } else if (secondChar === 'B') {
            category = 'def';
        } else if (secondChar === 'M') {
            category = 'mid';
        } else if (secondChar === 'F' || secondChar === 'S') {
            category = 'fwd';
        } else if (secondChar === 'W') {
            if (code.length === 2 && code !== 'SW') {
                category = 'fwd';
            } else {
                category = 'def';
            }
        }
    } else {
        if (firstPos.includes('ΤΕΡΜΑΤΟΦΥΛΑΚΑΣ')) category = 'gk';
        else if (firstPos.includes('ΑΜΥΝΤΙΚΟΣ')) category = 'def';
        else if (firstPos.includes('ΕΠΙΘΕΤΙΚΟΣ')) category = 'fwd';
        else category = 'mid';
    }

    if (category === 'gk') gks.push(name);
    else if (category === 'def') defs.push(name);
    else if (category === 'mid') mids.push(name);
    else if (category === 'fwd') fwds.push(name);
});

const extras = document.getElementById('extraPlayersInput').value.trim();

squadText = "\n📋 *Η ΑΠΟΣΤΟΛΗ ΤΗΣ ΟΜΑΔΑΣ:*";
if (gks.length) squadText += "\n🧤 " + gks.join(", ");
if (defs.length) squadText += "\n🛡️ " + defs.join(", ");
if (mids.length) squadText += "\n⚙️ " + mids.join(", ");
if (fwds.length) squadText += "\n⚡ " + fwds.join(", ");

if (extras) {
    squadText += "\n🆕 " + extras;
}
squadText += "\n"; 
    }

    const text = `⚽ *ΕΠΟΜΕΝΟΣ ΑΓΩΝΑΣ* ⚽\n\n` +
         `🆚 ${home} - ${away}\n` +
         `📅 ${date}  ⏰ ${time}\n` +
         `🏟️ ${stadium}\n\n` +
         `📍 *Χάρτης Γηπέδου:* ${mapLink}\n` +
         `${squadText}\n` + 
         `⏳ ${siteUrl}\n\n` + 
         `*👨‍👩‍👦 Μια οικογένεια, ⛰️ μια ομάδα, 🔥 ένα πάθος*`;

    if (navigator.share) {
navigator.share({ title: 'Επόμενος Αγώνας', text: text }).catch(console.error);
    } else {
const viberUrl = `viber://forward?text=${encodeURIComponent(text)}`;
window.open(viberUrl, '_blank');
    }
}

<button id="backToTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})"><i class="fa-solid fa-chevron-up"></i></button>
<div id="toast-container"></div>
</body>
</html>
