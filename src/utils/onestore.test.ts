import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONESTORE_PID,
  ONESTORE_WEB_URL,
  ONESTORE_APP_SCHEME,
  ONESTORE_ANDROID_INTENT,
  buildOneStoreSchemeUrl,
  buildOneStoreWebUrl,
  buildOneStoreIntentUrl,
  detectPlatform,
  resolvePrimaryOneStoreTarget,
  formatPostmarkDate,
  formatDiaryHeaderDate,
} from './onestore';

test('ONE store constants match Golden Memory Retriever PID 0001012915', () => {
  assert.equal(ONESTORE_PID, '0001012915');
  assert.equal(
    ONESTORE_WEB_URL,
    'https://m.onestore.co.kr/v2/ko-kr/app/0001012915'
  );
  assert.equal(ONESTORE_APP_SCHEME, 'onestore://common/product/0001012915');
  assert.ok(
    ONESTORE_ANDROID_INTENT.startsWith(
      'intent://common/product/0001012915#Intent;scheme=onestore;S.browser_fallback_url='
    )
  );
  assert.ok(
    ONESTORE_ANDROID_INTENT.includes(
      encodeURIComponent('https://m.onestore.co.kr/v2/ko-kr/app/0001012915')
    )
  );
});

test('URL builders construct scheme, web, and Android intent URLs properly', () => {
  assert.equal(
    buildOneStoreSchemeUrl('0001012915'),
    'onestore://common/product/0001012915'
  );
  assert.equal(
    buildOneStoreWebUrl('0001012915'),
    'https://m.onestore.co.kr/v2/ko-kr/app/0001012915'
  );
  const intent = buildOneStoreIntentUrl('0001012915');
  assert.equal(
    intent,
    'intent://common/product/0001012915#Intent;scheme=onestore;S.browser_fallback_url=https%3A%2F%2Fm.onestore.co.kr%2Fv2%2Fko-kr%2Fapp%2F0001012915;end'
  );
});

test('detectPlatform identifies Android Chrome, Samsung Internet, KakaoTalk WebView, iOS, and Desktop', () => {
  const androidChrome = detectPlatform(
    'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
  );
  assert.equal(androidChrome.isAndroid, true);
  assert.equal(androidChrome.isMobile, true);
  assert.equal(androidChrome.supportsIntentUri, true);

  const kakaoAndroid = detectPlatform(
    'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.99 Mobile Safari/537.36 KAKAOTALK 10.7.1'
  );
  assert.equal(kakaoAndroid.isAndroid, true);
  assert.equal(kakaoAndroid.isInAppWebView, true);
  assert.equal(kakaoAndroid.supportsIntentUri, true);

  const androidFirefox = detectPlatform(
    'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0'
  );
  assert.equal(androidFirefox.isAndroid, true);
  assert.equal(androidFirefox.supportsIntentUri, false);

  const iosSafari = detectPlatform(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  );
  assert.equal(iosSafari.isIOS, true);
  assert.equal(iosSafari.isAndroid, false);

  const desktopMac = detectPlatform(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  assert.equal(desktopMac.isMobile, false);
  assert.equal(desktopMac.isAndroid, false);
});

test('resolvePrimaryOneStoreTarget chooses android-intent on Android Chrome and web-direct on desktop', () => {
  const androidTarget = resolvePrimaryOneStoreTarget(
    'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
  );
  assert.equal(androidTarget.strategy, 'android-intent');
  assert.equal(androidTarget.primaryUrl, ONESTORE_ANDROID_INTENT);
  assert.equal(androidTarget.schemeUrl, ONESTORE_APP_SCHEME);
  assert.equal(androidTarget.fallbackWebUrl, ONESTORE_WEB_URL);

  const firefoxTarget = resolvePrimaryOneStoreTarget(
    'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0'
  );
  assert.equal(firefoxTarget.strategy, 'android-scheme-fallback');
  assert.equal(firefoxTarget.primaryUrl, ONESTORE_APP_SCHEME);

  const desktopTarget = resolvePrimaryOneStoreTarget(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0'
  );
  assert.equal(desktopTarget.strategy, 'web-direct');
  assert.equal(desktopTarget.primaryUrl, ONESTORE_WEB_URL);
});

test('date formatters produce Korean postmark and diary strings', () => {
  const sampleDate = new Date(2026, 10, 21); // Nov 21, 2026 (Saturday)
  assert.equal(formatPostmarkDate(sampleDate), '2026. 11. 21.');
  assert.equal(
    formatDiaryHeaderDate(sampleDate),
    '11월 21일 토요일, 오늘의 호기심'
  );
});
