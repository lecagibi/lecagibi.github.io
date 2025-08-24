// Configuration du clavier de piano
const PIANO_LAYOUT = {
    // Les touches sont organisées par octaves
    // Chaque octave contient les notes naturelles (blanches) et les altérations (noires)
    whiteKeys: [
        { note: 'C', position: 0 },
        { note: 'D', position: 1 },
        { note: 'E', position: 2 },
        { note: 'F', position: 3 },
        { note: 'G', position: 4 },
        { note: 'A', position: 5 },
        { note: 'B', position: 6 }
    ],
    blackKeys: [
        { note: 'C♯/D♭', position: 0.7 },  // Position relative entre C et D
        { note: 'D♯/E♭', position: 1.7 },  // Position relative entre D et E
        { note: 'F♯/G♭', position: 3.7 },  // Position relative entre F et G
        { note: 'G♯/A♭', position: 4.7 },  // Position relative entre G et A
        { note: 'A♯/C♭', position: 5.7 }   // Position relative entre A et B
    ],
    octaves: 2 // Nombre d'octaves à afficher
};

function creerClavierPiano(keyboardId) {
    const keyboard = document.getElementById(keyboardId);
    keyboard.classList.add('piano-keyboard');
    
    const keysContainer = document.createElement('div');
    keysContainer.className = 'piano-keys';
    
    // Calculer la largeur totale des touches
    const totalWhiteKeys = PIANO_LAYOUT.whiteKeys.length * PIANO_LAYOUT.octaves;
    const keyWidth = 100 / totalWhiteKeys;

    // Créer les touches pour chaque octave
    for (let octave = 0; octave < PIANO_LAYOUT.octaves; octave++) {
        // Créer d'abord les touches blanches
        PIANO_LAYOUT.whiteKeys.forEach(({ note, position }) => {
            const key = document.createElement('div');
            key.className = 'piano-key white';
            
            // Calculer la position horizontale
            const basePosition = octave * (PIANO_LAYOUT.whiteKeys.length) * keyWidth;
            key.style.left = `${basePosition + (position * keyWidth)}%`;
            key.style.width = `${keyWidth}%`;
            
            // Ajouter le texte de la note
            const noteText = document.createElement('span');
            noteText.textContent = `${note}${octave + 3}`;
            key.appendChild(noteText);
            
            // Ajouter les attributs data
            key.dataset.note = note;
            key.dataset.octave = octave + 3;
            
            // Ajouter les événements
            key.addEventListener('mousedown', handlePianoKeyPress);
            key.addEventListener('mouseup', handlePianoKeyRelease);
            key.addEventListener('mouseleave', handlePianoKeyRelease);
            
            keysContainer.appendChild(key);
        });

        // Ajouter ensuite les touches noires
        PIANO_LAYOUT.blackKeys.forEach(({ note, position }) => {
            const key = document.createElement('div');
            key.className = 'piano-key black';
            
            // Calculer la position horizontale
            const basePosition = octave * (PIANO_LAYOUT.whiteKeys.length) * keyWidth;
            key.style.left = `${basePosition + (position * keyWidth)}%`;
            key.style.width = `${keyWidth * 0.65}%`; // Touches noires légèrement plus étroites
            
            // Ajouter le texte de la note
            const noteText = document.createElement('span');
            noteText.textContent = `${note}${octave + 3}`;
            key.appendChild(noteText);
            
            // Ajouter les attributs data
            key.dataset.note = note;
            key.dataset.octave = octave + 3;
            
            // Ajouter les événements
            key.addEventListener('mousedown', handlePianoKeyPress);
            key.addEventListener('mouseup', handlePianoKeyRelease);
            key.addEventListener('mouseleave', handlePianoKeyRelease);
            
            keysContainer.appendChild(key);
        });
    }
    
    keyboard.appendChild(keysContainer);
}

function handlePianoKeyPress(event) {
    const key = event.currentTarget;
    key.classList.add('active');
    
    // Jouer la note si la fonction existe
    if (typeof jouerAccordAvecControleVolumeIndep === 'function') {
        const noteWithOctave = key.dataset.note + key.dataset.octave;
        // Pour les notes altérées (qui contiennent '/'), normaliser la note
        const [note1, note2] = noteWithOctave.split('/');
        // Utiliser la première notation (par exemple C♯ pour C♯/D♭)
        const note = note1.replace('♯', '#').replace('♭', 'b');
        jouerAccordAvecControleVolumeIndep([note], 'lcd-volume-slider', 'lcd-play-duration', 'piano');
    }
}

function handlePianoKeyRelease(event) {
    const key = event.currentTarget;
    key.classList.remove('active');
    
    // Arrêter la note si la fonction existe
    if (typeof arreterAccordIndep === 'function') {
        arreterAccordIndep('piano');
    }
}

