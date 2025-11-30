// Calculateur d'Épargne Intelligent avec persistance des données
class CalculateurEpargne {
    constructor() {
        this.wealthChart = null;
        this.progressChart = null;
        this.theme = 'dark';
        this.utilisateurId = this.genererIdUtilisateur();
        
        this.colors = {
            primary: '#818cf8',
            secondary: '#34d399',
            accent: '#a78bfa',
            verse: '#3b82f6',
            interets: '#10b981',
            capital: '#8b5cf6'
        };
        
        this.init();
    }

    genererIdUtilisateur() {
        // Génère un ID unique basé sur le navigateur et l'appareil
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.initTheme();
        this.chargerParametres();
        this.bindEvents();
        this.initCharts();
        this.calculerEpargne();
        
        console.log('Calculateur d\'épargne initialisé pour:', this.utilisateurId);
    }

    // Sauvegarde des paramètres dans le localStorage
    sauvegarderParametres() {
        const parametres = {
            montantMensuel: document.getElementById('montantMensuel').value,
            duree: document.getElementById('duree').value,
            taux: document.getElementById('taux').value,
            theme: this.theme,
            derniereModification: new Date().toISOString()
        };

        localStorage.setItem(`epargne_params_${this.utilisateurId}`, JSON.stringify(parametres));
    }

    // Chargement des paramètres depuis le localStorage
    chargerParametres() {
        const saved = localStorage.getItem(`epargne_params_${this.utilisateurId}`);
        
        if (saved) {
            try {
                const parametres = JSON.parse(saved);
                
                // Mettre à jour les champs de formulaire
                document.getElementById('montantMensuel').value = parametres.montantMensuel || 250;
                document.getElementById('duree').value = parametres.duree || 20;
                document.getElementById('taux').value = parametres.taux || 4;
                
                // Mettre à jour le thème si différent
                if (parametres.theme && parametres.theme !== this.theme) {
                    this.theme = parametres.theme;
                    this.applyTheme();
                }

                console.log('Paramètres chargés:', parametres);
            } catch (e) {
                console.error('Erreur lors du chargement des paramètres:', e);
                this.parametresParDefaut();
            }
        } else {
            this.parametresParDefaut();
        }
    }

    parametresParDefaut() {
        document.getElementById('montantMensuel').value = 250;
        document.getElementById('duree').value = 20;
        document.getElementById('taux').value = 4;
    }

    // Sauvegarde des résultats pour historique
    sauvegarderResultats(resultats) {
        const historique = this.chargerHistorique();
        
        const entree = {
            timestamp: new Date().toISOString(),
            parametres: {
                montantMensuel: document.getElementById('montantMensuel').value,
                duree: document.getElementById('duree').value,
                taux: document.getElementById('taux').value
            },
            resultats: resultats
        };

        // Garder seulement les 10 dernières entrées
        historique.unshift(entree);
        if (historique.length > 10) {
            historique.pop();
        }

        localStorage.setItem(`epargne_historique_${this.utilisateurId}`, JSON.stringify(historique));
    }

    chargerHistorique() {
        const saved = localStorage.getItem(`epargne_historique_${this.utilisateurId}`);
        return saved ? JSON.parse(saved) : [];
    }

    // Affichage de l'historique (optionnel)
    afficherDernierCalcul() {
        const historique = this.chargerHistorique();
        if (historique.length > 0) {
            const dernier = historique[0];
            const date = new Date(dernier.timestamp).toLocaleDateString('fr-FR');
            console.log(`Dernier calcul le ${date}:`, dernier.resultats);
        }
    }

    initTheme() {
        // Vérifier la préférence système ou le thème sauvegardé
        const savedTheme = localStorage.getItem(`epargne_theme_${this.utilisateurId}`);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.theme = savedTheme || (prefersDark ? 'dark' : 'light');
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        
        // Sauvegarder la préférence de thème
        localStorage.setItem(`epargne_theme_${this.utilisateurId}`, this.theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.updateChartsTheme();
    }

    updateChartsTheme() {
        if (this.wealthChart) {
            this.wealthChart.destroy();
            this.initWealthChart();
            this.calculerEpargne();
        }
        if (this.progressChart) {
            this.progressChart.destroy();
            this.initProgressChart();
            this.calculerEpargne();
        }
    }

    bindEvents() {
        // Inputs avec sauvegarde automatique
        const inputs = ['montantMensuel', 'duree', 'taux'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => {
                this.calculerEpargne();
                this.sauvegarderParametres();
            });
        });

        // Bouton thème
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Sauvegarde lors du déchargement de la page
        window.addEventListener('beforeunload', () => {
            this.sauvegarderParametres();
        });

