// script-findmychord.js


// Constantes de couleurs pour les accords
const CHORD_COLORS = {
    DEFAULT: 'black',
    VARIANT_1: 'blue',
    VARIANT_2: 'orange',
    VARIANT_3: 'deeppink'
};

// Fonction pour extraire les notes à partir d'une chaîne ou d'un tableau
function processNotes(notes) {
    console.log('Processing notes:', notes);
    
    if (!notes) {
        console.log('Pas de notes à traiter');
        return [];
    }

    try {
        // Si c'est déjà un tableau
        if (Array.isArray(notes)) {
            console.log('Traitement tableau de notes:', notes);
            return notes.map(note => {
                // Convertit chaque note en chaîne et en minuscules
                return String(note).toLowerCase();
            });
        }
        
        // Si c'est une chaîne
        if (typeof notes === 'string') {
            console.log('Traitement chaîne de notes:', notes);
            return notes.toLowerCase().split(/[,\s]+/).filter(note => note.trim() !== '');
        }
        
        console.warn('Type de notes non supporté:', typeof notes, notes);
        return [];
    } catch (error) {
        console.error('Erreur dans processNotes:', error);
        return [];
    }
}


// Fonction de debug pour tracer les notes
function debugNotes(source, notes) {
    console.log(`Debug [${source}] Notes:`, notes);
    if (Array.isArray(notes)) {
        console.log(`Debug [${source}] Est un tableau de ${notes.length} notes:`, notes);
    } else if (typeof notes === 'string') {
        console.log(`Debug [${source}] Est une chaîne:`, notes);
    } else {
        console.log(`Debug [${source}] Type inattendu:`, typeof notes);
    }
}




// Fonction pour mettre à jour la notation musicale LCD
function updateLCDNotation(notes, color = CHORD_COLORS.DEFAULT) {
    console.log('LCD - Notes reçues:', notes, 'Couleur:', color);
    
    try {
        if (window.lcdMusicNotation) {
            // On passe les notes avec la couleur spécifiée
            window.lcdMusicNotation.updateNotes(notes, color);
        } else {
            console.warn('LCD Music Notation non initialisée');
        }
    } catch (error) {
        console.error('Erreur dans updateLCDNotation:', error);
    }
}

// Fonction pour mettre à jour la notation musicale NS
function updateNSNotation(notes, color = CHORD_COLORS.DEFAULT) {
    console.log('NS - Notes reçues:', notes, 'Couleur:', color);
    
    try {
        if (window.nsMusicNotation) {
            // On passe les notes avec la couleur spécifiée
            window.nsMusicNotation.updateNotes(notes, color);
        } else {
            console.warn('NS Music Notation non initialisée');
        }
    } catch (error) {
        console.error('Erreur dans updateNSNotation:', error);
    }
}


// DOM

// constantes
const CSV_FILE = "/files/docs/accords_notes_complet.csv";
const DELIMITER_PRINCIPAL = "\n";
const DELIMITER_INTERNE = ";";
const LIGNE_VIDE_MARQUEUR = "-------";
const NOTES_DISPONIBLES = [
    // Notes naturelles
    "c", "d", "e", "f", "g", "a", "b",
    // Dièses
    "c#", "d#", "e#", "f#", "g#", "a#", "b#",
    // Bémols (notes enharmoniques)
    "cb", "db", "eb", "fb", "gb", "ab", "bb",
    // Double altérations pour une recherche plus complète
    "c##", "d##", "e##", "f##", "g##", "a##", "b##", // Double dièses
    "cbb", "dbb", "ebb", "fbb", "gbb", "abb", "bbb"  // Double bémols
];


let accords = [];
let accords_dict = {};
let descriptions = {};
let notesAccordTrouve = []; // Variable pour stocker les notes de l'accord trouvé
let currentAudioContext = null;
let currentOscillators = [];
let durationTimer = null;

const audioPlayers = {};

