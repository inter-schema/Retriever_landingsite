# Netlify 배포 산출물 폴더 (/deployments/netlify)

이 폴더는 **Netlify Drop (드래그 앤 드롭)** 또는 **Netlify CLI / Git 연동**으로 즉시 배포할 수 있는 정적 웹 호스팅 산출물입니다.

## 빠른 배포 방법 (30초 완료)
1. [Netlify Drop (app.netlify.com/drop)](https://app.netlify.com/drop) 에 접속합니다.
2. 이 `/deployments/netlify` 폴더 전체를 브라우저 화면에 드래그 앤 드롭합니다.
3. 즉시 `https://[원하는-이름].netlify.app` 주소가 생성되며, 모바일 원스토어 앱 딥링크(`intent://` / `onestore://`), 스크롤 애니메이션, 개인정보처리방침(`/privacy_policy.html`)이 모두 완벽히 동작합니다.

## 포함된 파일
- `index.html`: 최적화된 메인 랜딩 페이지
- `privacy_policy.html`: 원스토어 심사용 개인정보처리방침 단독 URL 페이지 (`/privacy` 경로로도 접속 가능)
- `assets/`: 해시 캐싱 적용된 CSS, JS 번들 및 수채화 일러스트(`.webp`)
- `netlify.toml` & `_redirects`: 캐시 최적화 및 라우팅 설정 파일
