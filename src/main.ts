import './styles/main.css';
import {
  ONESTORE_PID,
  ONESTORE_WEB_URL,
  ONESTORE_APP_SCHEME,
  ONESTORE_ANDROID_INTENT,
  resolvePrimaryOneStoreTarget,
  launchOneStoreDownload,
  formatPostmarkDate,
  formatDiaryHeaderDate,
} from './utils/onestore';

document.documentElement.classList.add('js');

function initWebsite(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. 오늘 날짜 (소인 · 일기) */
  const now = new Date();
  const dateStr = formatPostmarkDate(now);
  document.querySelectorAll<HTMLElement>('.pm-date').forEach((el) => {
    el.textContent = dateStr;
  });
  const diaryDateEl = document.getElementById('diaryDate');
  if (diaryDateEl) {
    diaryDateEl.textContent = formatDiaryHeaderDate(now);
  }

  /* 2. 기기 환경 감지 및 원스토어 스마트 딥링크 바인딩 */
  const ua = navigator.userAgent || '';
  const targetResolution = resolvePrimaryOneStoreTarget(ua, ONESTORE_PID);
  const downloadToast = document.getElementById('downloadToast');

  const showToast = (msg: string) => {
    if (!downloadToast) return;
    downloadToast.textContent = msg;
    downloadToast.classList.remove('show');
    void downloadToast.offsetWidth;
    downloadToast.classList.add('show');
  };

  // Update smart links depending on Android vs Web environment
  const smartLinks = document.querySelectorAll<HTMLAnchorElement>('.js-onestore-smart-link');
  smartLinks.forEach((link) => {
    // Keep data attributes for transparency and testing
    link.setAttribute('data-onestore-pid', ONESTORE_PID);
    link.setAttribute('data-onestore-scheme', ONESTORE_APP_SCHEME);
    link.setAttribute('data-onestore-intent', ONESTORE_ANDROID_INTENT);
    link.setAttribute('data-onestore-web', ONESTORE_WEB_URL);

    if (targetResolution.platform.isAndroid) {
      link.href = targetResolution.primaryUrl;
      link.removeAttribute('target');
    } else {
      link.href = ONESTORE_WEB_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    link.addEventListener('click', (e) => {
      e.preventDefault();
      launchOneStoreDownload({
        mode: 'auto',
        onStatusUpdate: (message) => {
          showToast(`톡 — ${message}`);
        },
      });
    });
  });

  // Explicit "원스토어 앱 직접 열기 (onestore://)" button handler
  const directSchemeLinks = document.querySelectorAll<HTMLElement>('.js-onestore-scheme-btn');
  directSchemeLinks.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      launchOneStoreDownload({
        mode: 'app-scheme',
        onStatusUpdate: (message) => {
          showToast(`톡 — ${message}`);
        },
      });
    });
  });

  // Copy ONE store link button handler
  const copyBtns = document.querySelectorAll<HTMLElement>('.js-copy-onestore-url');
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(ONESTORE_WEB_URL);
        }
        const origText = btn.textContent;
        btn.textContent = '링크 복사됨 ✓';
        showToast(
          `톡 — 원스토어 다운로드 링크(${ONESTORE_WEB_URL})가 복사되었습니다.`
        );
        window.setTimeout(() => {
          btn.textContent = origText || '링크 복사';
        }, 2200);
      } catch {
        showToast(`원스토어 주소: ${ONESTORE_WEB_URL}`);
      }
    });
  });

  /* 3. 스크롤 리빌 및 활성 장면 감지 */
  const cuts = Array.from(document.querySelectorAll<HTMLElement>('.cut'));
  const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('.dot-btn'));
  const scrollBar = document.getElementById('scrollBar');

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));

  window.setTimeout(() => {
    document.querySelectorAll('.rv:not(.in)').forEach((el) => el.classList.add('in'));
  }, 2500);

  /* 4. 애플 스타일 연속 스크롤 인터폴레이션 & 패럴랙스 */
  let ticking = false;
  function updateScrollMotion(): void {
    ticking = false;
    const vh = window.innerHeight || 1;
    const docH = Math.max(1, document.documentElement.scrollHeight - vh);
    const pct = Math.min(100, Math.max(0, (window.scrollY / docH) * 100));
    if (scrollBar) {
      scrollBar.style.width = `${pct.toFixed(1)}%`;
    }

    let closestIdx = 0;
    let minDist = Infinity;

    cuts.forEach((cut, idx) => {
      const rect = cut.getBoundingClientRect();
      const centerOffset = rect.top + rect.height * 0.5 - vh * 0.5;
      const progress = centerOffset / vh;
      const absP = Math.abs(progress);

      if (absP < minDist) {
        minDist = absP;
        closestIdx = idx;
      }

      if (absP < 0.48) {
        cut.classList.add('is-active');
      } else {
        cut.classList.remove('is-active');
      }

      if (!reduceMotion) {
        const vCol = cut.querySelector<HTMLElement>('.visual-col');
        const cCol = cut.querySelector<HTMLElement>('.copy-col');
        const clamped = Math.max(-1, Math.min(1, progress));
        const opacity = Math.max(0.18, 1 - Math.pow(Math.abs(clamped), 1.35) * 0.85);
        const scale = 1 - Math.abs(clamped) * 0.055;
        const yVisual = clamped * 26;
        const yCopy = clamped * 44;

        if (vCol) {
          vCol.style.opacity = opacity.toFixed(3);
          vCol.style.transform = `translate3d(0,${yVisual.toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
        }
        if (cCol) {
          cCol.style.opacity = opacity.toFixed(3);
          cCol.style.transform = `translate3d(0,${yCopy.toFixed(1)}px,0)`;
        }
      }
    });

    dots.forEach((d, idx) => {
      if (idx === closestIdx) d.classList.add('active');
      else d.classList.remove('active');
    });
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollMotion);
        ticking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', updateScrollMotion);
  updateScrollMotion();

  /* 5. 우측 도트 클릭 시 부드러운 장면 이동 */
  dots.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  /* 6. Scene 4 — 타이핑 */
  const diaryLine =
    '매일 걷던 회색 길 끝에서 작은 새싹과 눈이 마주쳤다.\n저 여린 잎은, 어둠 속에서 어떤 계절을 꿈꾸며 올라왔을까?';
  const typedEl = document.getElementById('typed');
  let typingStarted = false;
  if (typedEl) {
    const tio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || typingStarted) return;
          typingStarted = true;
          if (reduceMotion) {
            typedEl.textContent = diaryLine;
            return;
          }
          let i = 0;
          const timer = window.setInterval(() => {
            i++;
            typedEl.textContent = diaryLine.slice(0, i);
            if (i >= diaryLine.length) window.clearInterval(timer);
          }, 55);
        });
      },
      { threshold: 0.35 }
    );
    tio.observe(typedEl);
  }

  /* 7. Scene 5 — 우표 만들기 체험 */
  const lab = document.getElementById('stampLab');
  const makeStampBtn = document.getElementById('makeStampBtn');
  const againBtn = document.getElementById('againBtn');

  if (lab && makeStampBtn && againBtn) {
    makeStampBtn.addEventListener('click', () => {
      lab.classList.add('done');
    });
    againBtn.addEventListener('click', () => {
      lab.classList.remove('done');
    });
  }

  /* 8. 처음으로 이동 버튼 */
  const againTop = document.getElementById('againTop');
  if (againTop) {
    againTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* 9. 모달 (원스토어 설치 안내 & 개인정보처리방침) */
  const guideModal = document.getElementById('onestoreGuideModal');
  const openGuideBtns = document.querySelectorAll<HTMLElement>('.js-open-guide-modal');
  const closeGuideBtn = document.getElementById('closeGuideModal');

  const privacyModal = document.getElementById('privacyPolicyModal');
  const openPrivacyBtns = document.querySelectorAll<HTMLElement>('.js-open-privacy-modal');
  const closePrivacyBtn = document.getElementById('closePrivacyModal');

  openGuideBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      guideModal?.classList.add('open');
    });
  });
  closeGuideBtn?.addEventListener('click', () => {
    guideModal?.classList.remove('open');
  });
  guideModal?.addEventListener('click', (e) => {
    if (e.target === guideModal) guideModal.classList.remove('open');
  });

  openPrivacyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      privacyModal?.classList.add('open');
    });
  });
  closePrivacyBtn?.addEventListener('click', () => {
    privacyModal?.classList.remove('open');
  });
  privacyModal?.addEventListener('click', (e) => {
    if (e.target === privacyModal) privacyModal.classList.remove('open');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      guideModal?.classList.remove('open');
      privacyModal?.classList.remove('open');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWebsite);
} else {
  initWebsite();
}