// Fonction pour nettoyer une chaîne de caractères
function cleanString(s) {
  if (s === null || s === undefined) {
    return "";
  }
  s = s.trim();
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Modification ici : Conserve les caractères '+', '-' et le point-virgule
  return s.replace(/[^a-zA-Z0-9\s#;+-]/g, "");



// Fonction pour nettoyer une chaîne de caractères
function cleanString(s) {
    if (s === null || s === undefined) {
        return "";
    }
    s = s.trim();
    s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    // Modification ici : Conserve le point-virgule
    return s.replace(/[^a-zA-Z0-9\s#;]/g, "");

}

// Fonction pour charger le fichier CSV
async function chargerAccords() {
    try {
        const response = await fetch(CSV_FILE);
        const content = await response.text();
        const lignes = content.split(DELIMITER_PRINCIPAL);

        console.log("Nombre de lignes:", lignes.length); // Ajout d'un log

        let dernier_accord_premier_caractere = null;

        // Ignorer la première ligne (en-têtes)
        for (let i = 1; i < lignes.length; i++) { // Commence à 1 pour ignorer l'en-tête
            let ligne = lignes[i];
            const ligne_nettoyee = cleanString(ligne);

            console.log(`Ligne ${i}:`, ligne); // Ajout d'un log
            console.log(`Ligne nettoyée ${i}:`, ligne_nettoyee); // Ajout d'un log

            // Vérifie si la ligne est vide ou ne contient que des espaces
            if (!ligne_nettoyee || /^\s*$/.test(ligne_nettoyee)) {
                console.log(`Ligne ${i} est vide, on passe à la suivante.`); // Ajout d'un log
                continue; // Passe à la ligne suivante si elle est vide
            }

            const parts = ligne_nettoyee.split(DELIMITER_INTERNE);
            console.log(`Parts ${i}:`, parts); // Ajout d'un log

            // Vérifie si la ligne a le bon nombre de colonnes

            if (parts.length >= 3) {
                const accord = cleanString(parts[0]);
                // Rejoint les parties des notes s'il y a des points-virgules dans la description des notes
                const notes_str = parts.slice(1, parts.length - 1).join(';').trim();
                const description = cleanString(parts[parts.length - 1]);

            if (parts.length === 3) {
                const accord = cleanString(parts[0]);
                const notes_str = cleanString(parts[1]);
                const description = cleanString(parts[2]);


                console.log(`Accord ${i}:`, accord); // Ajout d'un log
                console.log(`Notes_str ${i}:`, notes_str); // Ajout d'un log
                console.log(`Description ${i}:`, description); // Ajout d'un log

                // Vérifie si l'accord est vide
                if (!accord) {
                    console.log(`Accord ${i} est vide, on passe à la suivante.`); // Ajout d'un log
                    continue;
                }


                const notes = notes_str.split(';').map(noteGroup => 
                    noteGroup.replace(/\//g, "-").split("-").map(note => note.trim()).filter(note => note)
                );

                const notes = notes_str.replace("/", "-").split("-").map(note => note.trim()).filter(note => note);


                // Ajout de la séparation basée sur le premier caractère
                if (dernier_accord_premier_caractere && accord && accord[0].toLowerCase() !== dernier_accord_premier_caractere) {
                    accords.push(LIGNE_VIDE_MARQUEUR);
                }

                accords.push(accord);

                accords_dict[accord.toLowerCase()] = notes; // notes is now an array of arrays

                accords_dict[accord.toLowerCase()] = notes;

                descriptions[accord.toLowerCase()] = description;
                dernier_accord_premier_caractere = accord[0].toLowerCase() || null;

                // Ajout de la séparation après l'accord spécifié (exemple : "aug7")
                if (accord.toLowerCase().startsWith("aug7")) {
                    accords.push(LIGNE_VIDE_MARQUEUR);
                }
            }
        }

        afficherAccords();
        afficherNoteCheckboxes();

    } catch (error) {
        console.error("Erreur lors du chargement du CSV:", error);
    }
}

// Fonction utilitaire pour normaliser une note (ex: C# -> Db) et sa position
// Elle ne sert pas à la conversion de fréquence, mais à la comparaison
function getNoteIndex(note) {
    const noteMap = {
        "c": 0, "c#": 1, "db": 1, "d": 2, "d#": 3, "eb": 3, "e": 4, "f": 5,
        "f#": 6, "gb": 6, "g": 7, "g#": 8, "ab": 8, "a": 9, "a#": 10, "bb": 10, "b": 11,
        "e#": 5, "fb": 4, "b#": 0, "cb": 11,
        "c##": 2, "d##": 4, "e##": 6, "f##": 7, "g##": 9, "a##": 11, "b##": 1,
        "cbb": 10, "dbb": 0, "ebb": 2, "fbb": 3, "gbb": 5, "abb": 7, "bbb": 9
    };
    return noteMap[note.toLowerCase()] !== undefined ? noteMap[note.toLowerCase()] : -1;
}


// Fonction pour afficher la liste des accords dans l'interface
function afficherAccords() {
    const chordList = document.getElementById("chord-list");
    chordList.innerHTML = ""; // Efface la liste précédente

    for (const accord of accords) {
        const li = document.createElement("li");
        li.textContent = accord;
        li.addEventListener("click", () => {
            // Supprime la classe "selected" de tous les éléments li
            chordList.querySelectorAll("li").forEach(item => item.classList.remove("selected"));
            // Ajoute la classe "selected" à l'élément li actuel
            li.classList.add("selected");
            afficherDetailsAccord(accord);
        });
        chordList.appendChild(li);
    }
}


// Fonction pour trouver les accords enharmoniques
function trouverAccordsEnharmoniques(notesAccord, accordOriginal) {
    const accoridsEnharmoniques = [];
    const accordOriginalLower = accordOriginal ? accordOriginal.toLowerCase() : null;
    
    // Parcourir tous les accords
    for (const accordNom in accords_dict) {
        if (accordNom === accordNom.toLowerCase()) {  // Ne comparer qu'avec l'accord en minuscules
            // Ignorer l'accord original
            if (accordOriginalLower && accordNom === accordOriginalLower) {
                continue;
            }

            const notesAutreAccord = accords_dict[accordNom].flat();

            // Convertir les notes en indices
            const indicesAccordOriginal = [...new Set(notesAccord.map(note => getNoteIndex(note)))].sort((a, b) => a - b);
            const indicesAutreAccord = [...new Set(notesAutreAccord.map(note => getNoteIndex(note)))].sort((a, b) => a - b);

            // Vérifier si les accords ont les mêmes notes (même indices)
            if (indicesAccordOriginal.length === indicesAutreAccord.length &&
                indicesAccordOriginal.every((index, i) => index === indicesAutreAccord[i])) {
                accoridsEnharmoniques.push(accordNom);
            }
        }
    }

    return accoridsEnharmoniques;
}

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
    const notes = extractNotes(notesStr);
    
    // Mettre à jour l'affichage selon le contexte (lcd ou ns)
    const sourceId = notesStr === accords_dict[accordNomLower] ? 'lcd' : 'ns';
    const notationInstance = sourceId === 'lcd' ? window.lcdMusicNotation : window.nsMusicNotation;
    
    if (notationInstance) {
        notationInstance.updateNotes(notes);
    }
}

// Fonction pour afficher les détails d'un accord
function afficherDetailsAccord(accordNom) {
    const chordName = document.getElementById("lcd-chord-chord");

// Fonction pour afficher les détails d'un accord
function afficherDetailsAccord(accordNom) {
    const chordName = document.getElementById("lcd-chord-chord"); // Le nouvel élément pour le nom de l'accord

    const chordNotes = document.getElementById("lcd-chord-notes");
    const chordDescription = document.getElementById("lcd-chord-description");

    if (accordNom === LIGNE_VIDE_MARQUEUR) {
        chordName.textContent = "";
        chordNotes.innerHTML = "";
        chordDescription.textContent = "";
        updateLCDNotation([]);
        return;
    }

    const accordNomLower = accordNom.toLowerCase();
    if (!accords_dict[accordNomLower]) {
        chordName.textContent = accordNom.toUpperCase();
        chordNotes.textContent = "❌ Accord introuvable.";
        chordDescription.textContent = "";
        updateLCDNotation([]);
        return;
    }

    const notes = accords_dict[accordNomLower];
    const colors = [CHORD_COLORS.DEFAULT, CHORD_COLORS.VARIANT_1, CHORD_COLORS.VARIANT_2, CHORD_COLORS.VARIANT_3];
    
    // Mettre à jour le sélecteur
    const selector = document.getElementById('chord-variant-selector');
    selector.innerHTML = '<option value="all">Tous les accords</option>';
    notes.forEach((_, index) => {
        selector.innerHTML += `<option value="${index}">Accord ${index + 1}</option>`;
    });

    function updateDisplayedNotes(selection) {
        chordNotes.innerHTML = "";
        let currentColor = CHORD_COLORS.DEFAULT;
        
        if (selection === 'all') {
            // Afficher toutes les variantes avec leurs couleurs respectives
            notes.forEach((noteGroup, index) => {
                const span = document.createElement('span');
                span.style.color = colors[index % colors.length];
                span.textContent = noteGroup.join(', ');
                chordNotes.appendChild(span);
                if (index < notes.length - 1) {
                    chordNotes.appendChild(document.createTextNode(' ou '));
                }
            });
            // Mettre à jour les deux claviers d'accordéon
            highlightChordNotes('lcd-accordion-keyboard-1', notes.flat());
            highlightChordNotes('lcd-accordion-keyboard-2', notes.flat());
            // Mettre à jour les deux claviers de piano
            highlightPianoChordNotes('lcd-piano-keyboard-1', notes.flat());
            highlightPianoChordNotes('lcd-piano-keyboard-2', notes.flat());
            updateLCDNotation(notes, colors[0]); // Couleur par défaut pour 'Tous les accords'
        } else {
            // Afficher uniquement la variante sélectionnée
            const index = parseInt(selection);
            const selectedNotes = notes[index];
            const span = document.createElement('span');
            currentColor = colors[index % colors.length];
            span.style.color = currentColor;
            span.textContent = selectedNotes.join(', ');
            chordNotes.appendChild(span);
            // Mettre à jour les deux claviers d'accordéon
            highlightChordNotes('lcd-accordion-keyboard-1', selectedNotes);
            highlightChordNotes('lcd-accordion-keyboard-2', selectedNotes);
            // Mettre à jour les deux claviers de piano
            highlightPianoChordNotes('lcd-piano-keyboard-1', selectedNotes, index + 1);
            highlightPianoChordNotes('lcd-piano-keyboard-2', selectedNotes, index + 1);
            updateLCDNotation([selectedNotes], currentColor);
        }
    }

    // Trouver les accords enharmoniques
    const accoridsEnharmoniques = trouverAccordsEnharmoniques(notes.flat(), accordNom);
    
    let accordsAffichage = accordNom.toUpperCase();
    if (accoridsEnharmoniques.length > 0) {
        accordsAffichage += " ou " + accoridsEnharmoniques.map(acc => acc.toUpperCase()).join(" ou ");
    }
    chordName.textContent = accordsAffichage;
    chordDescription.textContent = descriptions[accordNomLower] || "";

    // Afficher initialement toutes les notes
    updateDisplayedNotes('all');

    // Supprimer l'ancien écouteur s'il existe
    const oldSelector = selector.cloneNode(true);
    selector.parentNode.replaceChild(oldSelector, selector);
    
    // Ajouter le nouvel écouteur
    oldSelector.addEventListener('change', (e) => {
        updateDisplayedNotes(e.target.value);
    });

        // Efface tous les champs si la ligne est un séparateur
        chordName.textContent = "";
        chordNotes.textContent = "";
        chordDescription.textContent = "";
        return;
    }

    // Assurez-vous que le nom de l'accord est au bon format (en majuscules, comme vous le souhaitez)
    chordName.textContent = accordNom.toUpperCase();

    // Reste de la fonction
    accordNom = accordNom.toLowerCase();
    if (!accords_dict[accordNom]) {
        chordNotes.textContent = "❌ Accord introuvable.";
        chordDescription.textContent = "";
        return;
    }

    const notes = accords_dict[accordNom];
    const formattedNotes = notes.flatMap(noteGroup =>
        noteGroup.split(/\s+|\s*-\s*/).map(note => note.trim())
    );
    chordNotes.textContent = formattedNotes.join(", ");
    chordDescription.textContent = descriptions[accordNom] || "";
}

// Fonction pour gérer la recherche d'accords
function gererRecherche() {
    const searchInput = document.getElementById("search-input");
    const searchTerm = searchInput.value;
    const excludeSharps = document.getElementById("exclude-sharps").checked;
    const excludeFlats = document.getElementById("exclude-flats").checked;
    const excludeNaturals = document.getElementById("exclude-naturals").checked;
    const chordList = document.getElementById("chord-list");

    // Efface la liste actuelle
    chordList.innerHTML = "";

    // Parcourt la liste de tous les accords (accords)
    for (const accord of accords) {
        if (accord === LIGNE_VIDE_MARQUEUR) {
            continue; // Ignore les séparateurs
        }

        let shouldDisplay = true; // Par défaut, on affiche l'accord

        // Vérifie si l'accord contient un dièse et si on doit l'exclure
        if (excludeSharps && accord.includes("#") && accord.indexOf("#") === 1) {
            shouldDisplay = false; // On ne doit pas afficher l'accord
        }

        // Vérifie si l'accord contient un bémol (en tant que note) et si on doit l'exclure
        if (excludeFlats && accord.includes("b") && accord.indexOf("b") === 1) {
            shouldDisplay = false; // On ne doit pas afficher l'accord
        }

        // Vérifie si l'accord est "naturel" (ni dièse, ni bémol) et si on doit l'exclure
        if (excludeNaturals) {
            // Expression régulière pour vérifier si l'accord commence par une note naturelle (A à G)
            const naturalChordRegex = /^[abcdefg](?!#|b)/i;

            // Si l'accord correspond à l'expression régulière, on le considère comme "naturel" et on l'exclut
            if (naturalChordRegex.test(accord)) {
                shouldDisplay = false; // On ne doit pas afficher l'accord
            }
        }

        // Effectue la recherche
        if (shouldDisplay && accord.startsWith(searchTerm)) {
            // Crée un nouvel élément li
            const li = document.createElement("li");
            li.textContent = accord;
            // Ajoute un écouteur d'événements de clic pour afficher les détails de l'accord
            li.addEventListener("click", () => afficherDetailsAccord(accord));
            chordList.appendChild(li);
        }
    }
}

// Fonction pour basculer l'affichage de la liste des accords
document.getElementById('toggle-list-button').addEventListener('click', function () {
    const listContainer = document.getElementById('chord-list-container');
    listContainer.classList.toggle('expanded');

    if (this.textContent === 'Afficher plus') {
        this.textContent = 'Afficher moins';
    } else {
        this.textContent = 'Afficher plus';
    }
});


// La fonction qui gère le changement d'état d'une case à cocher
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const label = checkbox.closest('label'); // On trouve le parent <label>

    // On bascule simplement la classe 'active'
    if (checkbox.checked) {
        label.classList.add('active');
    } else {
        label.classList.remove('active');
    }

    // Vous pouvez également appeler la fonction de recherche ici si l'auto-update est activé
    const autoUpdateCheckbox = document.getElementById("ns-auto-update-checkbox");
    if (autoUpdateCheckbox.checked) {
        autoUpdateAccord();
    }
}

// Mettez à jour la fonction qui génère les checkboxes pour qu'elle ajoute l'écouteur
function afficherNoteCheckboxes() {
    const noteCheckboxes = document.getElementById("note-checkboxes");
    noteCheckboxes.innerHTML = "";

    NOTES_DISPONIBLES.forEach(note => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = note;

        // Étape 1 : Mettre la première lettre en majuscule
        let formattedText = note;
        if (formattedText.length > 0) {
            formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
        }

        // Étape 2 : Appliquer les remplacements Unicode pour les altérations
        formattedText = formattedText
            .replace(/##/g, "𝄪")
            .replace(/bb/g, "𝄫")
            .replace(/#/g, "♯")
            .replace(/b/g, "♭");

        const span = document.createElement("span");
        span.textContent = formattedText;

        label.appendChild(checkbox);
        label.appendChild(span);

        // Ajout de l'écouteur d'événement ici
        checkbox.addEventListener('change', handleCheckboxChange);

        noteCheckboxes.appendChild(label);
    });
}

// Fonction pour décocher toutes les checkboxes
function clearCheckboxes() {
    // 1. Sélectionner toutes les cases à cocher des notes
    const noteCheckboxes = document.querySelectorAll("#note-checkboxes input[type='checkbox']");

    // 2. Parcourir chaque case à cocher
    noteCheckboxes.forEach(checkbox => {
        // a. Décocher la case
        checkbox.checked = false;

        // b. Retirer la classe 'active' de son label parent
        const label = checkbox.closest('label');
        if (label) {
            label.classList.remove('active');
        }
    });

    // 3. Appeler la fonction de recherche d'accord pour mettre à jour l'affichage
    //  Cela effacera l'accord trouvé et la description.

    //    Cela effacera l'accord trouvé et la description.
    trouverAccordParNotes();
}

// Fonction pour mettre à jour automatiquement l'accord trouvé
function autoUpdateAccord() {
    const noteCheckboxes = document.querySelectorAll("#note-checkboxes input[type='checkbox']");
    const notesSelectionnees = [];
    noteCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            notesSelectionnees.push(checkbox.value.toLowerCase());
        }
    });

    // Si au moins deux cases sont cochées, rechercher et mettre à jour l'accord
    if (notesSelectionnees.length >= 2) {
        trouverAccordParNotes();
    }
}

function trouverAccordParNotes() {
    const noteCheckboxes = document.querySelectorAll("#note-checkboxes input[type='checkbox']");
    const notesSelectionnees = [];
    
    // Récupère les notes sélectionnées
    noteCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            notesSelectionnees.push(checkbox.value.toLowerCase());
        }
    });

    // Si moins de 2 notes sont sélectionnées, on ne cherche pas
    if (notesSelectionnees.length < 2) {
        afficherResultatRecherche(null);
        return;
    }

    console.log("Notes sélectionnées:", notesSelectionnees);

    let accordTrouve = null;
    notesAccordTrouve = [];

    // Parcourt tous les accords
    for (const accordNom in accords_dict) {
        if (accords_dict.hasOwnProperty(accordNom)) {
            let notesAccordGroups = accords_dict[accordNom];
            
            // Check if any of the note groups match
            for (const notesAccord of notesAccordGroups) {
                // Normalise les notes de l'accord (gère les deux formats possibles avec /)
                const notesAccordNormalisees = notesAccord.flatMap(noteGroup => {
                    const parts = noteGroup.split('/');
                    return parts.flatMap(part => 
                        part.split(/\s+|\s*-\s*/).map(note => note.toLowerCase().trim())
                    );
                });

                // Convertit les notes en indices (sans doublons)
                const indicesSelectionnes = [...new Set(notesSelectionnees.map(note => getNoteIndex(note)))].sort((a, b) => a - b);
                const indicesAccord = [...new Set(notesAccordNormalisees.map(note => getNoteIndex(note)))].sort((a, b) => a - b);

                // Vérifie si toutes les notes sélectionnées sont dans l'accord
                // et si le nombre de notes uniques correspond
                if (indicesSelectionnes.length === indicesAccord.length && 
                    indicesSelectionnes.every(index => indicesAccord.includes(index))) {
                    accordTrouve = accordNom;
                    notesAccordTrouve = notesAccordNormalisees;
                    break; // Exit inner loop once a match is found
                }
            }
        }
        if (accordTrouve) break; // Exit outer loop if a match was found
            let notesAccord = accords_dict[accordNom];
            
            // Normalise les notes de l'accord (gère les deux formats possibles avec /)
            const notesAccordNormalisees = notesAccord.flatMap(noteGroup => {
                const parts = noteGroup.split('/');
                return parts.flatMap(part => 
                    part.split(/\s+|\s*-\s*/).map(note => note.toLowerCase().trim())
                );
            });

            // Convertit les notes en indices (sans doublons)
            const indicesSelectionnes = [...new Set(notesSelectionnees.map(note => getNoteIndex(note)))].sort((a, b) => a - b);
            const indicesAccord = [...new Set(notesAccordNormalisees.map(note => getNoteIndex(note)))].sort((a, b) => a - b);

            // Vérifie si toutes les notes sélectionnées sont dans l'accord
            // et si le nombre de notes uniques correspond
            if (indicesSelectionnes.length === indicesAccord.length && 
                indicesSelectionnes.every(index => indicesAccord.includes(index))) {
                accordTrouve = accordNom;
                notesAccordTrouve = notesAccordNormalisees;
                break;
            }
        }
    }

    afficherResultatRecherche(accordTrouve);
}

