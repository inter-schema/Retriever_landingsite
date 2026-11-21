import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DEPLOY_ROOT = path.join(ROOT_DIR, 'deployments');
const NETLIFY_DIR = path.join(DEPLOY_ROOT, 'netlify');
const GOOGLE_SITES_DIR = path.join(DEPLOY_ROOT, 'google-sites');

console.log('1. Running production build (npm run build)...');
execSync('npm run build', { stdio: 'inherit', cwd: ROOT_DIR });

// Prepare directories
fs.rmSync(DEPLOY_ROOT, { recursive: true, force: true });
fs.mkdirSync(NETLIFY_DIR, { recursive: true });
fs.mkdirSync(GOOGLE_SITES_DIR, { recursive: true });

// Copy helper (skips aistudio chat reference screenshots so bundle stays lightweight & clean)
function copyDirFiltered(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'aistudio') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('2. Building Netlify deployment folder (/deployments/netlify)...');
copyDirFiltered(DIST_DIR, NETLIFY_DIR);

// Write netlify.toml
const netlifyToml = `# Netlify Configuration for Golden Memory Retriever (골드리트리버)
[build]
  publish = "."

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/privacy"
  to = "/privacy_policy.html"
  status = 200
`;
fs.writeFileSync(path.join(NETLIFY_DIR, 'netlify.toml'), netlifyToml, 'utf8');

// Write _redirects for Netlify Drag & Drop support
const netlifyRedirects = `/privacy  /privacy_policy.html  200
`;
fs.writeFileSync(path.join(NETLIFY_DIR, '_redirects'), netlifyRedirects, 'utf8');

const netlifyReadme = `# Netlify 배포 산출물 폴더 (/deployments/netlify)

이 폴더는 **Netlify Drop (드래그 앤 드롭)** 또는 **Netlify CLI / Git 연동**으로 즉시 배포할 수 있는 정적 웹 호스팅 산출물입니다.

## 빠른 배포 방법 (30초 완료)
1. [Netlify Drop (app.netlify.com/drop)](https://app.netlify.com/drop) 에 접속합니다.
2. 이 \`/deployments/netlify\` 폴더 전체를 브라우저 화면에 드래그 앤 드롭합니다.
3. 즉시 \`https://[원하는-이름].netlify.app\` 주소가 생성되며, 모바일 원스토어 앱 딥링크(\`intent://\` / \`onestore://\`), 스크롤 애니메이션, 개인정보처리방침(\`/privacy_policy.html\`)이 모두 완벽히 동작합니다.

## 포함된 파일
- \`index.html\`: 최적화된 메인 랜딩 페이지
- \`privacy_policy.html\`: 원스토어 심사용 개인정보처리방침 단독 URL 페이지 (\`/privacy\` 경로로도 접속 가능)
- \`assets/\`: 해시 캐싱 적용된 CSS, JS 번들 및 수채화 일러스트(\`.webp\`)
- \`netlify.toml\` & \`_redirects\`: 캐시 최적화 및 라우팅 설정 파일
`;
fs.writeFileSync(path.join(NETLIFY_DIR, 'README.md'), netlifyReadme, 'utf8');

console.log('3. Building Google Sites deployment folder (/deployments/google-sites)...');

// Read built index.html, CSS, and JS
let html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');

// Inline CSS files referenced in index.html
html = html.replace(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_match, href) => {
  const cssRel = href.replace(/^\//, '');
  const cssPath = path.join(DIST_DIR, cssRel);
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    return `<style>\n${cssContent}\n</style>`;
  }
  return _match;
});

// Inline JS files referenced in index.html
html = html.replace(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_match, src) => {
  const jsRel = src.replace(/^\//, '');
  const jsPath = path.join(DIST_DIR, jsRel);
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    return `<script type="module">\n${jsContent}\n</script>`;
  }
  return _match;
});

// Convert all /assets/illustrations/*.webp references in HTML to Base64 data URIs
const illustDir = path.join(DIST_DIR, 'assets', 'illustrations');
if (fs.existsSync(illustDir)) {
  for (const file of fs.readdirSync(illustDir)) {
    if (file.endsWith('.webp')) {
      const filePath = path.join(illustDir, file);
      const b64 = fs.readFileSync(filePath).toString('base64');
      const dataUri = `data:image/webp;base64,${b64}`;
      const targetUrl = `/assets/illustrations/${file}`;
      html = html.split(targetUrl).join(dataUri);
    }
  }
}

