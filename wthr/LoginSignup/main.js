function selectRole(rolePage) {
    const cards = document.querySelectorAll('.role-card');
    const roleClass = rolePage.replace('Login', '');
    const selectedCard = document.querySelector(`.${roleClass === 'resident' ? 'resident' : roleClass}`);

    // Fade out background and other elements
    document.querySelector('h1').classList.add('fade-out');
    document.querySelector('.subtitle').classList.add('fade-out');
    cards.forEach(card => {
        if (card !== selectedCard) {
            card.classList.add('fade-out');
        }
    });

    // Create zoom transition
    const rect = selectedCard.getBoundingClientRect();
    const clone = selectedCard.cloneNode(true);

    // Style the clone for animation
    Object.assign(clone.style, {
        position: 'fixed',
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        margin: '0',
        zIndex: '1000',
        transition: 'all 0.6s cubic-bezier(0.7, 0, 0.3, 1)',
        pointerEvents: 'none'
    });

    clone.classList.add('zoom-effect');
    document.body.appendChild(clone);

    // Hide original
    selectedCard.style.visibility = 'hidden';

    // Execution animation
    requestAnimationFrame(() => {
        setTimeout(() => {
            clone.style.top = '0';
            clone.style.left = '0';
            clone.style.width = '100vw';
            clone.style.height = '100vh';
            clone.style.borderRadius = '0';
            clone.style.opacity = '0';

            setTimeout(() => {
                window.location.href = `${rolePage}.html`;
            }, 600);
        }, 10);
    });
}
