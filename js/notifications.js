document.querySelector('.contact_clic').addEventListener('click', function(e) {
    e.preventDefault(); // empêche ouverture immédiate du mail

    const notifWrapper = document.querySelector('.copy-notif-click');

    // Copier l'email dans le presse-papiers
    navigator.clipboard.writeText('kagibi@proton.me');

    // Positionner la notification au curseur
    notifWrapper.style.left = e.clientX + 'px';
    notifWrapper.style.top = e.clientY + 'px';

    // Afficher
    notifWrapper.classList.add('show');

    // Faire disparaître après 1 seconde
    setTimeout(() => {
        notifWrapper.classList.remove('show');
    }, 1000);

    // Ouvrir le client mail après un petit délai
    setTimeout(() => {
        window.location.href = 'mailto:kagibi@proton.me';
    }, 300);
});
