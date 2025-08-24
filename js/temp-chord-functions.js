// Fonction pour extraire les notes à partir d'une chaîne
function extractNotes(notesStr) {
    if (!notesStr) return [];
    // Convertit les notes en format compatible avec VexFlow
    return notesStr.toLowerCase().split(' ')
        .filter(note => note.trim() !== '')
        .map(note => {
            // Par défaut, ajoute l'octave 4 pour la clé de sol et 3 pour la clé de fa
            const isHighNote = ['e', 'f', 'g', 'a', 'b'].includes(note[0].toLowerCase());
            return note + (isHighNote ? '4' : '3');
        });
}

// Fonction pour mettre à jour la notation musicale
function updateMusicNotation(notesStr) {
    if (window.musicNotation) {
        const notes = extractNotes(notesStr);
        window.musicNotation.updateNotes(notes);
    }
}

// Modification de la fonction afficherDetailsAccord pour inclure la mise à jour des portées
function afficherDetailsAccord(accordNom) {
    const chordName = document.getElementById("lcd-chord-chord");
    const chordNotes = document.getElementById("lcd-chord-notes");
    const chordDescription = document.getElementById("lcd-chord-description");

    if (accordNom === LIGNE_VIDE_MARQUEUR) {
        chordName.textContent = "";
        chordNotes.textContent = "";
        chordDescription.textContent = "";
        updateMusicNotation(""); // Efface les portées
        return;
    }

    const accordNomLower = accordNom.toLowerCase();
    if (!accords_dict[accordNomLower]) {
        chordNotes.textContent = "❌ Accord introuvable.";
        chordDescription.textContent = "";
        updateMusicNotation(""); // Efface les portées
        return;
    }

    const notes = accords_dict[accordNomLower];
    chordName.textContent = accordNom;
    chordNotes.textContent = notes;
    chordDescription.textContent = descriptions[accordNomLower] || "";
    
    // Mise à jour des portées musicales
    updateMusicNotation(notes);
}
