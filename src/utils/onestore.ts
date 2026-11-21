export const ONESTORE_PID = '0001012915';
export const ONESTORE_WEB_URL = `https://m.onestore.co.kr/v2/ko-kr/app/${ONESTORE_PID}`;
export const ONESTORE_APP_SCHEME = `onestore://common/product/${ONESTORE_PID}`;
export const ONESTORE_ANDROID_INTENT = `intent://common/product/${ONESTORE_PID}#Intent;scheme=onestore;S.browser_fallback_url=${encodeURIComponent(ONESTORE_WEB_URL)};end`;

export interface PlatformDetection {
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  supportsIntentUri: boolean;
  isInAppWebView: boolean;
}

export type OneStoreRouteStrategy =
  | 'android-intent'
  | 'android-scheme-fallback'
  | 'web-direct';

export interface OneStoreTargetResolution {
  pid: string;
  primaryUrl: string;
  schemeUrl: string;
  intentUrl: string;
  fallbackWebUrl: string;
  strategy: OneStoreRouteStrategy;
  platform: PlatformDetection;
}

export function buildOneStoreSchemeUrl(pid: string = ONESTORE_PID): string {
  const cleanPid = pid.trim() || ONESTORE_PID;
  return `onestore://common/product/${cleanPid}`;
}

export function buildOneStoreWebUrl(pid: string = ONESTORE_PID): string {
  const cleanPid = pid.trim() || ONESTORE_PID;
  return `https://m.onestore.co.kr/v2/ko-kr/app/${cleanPid}`;
}

export function buildOneStoreIntentUrl(
  pid: string = ONESTORE_PID,
  fallbackUrl?: string
): string {
  const cleanPid = pid.trim() || ONESTORE_PID;
  const webFallback = fallbackUrl || buildOneStoreWebUrl(cleanPid);
  return `intent://common/product/${cleanPid}#Intent;scheme=onestore;S.browser_fallback_url=${encodeURIComponent(webFallback)};end`;
}

export function detectPlatform(userAgent: string = ''): PlatformDetection {
  const ua = userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobile|Tablet/i.test(ua);
  const isFirefox = /Firefox\/|FxiOS/i.test(ua);
  const isInAppWebView =
    /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(ua);

  // Android Chrome, Samsung Internet, Whale, Edge, and standard Android WebViews support intent:// URIs with S.browser_fallback_url
  const supportsIntentUri = isAndroid && !isFirefox;

  return {
    isAndroid,
    isIOS,
    isMobile,
    supportsIntentUri,
    isInAppWebView,
  };
}

export function resolvePrimaryOneStoreTarget(
  userAgent: string = '',
  pid: string = ONESTORE_PID
): OneStoreTargetResolution {
  const cleanPid = pid.trim() || ONESTORE_PID;
  const schemeUrl = buildOneStoreSchemeUrl(cleanPid);
  const fallbackWebUrl = buildOneStoreWebUrl(cleanPid);
  const intentUrl = buildOneStoreIntentUrl(cleanPid, fallbackWebUrl);
  const platform = detectPlatform(userAgent);

  if (platform.isAndroid) {
    if (platform.supportsIntentUri) {
      return {
        pid: cleanPid,
        primaryUrl: intentUrl,
        schemeUrl,
        intentUrl,
        fallbackWebUrl,
        strategy: 'android-intent',
        platform,
      };
    }
    return {
      pid: cleanPid,
      primaryUrl: schemeUrl,
      schemeUrl,
      intentUrl,
      fallbackWebUrl,
      strategy: 'android-scheme-fallback',
      platform,
    };
  }

  return {
    pid: cleanPid,
    primaryUrl: fallbackWebUrl,
    schemeUrl,
    intentUrl,
    fallbackWebUrl,
    strategy: 'web-direct',
    platform,
  };
}

export function formatPostmarkDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}. ${m}. ${d}.`;
}

export function formatDiaryHeaderDate(date: Date): string {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const wd = weekdays[date.getDay()];
  return `${m}월 ${d}일 ${wd}요일, 오늘의 호기심`;
}

/**
 * Launches the ONE store Golden Retriever product screen (`0001012915`).
 * - If user is on Android with ONE store installed: immediately opens ONE store app's Golden Retriever download screen (`onestore://common/product/0001012915`).
 * - If user is on Android without ONE store installed: automatically falls back to `https://m.onestore.co.kr/v2/ko-kr/app/0001012915`.
 * - If user is on Desktop / iOS: opens `https://m.onestore.co.kr/v2/ko-kr/app/0001012915` or invokes callback.
 */
export function launchOneStoreDownload(options?: {
  mode?: 'auto' | 'app-scheme' | 'web-only';
  onStatusUpdate?: (message: string, resolution: OneStoreTargetResolution) => void;
}): OneStoreTargetResolution {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const resolution = resolvePrimaryOneStoreTarget(ua, ONESTORE_PID);
  const mode = options?.mode ?? 'auto';

  if (typeof window === 'undefined') {
    return resolution;
  }

  if (mode === 'web-only') {
    options?.onStatusUpdate?.(
      '원스토어 모바일 웹 다운로드 페이지로 이동합니다.',
      resolution
    );
    window.open(resolution.fallbackWebUrl, '_blank', 'noopener,noreferrer');
    return resolution;
  }

  if (mode === 'app-scheme') {
    options?.onStatusUpdate?.(
      '원스토어 앱 내 골드리트리버 다운로드 화면을 호출합니다. 미설치 시 웹 스토어로 자동 연결됩니다.',
      resolution
    );
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      if (!document.hidden && Date.now() - startedAt < 2500) {
        window.location.href = resolution.fallbackWebUrl;
      }
    }, 1400);

    const handleVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    if (resolution.platform.isAndroid && resolution.platform.supportsIntentUri) {
      window.location.href = resolution.intentUrl;
    } else {
      window.location.href = resolution.schemeUrl;
    }
    return resolution;
  }

  // mode === 'auto'
  if (resolution.strategy === 'android-intent') {
    options?.onStatusUpdate?.(
      '원스토어 앱(설치 시) 또는 원스토어 다운로드 페이지로 바로 이동합니다.',
      resolution
    );
    window.location.href = resolution.intentUrl;
    return resolution;
  }

  if (resolution.strategy === 'android-scheme-fallback') {
    options?.onStatusUpdate?.(
      '원스토어 앱을 실행합니다. 앱이 없으면 웹 다운로드 화면으로 이동합니다.',
      resolution
    );
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      if (!document.hidden && Date.now() - startedAt < 2500) {
        window.location.href = resolution.fallbackWebUrl;
      }
    }, 1350);

    const handleVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.location.href = resolution.schemeUrl;
    return resolution;
  }

  // Desktop or iOS -> open web store in a new tab and notify UI
  options?.onStatusUpdate?.(
    '원스토어 골드리트리버 공식 페이지(0001012915)를 새 창으로 열었습니다. 안드로이드 기기에서는 원스토어 앱으로 바로 연결됩니다.',
    resolution
  );
  window.open(resolution.fallbackWebUrl, '_blank', 'noopener,noreferrer');
  return resolution;
}