function normalizeNoteName(note) {
    // Table de conversion des notes enharmoniques et leurs équivalents
    const enharmonicMap = {
        'Cbb': 'A♯/B♭',
        'Cb': 'B',
        'B#': 'C',
        'B##': 'C♯/D♭',
        'Ebb': 'D',
        'Eb': 'D♯/E♭',
        'Fb': 'E',
        'E#': 'F',
        'E##': 'F♯/G♭',
        'Gbb': 'F',
        'Gb': 'F♯/G♭',
        'Abb': 'G',
        'Ab': 'G♯/A♭',
        'A##': 'B',
        'Bb': 'A♯/B♭',
        'Db': 'C♯/D♭',
    };

    // Normaliser la note en remplaçant b et # par leurs symboles
    note = note.replace(/b/g, '♭').replace(/#/g, '♯');
    return enharmonicMap[note] || note;
}

function highlightPianoChordNotes(keyboardId, notes, variant = null) {
    const keyboard = document.getElementById(keyboardId);
    
    // Réinitialiser toutes les touches
    keyboard.querySelectorAll('.piano-key').forEach(key => {
        key.classList.remove('in-chord', 'variant-1', 'variant-2', 'variant-3');
    });
    
    if (!notes || notes.length === 0) return;
    
    notes.forEach(noteStr => {
        // Nettoyer et normaliser la note
        const cleanNote = noteStr.trim();
        // Extraire la note et l'octave
        const match = cleanNote.match(/^([A-G][b#♯♭]{0,2})(\d+)?$/i);
        if (!match) return;
        
        const [, noteWithAccidental, octave = '4'] = match;
        const normalizedNote = normalizeNoteName(noteWithAccidental);
        
        // Chercher toutes les touches correspondantes
        const keys = keyboard.querySelectorAll('.piano-key');
        keys.forEach(key => {
            const keyNote = key.dataset.note;
            // Vérifier si la note correspond à l'une des notes enharmoniques
            if ((keyNote === normalizedNote || 
                 (keyNote.includes('/') && keyNote.split('/').some(n => n === normalizedNote))) && 
                (!octave || key.dataset.octave === octave)) {
                key.classList.add('in-chord');
                if (variant !== null) {
                    key.classList.add(`variant-${variant}`);
                }
            }
        });
    });
}

// Fonction pour gérer l'affichage des claviers
function handleKeyboardTypeChange(prefix, number) {
    const selector = document.getElementById(`${prefix}-keyboard-type-${number}`);
    const accordionContainer = document.getElementById(`${prefix}-accordion-container-${number}`);
    const pianoContainer = document.getElementById(`${prefix}-piano-container-${number}`);
    
    selector.addEventListener('change', function() {
        // Cacher les deux types de clavier pour ce sélecteur
        accordionContainer.style.display = 'none';
        pianoContainer.style.display = 'none';

        // Afficher et initialiser le clavier sélectionné si nécessaire
        switch(this.value) {
            case 'accordion':
                accordionContainer.style.display = 'block';
                const accordionKeyboard = document.getElementById(`${prefix}-accordion-keyboard-${number}`);
                if (!accordionKeyboard.children.length) {
                    creerClavierAccordeon(`${prefix}-accordion-keyboard-${number}`, 'c');
                }
                break;
            case 'piano':
                pianoContainer.style.display = 'block';
                const pianoKeyboard = document.getElementById(`${prefix}-piano-keyboard-${number}`);
                if (!pianoKeyboard.children.length) {
                    creerClavierPiano(`${prefix}-piano-keyboard-${number}`);
                }
                break;
        }
        
        // Récupérer les notes actuelles pour les réafficher
        if (prefix === 'lcd') {
            const chordNotesElement = document.getElementById('lcd-chord-notes');
            if (chordNotesElement.textContent) {
                const notes = chordNotesElement.textContent.split(', ');
                if (this.value === 'accordion') {
                    highlightChordNotes(`${prefix}-accordion-keyboard-${number}`, notes);
                } else if (this.value === 'piano') {
                    highlightPianoChordNotes(`${prefix}-piano-keyboard-${number}`, notes);
                }
            }
        } else if (prefix === 'ns') {
            const chordNotesElement = document.getElementById('ns-chord-notes');
            if (chordNotesElement.textContent) {
                const notes = chordNotesElement.textContent.split(', ');
                if (this.value === 'accordion') {
                    highlightChordNotes(`${prefix}-accordion-keyboard-${number}`, notes);
                } else if (this.value === 'piano') {
                    highlightPianoChordNotes(`${prefix}-piano-keyboard-${number}`, notes);
                }
            }
        }
    });
}

// Exporter les fonctions pour utilisation externe
window.createPianoKeyboard = creerClavierPiano;
window.highlightPianoChordNotes = highlightPianoChordNotes;

// Initialiser les sélecteurs de clavier
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les gestionnaires de sélection de clavier pour les deux sections
    handleKeyboardTypeChange('lcd', 1);
    handleKeyboardTypeChange('lcd', 2);
    handleKeyboardTypeChange('ns', 1);
    handleKeyboardTypeChange('ns', 2);
    
    // Initialiser le clavier d'accordéon par défaut pour lcd (premier clavier)
    creerClavierAccordeon('lcd-accordion-keyboard-1', 'c');
    
    // Déclencher l'événement change sur le premier sélecteur lcd pour initialiser l'affichage
    const lcdSelector1 = document.getElementById('lcd-keyboard-type-1');
    if (lcdSelector1) {
        lcdSelector1.dispatchEvent(new Event('change'));
    }
});