// Fonction pour afficher le résultat de la recherche d'accord
function afficherResultatRecherche(accordTrouve) {
    const accordLabel = document.getElementById("accord-label");
    const chordNotesNS = document.getElementById("ns-chord-notes");
    const chordDescriptionNS = document.getElementById("ns-chord-description");

    if (accordTrouve) {
        // Trouver les accords enharmoniques en passant l'accord original
        const accoridsEnharmoniques = trouverAccordsEnharmoniques(notesAccordTrouve, accordTrouve);
        
        // Formater l'affichage de l'accord et ses enharmoniques
        let accordsAffichage = accordTrouve.toUpperCase();
        if (accoridsEnharmoniques.length > 0) {
            accordsAffichage += " ou " + accoridsEnharmoniques.map(acc => acc.toUpperCase()).join(" ou ");
        }
        
        accordLabel.textContent = `Accord trouvé : ${accordsAffichage}`;
        
        // Créer un span coloré pour les notes
        chordNotesNS.innerHTML = '';
        const span = document.createElement('span');
        span.style.color = CHORD_COLORS.DEFAULT;
        span.textContent = notesAccordTrouve.join(", ");
        chordNotesNS.appendChild(span);
        
        chordDescriptionNS.textContent = descriptions[accordTrouve] || "";
        
        // Mettre à jour les deux claviers d'accordéon
        highlightChordNotes('ns-accordion-keyboard-1', notesAccordTrouve);
        highlightChordNotes('ns-accordion-keyboard-2', notesAccordTrouve);
        
        // Mettre à jour les deux claviers de piano
        highlightPianoChordNotes('ns-piano-keyboard-1', notesAccordTrouve);
        highlightPianoChordNotes('ns-piano-keyboard-2', notesAccordTrouve);
        
        console.log('NS - Notes à afficher:', notesAccordTrouve);
        // Mettre à jour les portées musicales avec la couleur par défaut
        updateNSNotation(notesAccordTrouve, CHORD_COLORS.DEFAULT)
        accordLabel.textContent = `Accord trouvé : ${accordTrouve.toUpperCase()}`;
        chordNotesNS.textContent = notesAccordTrouve.join(", ");
        chordDescriptionNS.textContent = descriptions[accordTrouve] || "";
    } else {
        accordLabel.textContent = "Aucun accord trouvé avec ces notes.";
        chordNotesNS.textContent = "";
        chordDescriptionNS.textContent = "";
    }
}


