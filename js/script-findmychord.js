// script-findmychord.js

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

                const notes = notes_str.replace("/", "-").split("-").map(note => note.trim()).filter(note => note);

                // Ajout de la séparation basée sur le premier caractère
                if (dernier_accord_premier_caractere && accord && accord[0].toLowerCase() !== dernier_accord_premier_caractere) {
                    accords.push(LIGNE_VIDE_MARQUEUR);
                }

                accords.push(accord);
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


// Fonction pour afficher les détails d'un accord
function afficherDetailsAccord(accordNom) {
    const chordName = document.getElementById("lcd-chord-chord"); // Le nouvel élément pour le nom de l'accord
    const chordNotes = document.getElementById("lcd-chord-notes");
    const chordDescription = document.getElementById("lcd-chord-description");

    if (accordNom === LIGNE_VIDE_MARQUEUR) {
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
if (lcdPlayButton) {
    lcdPlayButton.addEventListener("click", () => {
        const selectedChordElement = document.querySelector("#chord-list li.selected");
        if (selectedChordElement) {
            const chordNotesText = document.getElementById("lcd-chord-notes").textContent.trim();
            if (chordNotesText) {
                const notesArray = chordNotesText.split(',').map(note => note.trim());
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