        // Synchronisation entre onglets
        window.addEventListener('storage', (e) => {
            if (e.key === `epargne_params_${this.utilisateurId}`) {
                this.chargerParametres();
                this.calculerEpargne();
            }
        });
    }

    calculerEpargne() {
        const data = this.getValeursInput();
        
        if (!this.validerInputs(data)) {
            this.afficherResultats(0, 0, 0, 0);
            return;
        }

        const resultats = this.calculerInteretsComposes(data);
        this.afficherResultats(
            resultats.totalInvesti,
            resultats.interets,
            resultats.capitalFinal,
            resultats.pourcentageInterets
        );
        
        this.mettreAJourGraphiques(resultats, data);
        this.sauvegarderResultats(resultats);
    }

    getValeursInput() {
        return {
            mensuel: parseFloat(document.getElementById('montantMensuel').value) || 0,
            annees: parseFloat(document.getElementById('duree').value) || 0,
            taux: parseFloat(document.getElementById('taux').value) || 0
        };
    }

    validerInputs(data) {
        return data.mensuel > 0 && data.annees > 0 && data.taux >= 0;
    }

    calculerInteretsComposes(data) {
        const mois = data.annees * 12;
        const tauxMensuel = data.taux / 100 / 12;
        
        let capitalFinal;
        if (tauxMensuel === 0) {
            capitalFinal = data.mensuel * mois;
        } else {
            capitalFinal = data.mensuel * 
                ((Math.pow(1 + tauxMensuel, mois) - 1) / tauxMensuel);
        }

        const totalInvesti = data.mensuel * mois;
        const interets = capitalFinal - totalInvesti;
        const pourcentageInterets = capitalFinal > 0 ? 
            (interets / capitalFinal) * 100 : 0;

        return {
            totalInvesti: Math.round(totalInvesti),
            interets: Math.round(interets),
            capitalFinal: Math.round(capitalFinal),
            pourcentageInterets: Math.round(pourcentageInterets * 100) / 100
        };
    }

    afficherResultats(totalInvesti, interets, capitalFinal, pourcentageInterets) {
        this.mettreAJourElement('totalVerse', this.formaterMontant(totalInvesti));
        this.mettreAJourElement('interets', this.formaterMontant(interets));
        this.mettreAJourElement('capitalFinal', this.formaterMontant(capitalFinal));
        
        this.afficherConseil(interets, totalInvesti, pourcentageInterets);
        this.animerResultats();
    }

    mettreAJourElement(id, valeur) {
        const element = document.getElementById(id);
        element.textContent = valeur;
    }

    formaterMontant(montant) {
        return new Intl.NumberFormat('fr-FR').format(montant) + ' €';
    }

    afficherConseil(interets, totalInvesti, pourcentageInterets) {
        const elementConseil = document.getElementById('insight');
        let message;

        if (interets === 0) {
            message = 'Commencez votre stratégie d\'épargne pour profiter des intérêts composés';
        } else if (pourcentageInterets < 25) {
            message = `Les intérêts représentent ${pourcentageInterets}% de votre capital total.`;
        } else if (pourcentageInterets < 50) {
            message = `Excellent ! ${pourcentageInterets}% de votre capital provient des intérêts composés.`;
        } else {
            message = `Remarquable ! Plus de la moitié (${pourcentageInterets}%) de votre capital est généré par les intérêts.`;
        }

        elementConseil.innerHTML = `
            <div class="insight-icon">●</div>
            <div class="insight-text">${message}</div>
        `;
    }

    animerResultats() {
        const elements = ['totalVerse', 'interets', 'capitalFinal'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 600);
        });
    }

    initCharts() {
        this.initWealthChart();
        this.initProgressChart();
    }

    initWealthChart() {
        const ctx = document.getElementById('wealthChart').getContext('2d');
        const isDark = this.theme === 'dark';
        const textColor = isDark ? '#f9fafb' : '#1f2937';
        const gridColor = isDark ? '#4b5563' : '#e5e7eb';
        
        this.wealthChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Capital investi', 'Intérêts gagnés'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [this.colors.verse, this.colors.interets],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: textColor
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formaterMontant(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    initProgressChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        const isDark = this.theme === 'dark';
        const textColor = isDark ? '#f9fafb' : '#1f2937';
        const gridColor = isDark ? '#4b5563' : '#e5e7eb';
        
        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Capital accumulé',
                    data: [],
                    borderColor: this.colors.capital,
                    backgroundColor: this.hexToRgba(this.colors.capital, 0.1),
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: this.colors.capital,
                    pointBorderColor: isDark ? '#1f2937' : '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Capital: ${this.formaterMontant(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formaterMontant(value),
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });
    }

    mettreAJourGraphiques(resultats, data) {
        this.mettreAJourWealthChart(resultats);
        this.mettreAJourProgressChart(data);
    }

    mettreAJourWealthChart(resultats) {
        if (!this.wealthChart) return;
        
        this.wealthChart.data.datasets[0].data = [
            resultats.totalInvesti,
            resultats.interets
        ];
        this.wealthChart.update();
    }

    mettreAJourProgressChart(data) {
        if (!this.progressChart) return;
        
        const projection = this.genererProjection(data);
        const annees = projection.map(p => `An ${p.annee}`);
        const capitals = projection.map(p => p.capital);
        
        this.progressChart.data.labels = annees;
        this.progressChart.data.datasets[0].data = capitals;
        this.progressChart.update();
    }

    genererProjection(data) {
        const projection = [];
        let capital = 0;
        const tauxMensuel = data.taux / 100 / 12;
        
        for (let annee = 1; annee <= data.annees; annee++) {
            for (let mois = 1; mois <= 12; mois++) {
                capital += data.mensuel;
                capital *= (1 + tauxMensuel);
            }
            
            projection.push({
                annee: annee,
                capital: Math.round(capital)
            });
        }
        
        return projection;
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    new CalculateurEpargne();
});