const lcdPlayButton = document.getElementById("lcd-play-button");
const lcdPlayStopButton = document.getElementById("lcd-play-stop");
const nsPlayChordButton = document.getElementById("ns-play-chord-button");
const nsPlayStopButton = document.getElementById("ns-play-stop");

if (lcdPlayButton) {
    lcdPlayButton.addEventListener("click", () => {
        const selectedChordElement = document.querySelector("#chord-list li.selected");
        if (selectedChordElement) {
            const chordNotesText = document.getElementById("lcd-chord-notes").textContent.trim();
            if (chordNotesText) {
                const notesArray = chordNotesText.split(',').map(note => note.trim());
                jouerAccordAvecControleVolumeIndep(notesArray, "lcd-volume-slider", "lcd-play-duration", "lcd");
            }
        }
    });
}

if (lcdPlayStopButton) {
    lcdPlayStopButton.addEventListener("click", () => arreterAccordIndep("lcd"));
}

if (nsPlayChordButton) {
    nsPlayChordButton.addEventListener("click", () => {
        jouerAccordAvecControleVolumeIndep(notesAccordTrouve, "ns-volume-slider", "ns-play-duration", "ns");
    });
}

if (nsPlayStopButton) {
    nsPlayStopButton.addEventListener("click", () => arreterAccordIndep("ns"));
}