// Add target="_top" fallback handling for Google Sites sandboxed iframe
const googleSitesIframePatch = `
<script>
  // Google Sites Sandboxed Iframe Compatibility Patch
  document.addEventListener('click', function(e) {
    var target = e.target;
    var anchor = target && target.closest ? target.closest('a') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (href.indexOf('onestore://') === 0 || href.indexOf('intent://') === 0 || href.indexOf('https://m.onestore.co.kr') === 0) {
      anchor.setAttribute('target', '_top');
    }
  }, true);
</script>
`;
html = html.replace('</body>', `${googleSitesIframePatch}\n</body>`);

fs.writeFileSync(path.join(GOOGLE_SITES_DIR, 'google-sites-full-embed.html'), html, 'utf8');

// Copy privacy_policy.html for Google Sites standalone page embed
const privacyHtml = fs.readFileSync(path.join(DIST_DIR, 'privacy_policy.html'), 'utf8');
fs.writeFileSync(path.join(GOOGLE_SITES_DIR, 'google-sites-privacy-embed.html'), privacyHtml, 'utf8');

// Also copy individual illustration images into google-sites/images for native Google Sites block building
const gsImagesDir = path.join(GOOGLE_SITES_DIR, 'images');
fs.mkdirSync(gsImagesDir, { recursive: true });
if (fs.existsSync(illustDir)) {
  for (const file of fs.readdirSync(illustDir)) {
    if (file.endsWith('.webp')) {
      fs.copyFileSync(path.join(illustDir, file), path.join(gsImagesDir, file));
    }
  }
}

const googleSitesReadme = `# Google Sites (구글 사이트 도구) 산출물 폴더 (/deployments/google-sites)

구글 사이트 도구(Google Sites)는 일반 웹 호스팅처럼 폴더(HTML/CSS/JS/이미지 파일 구조)를 업로드하는 기능이 없으며, **\`<삽입(Embed)> -> <임베드 코드(Embed Code)>\`** 기능으로 단일 HTML 코드를 붙여넣어야 동작합니다.

이 제약사항을 해결하기 위해 모든 스타일(CSS), 스크립트(JS), 그리고 7장의 수채화 일러스트 이미지를 **Base64 데이터 URI로 하나의 파일 안에 100% 통합(All-in-One)** 했습니다.

## 사용 방법 (Google Sites 전체 페이지 임베드)
1. [Google Sites (sites.google.com)](https://sites.google.com) 에서 새 사이트를 만듭니다.
2. 상단 메뉴 또는 우측 패널에서 **\`삽입(Insert)\` -> \`</> 삽입(Embed)\` -> \`임베드 코드(Embed code)\`** 탭을 클릭합니다.
3. 이 폴더의 **\`google-sites-full-embed.html\`** 파일 내용을 전체 복사(\`Ctrl+A\` -> \`Ctrl+C\`)하여 붙여넣고 \`다음\` -> \`삽입\`을 누릅니다.
4. 삽입된 블록을 페이지 전체 너비로 늘려주시면 골드리트리버 랜딩 페이지가 동작합니다.

## 포함된 파일
- \`google-sites-full-embed.html\`: CSS + JS + 수채화 일러스트 7장이 모두 단일 파일로 내장된 올인원 임베드 코드 (외부 서버 없이 독립 실행, 샌드박스 iframe 탈출용 \`target="_top"\` 패치 적용)
- \`google-sites-privacy-embed.html\`: 구글 사이트 도구의 별도 하위 페이지(\`/privacy\`)에 임베드할 수 있는 개인정보처리방침 단일 HTML 코드
- \`images/\`: 구글 사이트 기본 이미지 블록으로 직접 디자인을 조합하고 싶을 때 사용할 수 있는 원본 수채화 일러스트 파일 모음
`;
fs.writeFileSync(path.join(GOOGLE_SITES_DIR, 'README.md'), googleSitesReadme, 'utf8');

console.log('Done! Created /deployments/netlify and /deployments/google-sites.');

