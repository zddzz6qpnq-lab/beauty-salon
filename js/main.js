// ハンバーガーメニュー
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navOverlay = document.getElementById('navOverlay');

hamburgerBtn.addEventListener('click', () => {
  hamburgerBtn.classList.toggle('active');
  navOverlay.classList.toggle('active');
});

// ナビリンクをクリックしたら閉じる
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    navOverlay.classList.remove('active');
  });
});

// ヒーロースライドショー
const heroImgs = document.querySelectorAll('.hero-img');
let currentImg = 0;
if (heroImgs.length > 1) {
  setInterval(() => {
    heroImgs[currentImg].classList.remove('active');
    currentImg = (currentImg + 1) % heroImgs.length;
    heroImgs[currentImg].classList.add('active');
  }, 5000);
}

// アコーディオン
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.parentElement;
    const content = item.querySelector('.accordion-content');
    const isOpen = item.classList.contains('open');

    // すべて閉じる
    document.querySelectorAll('.accordion-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.accordion-content').style.maxHeight = null;
    });

    // クリックしたものを開く（閉じていた場合）
    if (!isOpen) {
      item.classList.add('open');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  });
});

// スクロールアニメーション
const fadeUpEls = document.querySelectorAll('.fade-up');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.1 });

fadeUpEls.forEach(el => observer.observe(el));
