document.addEventListener('DOMContentLoaded', () => {

    // ハンバーガーメニュー
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navOverlay = document.getElementById('navOverlay');

    if (hamburgerBtn && navOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = hamburgerBtn.classList.toggle('active');
            navOverlay.classList.toggle('active', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        navOverlay.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.classList.remove('active');
                navOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ヒーロースライダー
    const heroImgs = document.querySelectorAll('.hero-img');
    if (heroImgs.length > 1) {
        let current = 0;
        setInterval(() => {
            heroImgs[current].classList.remove('active');
            current = (current + 1) % heroImgs.length;
            heroImgs[current].classList.add('active');
        }, 5000);
    }

    // フェードアップアニメーション（IntersectionObserver）
    const fadeEls = document.querySelectorAll('.fade-up');
    if (fadeEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        fadeEls.forEach(el => observer.observe(el));
    }

    // アコーディオン
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.accordion-item');
            const content = item.querySelector('.accordion-content');
            const isOpen = item.classList.contains('open');

            // 他のアイテムを閉じる
            document.querySelectorAll('.accordion-item.open').forEach(openItem => {
                if (openItem !== item) {
                    openItem.classList.remove('open');
                    openItem.querySelector('.accordion-content').style.maxHeight = '0';
                }
            });

            if (isOpen) {
                item.classList.remove('open');
                content.style.maxHeight = '0';
            } else {
                item.classList.add('open');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });

});