// Fonction pour jouer un accord avec un ID unique (lcd, ns, etc.)
function jouerAccordAvecControleVolumeIndep(notes, volumeSliderId, durationInputId, playerId) {
    // Si ce player a déjà un son en cours, on l'arrête
    arreterAccordIndep(playerId);

    if (!notes || notes.length === 0) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Créer un compresseur pour gérer la dynamique du son
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;  // Seuil de compression en dB
    compressor.knee.value = 12;        // Transition douce de la compression
    compressor.ratio.value = 3;        // Ratio de compression
    compressor.attack.value = 0.005;   // Temps d'attaque rapide
    compressor.release.value = 0.1;    // Temps de relâchement court
    compressor.connect(audioContext.destination);

    // Créer un noeud de gain principal
    const volumeControl = audioContext.createGain();
    volumeControl.connect(compressor);

    const volumeSlider = document.getElementById(volumeSliderId);
    if (volumeSlider) {
        volumeControl.gain.value = volumeSlider.value;
        volumeSlider.addEventListener("input", () => {
            volumeControl.gain.value = volumeSlider.value;
        });
    }

    const oscillators = [];
    
    // Amélioration de la normalisation du volume
    // Utilise une échelle logarithmique pour le volume par note
    const baseVolume =1.0;  // Volume de base augmenté à 1.0
    // Ajustement plus doux de la réduction de volume pour plusieurs notes
    const volumePerNote = baseVolume * Math.pow(0.8, notes.length - 1);

    notes.forEach((note, index) => {
        const frequency = noteToFrequency(note);
        if (frequency) {
            const osc = audioContext.createOscillator();
            // Utiliser une forme d'onde plus douce
            osc.type = "sine";
            osc.frequency.setValueAtTime(frequency, audioContext.currentTime);

            // Créer un noeud de gain individuel pour la note
            const noteVolume = audioContext.createGain();
            
            // Appliquer une enveloppe ADSR basique pour éviter les clics
            const now = audioContext.currentTime;
            noteVolume.gain.setValueAtTime(0, now);
            noteVolume.gain.linearRampToValueAtTime(volumePerNote * volumeControl.gain.value, now + 0.02);
            
            // Ajuster le volume en fonction de la fréquence (les hautes fréquences sont légèrement atténuées)
            const freqAdjust = Math.max(0.7, 1 - (frequency - 220) / 2000);
            noteVolume.gain.value = volumePerNote * freqAdjust;

            osc.connect(noteVolume);
            noteVolume.connect(volumeControl);

            osc.start();
            oscillators.push(osc);
        }
    });

    let timer = null;
    const durationInput = document.getElementById(durationInputId);
    if (durationInput && !isNaN(parseInt(durationInput.value, 10))) {
        timer = setTimeout(() => arreterAccordIndep(playerId), parseInt(durationInput.value, 10) * 1000);
    }

    // On stocke tout pour ce player
    audioPlayers[playerId] = { audioContext, oscillators, timer };
}

// Fonction pour arrêter uniquement un player
function arreterAccordIndep(playerId) {
    const player = audioPlayers[playerId];
    if (!player) return;

    if (player.timer) clearTimeout(player.timer);
    player.oscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {
            console.error("Erreur lors de l'arrêt de l'oscillateur :", e);
        }
    });
    player.audioContext.close().catch(e => {
        console.error("Erreur lors de la fermeture de l'AudioContext :", e);
    });

    delete audioPlayers[playerId];
}


                jouerAccordAvecControleVolume(notesArray, "lcd-volume-slider");
            }
        }
    });
}

const nsPlayChordButton = document.getElementById("ns-play-chord-button");
nsPlayChordButton.addEventListener("click", () => {
    jouerAccordAvecControleVolume(notesAccordTrouve, "ns-volume-slider");
});


