// Initialisation de VexFlow
class MusicNotation {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.vf = null;
        this.context = null;
        this.baseStaveWidth = 250; // Largeur de base
        this.staveWidth = this.baseStaveWidth; // Largeur actuelle

        // Table de conversion des notes vers le format VexFlow
        this.noteMap = {
            // Notes naturelles
            'c': 'c',
            'd': 'd',
            'e': 'e',
            'f': 'f',
            'g': 'g',
            'a': 'a',
            'b': 'b',
            // Dièses simples
            'c#': 'c',
            'd#': 'd',
            'e#': 'e',
            'f#': 'f',
            'g#': 'g',
            'a#': 'a',
            'b#': 'b',
            // Bémols simples
            'cb': 'c',
            'db': 'd',
            'eb': 'e',
            'fb': 'f',
            'gb': 'g',
            'ab': 'a',
            'bb': 'b',
            // Doubles dièses
            'c##': 'c',
            'd##': 'd',
            'e##': 'e',
            'f##': 'f',
            'g##': 'g',
            'a##': 'a',
            'b##': 'b',
            // Doubles bémols
            'cbb': 'c',
            'dbb': 'd',
            'ebb': 'e',
            'fbb': 'f',
            'gbb': 'g',
            'abb': 'a',
            'bbb': 'b'
        };

