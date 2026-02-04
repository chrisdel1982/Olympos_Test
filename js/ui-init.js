window.addEventListener('load', function() {
    // Εδώ ρυθμίζεις πόση ώρα θα μείνει (3000 = 3 δευτερόλεπτα)
    setTimeout(function() {
        var splash = document.getElementById('custom-splash');
        splash.classList.add('splash-hidden');
        
        setTimeout(function() {
            splash.style.display = 'none';
        }, 500);
        
    }, 500); // <-- ΧΡΟΝΟΣ ΑΝΑΜΟΝΗΣ
});
// ΣΥΝΑΡΤΗΣΗ ΓΙΑ TOAST NOTIFICATIONS 🍞
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Δημιουργία του στοιχείου
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Εικονίδιο ανάλογα τον τύπο
    const icon = type === 'success' ? '✅' : '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    // Προσθήκη στη σελίδα
    container.appendChild(toast);

    // Εμφάνιση (με μικρή καθυστέρηση για να παίξει το animation)
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Αυτόματη αφαίρεση μετά από 3 δευτερόλεπτα
    setTimeout(() => {
        toast.classList.remove('show');
        // Περιμένουμε να τελειώσει το animation εξαφάνισης πριν το διαγράψουμε τελείως
        setTimeout(() => {
            toast.remove();
        }, 300); 
    }, 3000);
}