// Fonction pour jouer un accord (à implémenter avec l'API Web Audio)
function jouerAccord(notes, volumeSliderId) {
    const volumeSlider = document.getElementById(volumeSliderId);
    if (!volumeSlider) {
        console.error(`Slider avec l'ID "${volumeSliderId}" introuvable`);
        return;
    }
    if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
        if (Array.isArray(notes)) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const volumeControl = audioContext.createGain();
            volumeControl.connect(audioContext.destination);

            const volumeSlider = document.getElementById(volumeSliderId);
            volumeControl.gain.value = volumeSlider.value;

            // Écouter les changements de volume
            volumeSlider.addEventListener("input", () => {
                volumeControl.gain.value = volumeSlider.value;
            });

            const volumePerNote = 1.0 / Math.sqrt(notes.length);

            notes.forEach(note => {
                const frequency = noteToFrequency(note);
                if (frequency) {
                    const oscillator = audioContext.createOscillator();
                    oscillator.type = "sine";
                    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

                    const noteVolumeControl = audioContext.createGain();
                    noteVolumeControl.gain.value = volumeControl.gain.value * volumePerNote;
                    oscillator.connect(noteVolumeControl);
                    noteVolumeControl.connect(volumeControl);

                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 2);
                }
            });
        } else {
            console.warn("jouerAccord a reçu une valeur non valide pour les notes:", notes);
        }
    } else {
        console.warn("L'API Web Audio n'est pas supportée par ce navigateur.");
    }
}


// Fonction pour jouer un accord avec un contrôle de volume indépendant
function jouerAccordAvecControleVolume(notes, volumeSliderId, durationInputId) {
    // Si un accord est déjà en cours, on l'arrête avant de commencer le nouveau
    arreterAccord();

    if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
        if (Array.isArray(notes) && notes.length > 0) {
            currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            const volumeControl = currentAudioContext.createGain();
            volumeControl.connect(currentAudioContext.destination);

            const volumeSlider = document.getElementById(volumeSliderId);
            const durationInput = document.getElementById(durationInputId);

            // Vérifie le volume, si le slider est présent
            if (volumeSlider) {
                volumeControl.gain.value = volumeSlider.value;
                volumeSlider.addEventListener("input", () => {
                    volumeControl.gain.value = volumeSlider.value;
                });
            } else {
                volumeControl.gain.value = 0.7; // Valeur par défaut
            }

            const volumePerNote = 1.0 / Math.sqrt(notes.length);

            notes.forEach(note => {
                const frequency = noteToFrequency(note);
                if (frequency) {
                    const oscillator = currentAudioContext.createOscillator();
                    oscillator.type = "sine";
                    oscillator.frequency.setValueAtTime(frequency, currentAudioContext.currentTime);

                    const noteVolumeControl = currentAudioContext.createGain();
                    noteVolumeControl.gain.value = volumeControl.gain.value * volumePerNote;
                    oscillator.connect(noteVolumeControl);
                    noteVolumeControl.connect(volumeControl);

                    oscillator.start();
                    currentOscillators.push(oscillator); // Stocke l'oscillateur pour pouvoir l'arrêter
                }
            });

            // Gère la durée de lecture
            const durationValue = parseInt(durationInput.value, 10);
            if (!isNaN(durationValue) && durationValue > 0) {
                durationTimer = setTimeout(() => {
                    arreterAccord();
                }, durationValue * 1000); // Convertit la durée en secondes
            }

        } else {
            console.warn("jouerAccord a reçu une valeur non valide pour les notes:", notes);
        }
    } else {
        console.warn("L'API Web Audio n'est pas supportée par ce navigateur.");
    }
}




// Définir noteToFrequency comme une fonction globale
function normalizeNote(note) {
    const baseNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let octave = 4; // valeur par défaut
    let match = note.match(/^([A-Ga-g])([#b]{0,2})(-?\d+)?$/);

    if (!match) return null;

    let letter = match[1].toUpperCase();
    let accidental = match[2];
    if (match[3]) octave = parseInt(match[3], 10);

    // Trouver l'index de base
    let index = baseNotes.indexOf(letter);
    if (index === -1) return null;

    // Appliquer les altérations
    for (let char of accidental) {
        if (char === "#") {
            index++;
            if (index > 11) { index = 0; octave++; }
        } else if (char === "b") {
            index--;
            if (index < 0) { index = 11; octave--; }
        }
    }

    return { note: baseNotes[index], octave };
}

function noteToFrequency(note) {
    const A4 = 440;
    const normalized = normalizeNote(note);
    if (!normalized) return null;

    const baseNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let noteIndex = baseNotes.indexOf(normalized.note);

    let semitoneDistance = noteIndex - baseNotes.indexOf("A") + (normalized.octave - 4) * 12;
    return A4 * Math.pow(2, semitoneDistance / 12);
}

const card = document.getElementById('my-card');
const resizer = document.getElementById('right-resizer');

if (resizer) {
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();

        // Position initiale de la souris et largeur de la carte
        const initialX = e.clientX;
        const initialWidth = card.offsetWidth;

        // Fonction de redimensionnement
        const resizeCard = (e) => {
            const newWidth = initialWidth + (e.clientX - initialX);
            card.style.width = `${newWidth}px`;
        };

        // Fonctions d'écoute
        document.addEventListener('mousemove', resizeCard);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', resizeCard);
        });
    });
}