        this.initCanvas();
    }

    adjustCanvasSize(notesCount) {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;

        // Calcul dynamique basé sur le nombre de notes
        this.staveWidth = Math.min(600, this.baseStaveWidth + (notesCount * 30));

        // Ajustement du canvas
        canvas.width = this.staveWidth + 150; // Augmenté de +150px
        canvas.height = 260;

        // Réinitialisation du contexte VexFlow
        this.vf = new Vex.Flow.Factory({
            renderer: {
                elementId: this.canvasId,
                width: canvas.width,
                height: canvas.height
            }
        });
        this.context = this.vf.getContext();
        this.context.scale(1, 1);
    }

    // Modifiez la fonction updateNotes comme ceci :
    updateNotes(notesArray) {
        console.log(`[${this.canvasId}] Mise à jour des notes:`, notesArray);

        this.clearScore();
        const staves = this.drawStaves();

        if (!notesArray || notesArray.length === 0 || !staves) {
            console.warn(`[${this.canvasId}] Pas de notes à afficher ou pas de portées`);
            return;
        }

        try {
            const colors = ['black', 'blue', 'orange', 'deeppink'];

            // Fonction pour dessiner les notes sur une portée
            const drawNotesOnStave = (notes, stave, clef, color) => {
                if (notes.length === 0) return;

                // Créer une note pour la portée
                const staveNote = this.createStaveNote(notes, clef, color);
                if (!staveNote) return;

                // Centrer la note dans la portée
                staveNote.setStave(stave);

                const voice = this.vf.Voice()
                    .setStrict(false)
                    .addTickables([staveNote]);

                this.vf.Formatter()
                    .joinVoices([voice])
                    .format([voice], stave.getWidth() - 50);

                voice.draw(this.context, stave);
            };

            // Nouvelle fonction de répartition intelligente
            const distributeLargeChord = (notes, maxPerColumn = 4) => {
                const result = [[], [], [], []];
                
                // Trier les notes par hauteur (grave à aigu)
                const sortedNotes = [...notes].sort((a, b) => {
                    const octaveDiff = a.octave - b.octave;
                    if (octaveDiff !== 0) return octaveDiff;

                    const noteOrder = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
                    return noteOrder.indexOf(a.basePitch) - noteOrder.indexOf(b.basePitch);
                });

                // Répartir équitablement
                sortedNotes.forEach(note => {
                    // Trouver la colonne avec le moins de notes
                    let minCount = result[0].length;
                    let targetCol = 0;

                    for (let i = 0; i < 4; i++) {
                        if (result[i].length < minCount) {
                            minCount = result[i].length;
                            targetCol = i;
                        }
                    }

                    // Vérifier la limite par colonne
                    if (result[targetCol].length < maxPerColumn) {
                        result[targetCol].push(note);
                    } else {
                        // Colonne pleine, trouver la suivante avec de la place
                        for (let i = 0; i < 4; i++) {
                            if (result[i].length < maxPerColumn) {
                                result[i].push(note);
                                break;
                            }
                        }
                    }
                });

                return result;
            };

            notesArray.forEach((noteGroup, groupIndex) => {
                const color = colors[groupIndex % colors.length];
                const { trebleNotes, bassNotes } = this.distributeNotesToStaves(noteGroup);

                const trebleColumns = distributeLargeChord(trebleNotes);
                const bassColumns = distributeLargeChord(bassNotes);

                for (let i = 0; i < 4; i++) {
                    if (trebleColumns[i].length > 0) {
                        drawNotesOnStave(trebleColumns[i], staves.trebleStaves[i], 'treble', color);
                    }
                    if (bassColumns[i].length > 0) {
                        drawNotesOnStave(bassColumns[i], staves.bassStaves[i], 'bass', color);
                    }
                }
            });

        } catch (error) {
            console.error(`[${this.canvasId}] Erreur mise à jour des notes:`, error);
        }
    }

    initCanvas() {
        if (typeof Vex === 'undefined') {
            console.error('VexFlow not loaded');
            return;
        }

        const canvas = document.getElementById(this.canvasId);
        if (!canvas) {
            console.error(`Canvas element not found: ${this.canvasId}`);
            return;
        }


        const container = canvas.parentElement;
        this.staveWidth = Math.min(550, container.offsetWidth * 2 - 40);

        // Give extra room for accidentals and multiple columns
        canvas.width = this.staveWidth + 120;
        canvas.height = 260;

        this.vf = new Vex.Flow.Factory({
            renderer: {
                elementId: this.canvasId,
                width: canvas.width,
                height: canvas.height
            }
        });

        this.context = this.vf.getContext();
        this.context.scale(1, 1);
        this.drawStaves();
    }

    clearScore() {
        if (this.context) {
            this.context.clear();
        }
    }

    drawStaves() {
        if (!this.vf) return;

        // Largeur de chaque portée (4 portées côte à côte)
        const staveWidth = Math.floor(this.staveWidth / 4);

        const startX = 20;
        const staveGap = 10;

        // Groupe de portées supérieur (Clef de Sol)
        const trebleStaves = [];
        for (let i = 0; i < 4; i++) { // Changé de 3 à 4 colonnes
            const stave = this.vf.Stave({
                x: startX + (staveWidth + staveGap) * i,
                y: 20,
                width: staveWidth
            });
            if (i === 0) stave.addClef('treble');
            stave.setContext(this.context).draw();
            trebleStaves.push(stave);
        }

        // Groupe de portées inférieur (Clef de Fa)
        const bassStaves = [];
        for (let i = 0; i < 4; i++) { // Changé de 3 à 4 colonnes
            const stave = this.vf.Stave({
                x: startX + (staveWidth + staveGap) * i,
                y: 140,
                width: staveWidth
            });
            if (i === 0) stave.addClef('bass');
            stave.setContext(this.context).draw();
            bassStaves.push(stave);
        }

        // Connecteurs verticaux
        for (let i = 0; i < 4; i++) { // Changé de 3 à 4 colonnes
            new Vex.Flow.StaveConnector(trebleStaves[i], bassStaves[i])
                .setType(Vex.Flow.StaveConnector.type.SINGLE)
                .setContext(this.context)
                .draw();
        }

        return {
            trebleStaves,
            bassStaves
        };
    }


    getAccidental(noteStr) {
        if (noteStr.includes('##')) return '##';
        if (noteStr.includes('bb')) return 'bb';
        if (noteStr.includes('#')) return '#';
        if (noteStr.includes('b')) return 'b';
        return null;
    }

    convertNote(note) {
        try {
            // S'assurer que la note est une chaîne
            const noteStr = String(note).toLowerCase();
            console.log(`[${this.canvasId}] ====== DÉBUT CONVERSION NOTE ======`);
            console.log(`[${this.canvasId}] Note d'entrée:`, noteStr);

            // Extraire l'octave
            let octave = noteStr.match(/[0-9]/);
            octave = octave ? parseInt(octave[0]) : 4; // Octave par défaut = 4
            console.log(`[${this.canvasId}] Octave détectée:`, octave);

            // Extraire la note de base sans l'octave
            let baseNote = noteStr.replace(/[0-9]/g, '');
            console.log(`[${this.canvasId}] Note sans octave:`, baseNote);

            // Identifier l'altération
            let accidental = null;
            if (baseNote.includes('##')) {
                accidental = '##';
            } else if (baseNote.includes('bb')) {
                accidental = 'bb';
            } else if (baseNote.includes('#')) {
                accidental = '#';
            } else if (baseNote.includes('b')) {
                accidental = 'b';
            }
            console.log(`[${this.canvasId}] Altération détectée:`, accidental);

            // Obtenir la note de base (sans altération)
            const baseNoteOnly = baseNote.charAt(0);
            console.log(`[${this.canvasId}] Note de base:`, baseNoteOnly);

            // Vérifier que la note de base est valide
            if (!['c', 'd', 'e', 'f', 'g', 'a', 'b'].includes(baseNoteOnly)) {
                console.warn(`[${this.canvasId}] Note de base non reconnue:`, baseNoteOnly);
                return { key: 'c', octave: 4 }; // Note par défaut
            }

            // Créer la clé complète avec l'altération incluse
            const fullKey = accidental ? baseNoteOnly + accidental : baseNoteOnly;
            console.log(`[${this.canvasId}] Clé complète générée:`, fullKey);

            const result = {
                key: fullKey, // Note complète avec altération
                octave: octave
            };

            console.log(`[${this.canvasId}] Note convertie finale:`, result);
            console.log(`[${this.canvasId}] ====== FIN CONVERSION NOTE ======`);
            return {
                basePitch: baseNoteOnly,  // Note sans altération (ex: 'e')
                accidental: accidental,    // Altération (ex: 'b')
                octave: octave
            };
        } catch (error) {
            console.error(`[${this.canvasId}] Erreur lors de la conversion de la note:`, error);
            return null; // Gérer l'erreur comme vous le souhaitez
        }
    }
    distributeNotesToStaves(notes) {
        const trebleNotes = [];
        const bassNotes = [];

        notes.forEach(note => {
            const converted = this.convertNote(note);

            // Distribution dynamique basée sur l'octave
            if (converted.octave >= 4) {
                trebleNotes.push({ ...converted });
            } else {
                bassNotes.push({ ...converted });
            }
        });

        return { trebleNotes, bassNotes };
    }

    createStaveNote(notes, clef, color = 'black') {
        if (notes.length === 0) return null;

        // 1. Construire les clés au format VexFlow (sans altération)
        const keys = notes.map(note => `${note.basePitch}/${note.octave}`);

        // 2. Créer la note
        const staveNote = new Vex.Flow.StaveNote({
            clef: clef,
            keys: keys,
            duration: 'w'
        });
        
        // Appliquer la couleur
        staveNote.setStyle({ fillStyle: color, strokeStyle: color });

        // 3. Ajouter les altérations
        notes.forEach((note, index) => {
            if (note.accidental) {
                const accidental = new Vex.Flow.Accidental(note.accidental);
                accidental.setStyle({ fillStyle: color, strokeStyle: color });
                staveNote.addModifier(
                    accidental,
                    index  // Position dans l'accord
                );
            }
        });

        return staveNote;
    }




    calculateColumnSpacing(columns) {
        const spacing = [];
        const baseSpacing = 60;

        columns.forEach((column, index) => {
            let extraSpace = 0;

            // Ajouter de l'espace supplémentaire si la colonne contient des altérations
            if (column.some(note => note.accidental)) {
                extraSpace += 20;
            }

            // Ajouter encore plus d'espace pour les doubles altérations
            if (column.some(note => note.accidental === '##' || note.accidental === 'bb')) {
                extraSpace += 15;
            }

            spacing.push(baseSpacing + extraSpace);
        });

        return spacing;
    }

    handleAccidentals(staveNote, columnNotes, context) {
        columnNotes.forEach((note, noteIndex) => {
            if (note.accidental) {
                const acc = new Vex.Flow.Accidental(note.accidental);

                // Décaler les altérations si nécessaire
                if (context.previousAccidentals.includes(note.basePitch)) {
                    acc.setXShift(10);
                }

                staveNote.addModifier(acc, noteIndex);
                context.previousAccidentals.push(note.basePitch);
            }
        });

        // Réinitialiser après chaque colonne
        context.previousAccidentals = [];
    }

};


// Initialise les instances de notation musicale quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.lcdMusicNotation = new MusicNotation('lcd-vf-canvas');
    window.nsMusicNotation = new MusicNotation('ns-vf-canvas');
});