// Configuration des layouts d'accordéon
const LAYOUTS = {
    'c': {
        row1: ['.', '.', 'G♯/A♭', 'B', 'Dx', 'Fx', 'G♯/A♭x', 'Bx', 'D', 'F', 'G♯/A♭', 'B'],
        row2: ['.', 'G', 'A♯/B♭', 'C♯/D♭x', 'Ex', 'Gx', 'A♯/B♭x', 'C♯/D♭', 'E', 'G', 'A♯/B♭'],
        row3: ['F♯/G♭', 'A', 'Cx', 'D♯/E♭x', 'F♯/G♭x', 'Ax', 'C', 'D♯/E♭', 'F♯/G♭', 'A' ],
    },
    'b': {
        row1: ['.', '.', 'A', 'C', 'D♯/E♭x', 'F♯/G♭x', 'Ax', 'Cx', 'D♯/E♭', 'F♯/G♭', 'A', 'C'],
        row2: ['.', 'G', 'A♯/B♭', 'C♯/D♭x', 'Ex', 'Gx', 'A♯/B♭x', 'C♯/D♭', 'E', 'G', 'A♯/B♭',],
        row3: ['F', 'G♯/A♭', 'Bx', 'Dx', 'Fx', 'G♯/A♭x', 'B', 'D', 'F', 'G♯/A♭'],
    },
    'g-griff': {
        row1: ['.', '.', 'A', 'C', 'D♯/E♭x', 'F♯/G♭x', 'Ax', 'Cx', 'D♯/E♭', 'F♯/G♭', 'A', 'C'],
        row2: ['.', 'G♯/A♭', 'B', 'Dx', 'Fx', 'G♯/A♭x', 'Bx', 'D', 'F', 'G♯/A♭', 'B'],
        row3: ['G', 'A♯/B♭', 'C♯/D♭x', 'Ex', 'Gx', 'A♯/B♭x', 'C♯/D♭', 'E', 'G', 'A♯/B♭'],
    },
    'janko': {
        row1: ['.', '.', 'E', 'F♯/G♭x', 'G♯/A♭x', 'A♯/B♭x', 'Cx', 'D', 'E', 'F♯/G♭', 'G♯/A♭', 'A♯/B♭'],
        row2: ['.', 'D♯/E♭', 'Fx', 'Gx', 'Ax', 'Bx', 'C♯/D♭', 'D♯/E♭', 'F', 'G', 'A', 'B'],
        row3: ['.', 'E', 'F♯/G♭x', 'G♯/A♭x', 'A♯/B♭x', 'Cx', 'D', 'E', 'F♯/G♭', 'G♯/A♭', 'A♯/B♭']
    }
};

function creerClavierAccordeon(keyboardId, initialLayout = 'c') {
  const keyboard = document.getElementById(keyboardId);
  const layoutSelector = document.getElementById(keyboardId.replace('accordion-keyboard', 'keyboard-layout'));
  
  const container = keyboard.closest('.keyboard-container');
  if (keyboardId === 'lcd-accordion-keyboard' && container) {
    container.classList.add('main-keyboard');
  }
  
  function renderKeyboard(layout) {
    keyboard.innerHTML = '';
    const layoutConfig = LAYOUTS[layout];
    keyboard.className = `layout-${layout}`;
    
    if (keyboard.id === 'lcd-accordion-keyboard') {
      keyboard.classList.add('main-keyboard');
    }
    
    Object.values(layoutConfig).forEach((row, rowIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'key-row';
      
      row.forEach((note) => {
        const key = document.createElement('div');
        key.className = 'key';
        if (note === '.') {
          key.style.opacity = '0';
          key.style.pointerEvents = 'none';
        } else {
          if (note.includes('♭') || note.includes('♯')) {
            key.classList.add('black');
          }
          if ((layout === 'c' && note === 'Cx') ||
            (layout === 'b' && note === 'Bx') ||
            (layout === 'g-griff' && note === 'Gx') ||
            (layout === 'janko' && note === 'Cx')) {
            key.classList.add('main-key');
          }
        }
        
        // C'est ici que tu peux modifier le texte de la touche
        let displayedNote = note.replace('x', '');
        key.textContent = displayedNote;
        
        // Important : il faut toujours garder la valeur originale avec le 'x'
        // dans le dataset pour que les fonctions de surbrillance fonctionnent.
        key.dataset.note = note;
        rowDiv.appendChild(key);
      });
      
      keyboard.appendChild(rowDiv);
    });
  }

  renderKeyboard(initialLayout);

  layoutSelector.addEventListener('change', (e) => {
    renderKeyboard(e.target.value);
    if (keyboardId.startsWith('lcd-accordion-keyboard')) {
      const selectedChordElement = document.querySelector("#chord-list li.selected");
      if (selectedChordElement) {
        afficherDetailsAccord(selectedChordElement.textContent);
      }
    } else if (keyboardId.startsWith('ns-accordion-keyboard')) {
      // Réutiliser les notes déjà trouvées
      if (notesAccordTrouve && notesAccordTrouve.length > 0) {
        highlightChordNotes(keyboardId, notesAccordTrouve);
      }
    }
  });
}
function highlightChordNotes(keyboardId, notes) {
    // Convertir les notes de l'accord en indices
    const noteIndices = notes.map(note => getNoteIndex(note));

    // Réinitialiser toutes les touches
    const keyboard = document.getElementById(keyboardId);
    keyboard.querySelectorAll('.key').forEach(key => {
        key.classList.remove('in-chord');
    });

    // Mettre en surbrillance les touches correspondant aux notes de l'accord
    keyboard.querySelectorAll('.key').forEach(key => {
        const keyNote = key.dataset.note;
        if (keyNote === '.') return; // Ignorer les touches vides

        // Traiter chaque note possible dans la touche (cas des notes enharmoniques comme "G♯/A♭")
        const keyNotes = keyNote.split('/').map(note => note.replace('x', '')); // Enlever le x pour la comparaison
        const isMainNote = keyNote.includes('x'); // Vérifier si c'est une note principale

        const keyIndices = keyNotes.map(note => {
            // Convertir les symboles Unicode en notation standard
            return getNoteIndex(note
                .replace('♯', '#')
                .replace('♭', 'b')
                .toLowerCase()
            );
        });

        // Si l'un des indices de la touche correspond à l'un des indices de l'accord
        if (keyIndices.some(keyIndex => noteIndices.includes(keyIndex))) {
            key.classList.add('in-chord');
            // Ajouter une classe supplémentaire si c'est une note principale
            if (isMainNote) {
                key.classList.add('main-note-in-chord');
            }
        }
    });
}

// Écouteurs d'événements
document.addEventListener("DOMContentLoaded", () => {
    // Créer les claviers d'accordéon pour les deux sections
    creerClavierAccordeon('lcd-accordion-keyboard-1', 'c');
    creerClavierAccordeon('lcd-accordion-keyboard-2', 'c');
    creerClavierAccordeon('ns-accordion-keyboard-1', 'c');
    creerClavierAccordeon('ns-accordion-keyboard-2', 'c');
// Fonction pour arrêter l'accord en cours
function arreterAccord() {
    // Si un timer est en cours, on l'annule
    if (durationTimer) {
        clearTimeout(durationTimer);
        durationTimer = null;
    }

    // Arrête tous les oscillateurs en cours
    currentOscillators.forEach(oscillator => {
        try {
            oscillator.stop();
        } catch (e) {
            console.error("Erreur lors de l'arrêt de l'oscillateur :", e);
        }
    });
    currentOscillators = [];

    // Ferme l'AudioContext si il existe
    if (currentAudioContext) {
        currentAudioContext.close().then(() => {
            currentAudioContext = null;
        }).catch(e => {
            console.error("Erreur lors de la fermeture de l'AudioContext :", e);
            currentAudioContext = null;
        });
    }
}






const card = document.getElementById('my-card');
const resizer = document.getElementById('right-resizer');

resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();

    // Position initiale de la souris et largeur de la carte
    const initialX = e.clientX;
    const initialWidth = card.offsetWidth;

    // Fonction de redimensionnement
    const resizeCard = (e) => {
        const newWidth = initialWidth + (e.clientX - initialX);
        card.style.width = `${newWidth}px`;
    };

    // Fonctions d'écoute
    document.addEventListener('mousemove', resizeCard);
    document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', resizeCard);
    });
});


// Écouteurs d'événements
document.addEventListener("DOMContentLoaded", () => {

    // Charger les accords et mettre en place les écouteurs
    chargerAccords();
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", gererRecherche);

    const nsFindChordButton = document.getElementById("find-chord-button");
    if (nsFindChordButton) {
        nsFindChordButton.addEventListener("click", trouverAccordParNotes);
    }
    
    // Ajout de l'écouteur pour le bouton de décochage des cases
    const clearCheckboxesButton = document.getElementById("clear-checkboxes-button");
    if (clearCheckboxesButton) {
        clearCheckboxesButton.addEventListener("click", () => {
            clearCheckboxes();
            trouverAccordParNotes();
        });
    }

    // Écouteur d'événements pour la case à cocher de MAJ automatique
    const autoUpdateCheckbox = document.getElementById("ns-auto-update-checkbox");
    if (autoUpdateCheckbox) {
        autoUpdateCheckbox.addEventListener("change", (event) => {
            if (event.target.checked) {
                autoUpdateAccord();
            }
        });
    }

    // Écouteur d'événements pour les checkboxes des notes
    const noteCheckboxesContainer = document.getElementById("note-checkboxes");
    if (noteCheckboxesContainer) {
        noteCheckboxesContainer.addEventListener("change", (event) => {
            if (event.target.type === "checkbox") {
                const autoUpdateCheckbox = document.getElementById("ns-auto-update-checkbox");
                if (autoUpdateCheckbox.checked) {
                    autoUpdateAccord(); // Vérifiez et mettez à jour automatiquement l'accord
                }
            }
        });
    }

    // Ajoute un écouteur d'événements pour le champ de recherche
    const excludeSharpsCheckbox = document.getElementById("exclude-sharps");
    const excludeFlatsCheckbox = document.getElementById("exclude-flats");
    const excludeNaturalsCheckbox = document.getElementById("exclude-naturals");
    if (searchInput) searchInput.addEventListener("input", gererRecherche);
    if (excludeSharpsCheckbox) excludeSharpsCheckbox.addEventListener("change", gererRecherche);
    if (excludeFlatsCheckbox) excludeFlatsCheckbox.addEventListener("change", gererRecherche);
    if (excludeNaturalsCheckbox) excludeNaturalsCheckbox.addEventListener("change", gererRecherche);

    nsFindChordButton.addEventListener("click", trouverAccordParNotes);

    // Bouton PLAY de la liste d'accords
    const lcdPlayButton = document.getElementById("lcd-play-button");
    if (lcdPlayButton) {
        lcdPlayButton.addEventListener("click", () => {
            const chordNotesText = document.getElementById("lcd-chord-notes").textContent.trim();
            if (chordNotesText) {
                const notesArray = chordNotesText.split(',').map(n => n.trim());
                // Appelle la fonction mise à jour
                jouerAccordAvecControleVolume(notesArray, "lcd-volume-slider", "lcd-play-duration");
            }
        });
    }

    // Bouton STOP de la liste d'accords
    const lcdPlayStopButton = document.getElementById("lcd-play-stop");
    if (lcdPlayStopButton) {
        lcdPlayStopButton.addEventListener("click", () => {
            arreterAccord();
        });
    }

    // Bouton PLAY du sélecteur de notes
    const nsPlayChordButton = document.getElementById("ns-play-chord-button");
    nsPlayChordButton.addEventListener("click", () => {
        // Appelle la fonction mise à jour
        jouerAccordAvecControleVolume(notesAccordTrouve, "ns-volume-slider", "ns-play-duration");
    });

    // Bouton STOP du sélecteur de notes
    const nsPlayStopButton = document.getElementById("ns-play-stop");
    if (nsPlayStopButton) {
        nsPlayStopButton.addEventListener("click", () => {
            arreterAccord();
        });
    }


    // Ajout de l'écouteur pour le bouton de décochage des cases
    const clearCheckboxesButton = document.getElementById("clear-checkboxes-button");
    clearCheckboxesButton.addEventListener("click", () => {
        clearCheckboxes();
        trouverAccordParNotes();
    });

    // Écouteur d'événements pour la case à cocher de MAJ automatique
    const autoUpdateCheckbox = document.getElementById("ns-auto-update-checkbox");
    autoUpdateCheckbox.addEventListener("change", (event) => {
        if (event.target.checked) {
            autoUpdateAccord();
        }
    });

    // Écouteur d'événements pour les checkboxes des notes
    const noteCheckboxesContainer = document.getElementById("note-checkboxes");
    noteCheckboxesContainer.addEventListener("change", (event) => {
        if (event.target.type === "checkbox") {
            const autoUpdateCheckbox = document.getElementById("ns-auto-update-checkbox");
            if (autoUpdateCheckbox.checked) {
                autoUpdateAccord(); // Vérifiez et mettez à jour automatiquement l'accord
            }
        }
    });
});

// Ajoute un écouteur d'événements pour le bouton "Jouer l'accord"
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const excludeSharpsCheckbox = document.getElementById("exclude-sharps");
    const excludeFlatsCheckbox = document.getElementById("exclude-flats");
    const excludeNaturalsCheckbox = document.getElementById("exclude-naturals");
    const playChordButton = document.getElementById("play-chord-button"); // Récupère le bouton "Jouer l'accord"
    const chordList = document.getElementById("chord-list"); // Récupère la liste des accords

    // Ajoute un écouteur d'événements pour le champ de recherche
    searchInput.addEventListener("input", gererRecherche);

    // Ajoute des écouteurs d'événements pour les cases à cocher
    excludeSharpsCheckbox.addEventListener("change", gererRecherche);
    excludeFlatsCheckbox.addEventListener("change", gererRecherche);
    excludeNaturalsCheckbox.addEventListener("change", gererRecherche);

    // Ajoute un écouteur d'événements pour le bouton "Jouer l'accord"

    // Initialise l'affichage des accords
    gererRecherche();
});