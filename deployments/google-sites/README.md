# Google Sites (구글 사이트 도구) 산출물 폴더 (/deployments/google-sites)

구글 사이트 도구(Google Sites)는 일반 웹 호스팅처럼 폴더(HTML/CSS/JS/이미지 파일 구조)를 업로드하는 기능이 없으며, **`<삽입(Embed)> -> <임베드 코드(Embed Code)>`** 기능으로 단일 HTML 코드를 붙여넣어야 동작합니다.

이 제약사항을 해결하기 위해 모든 스타일(CSS), 스크립트(JS), 그리고 7장의 수채화 일러스트 이미지를 **Base64 데이터 URI로 하나의 파일 안에 100% 통합(All-in-One)** 했습니다.

## 사용 방법 (Google Sites 전체 페이지 임베드)
1. [Google Sites (sites.google.com)](https://sites.google.com) 에서 새 사이트를 만듭니다.
2. 상단 메뉴 또는 우측 패널에서 **`삽입(Insert)` -> `</> 삽입(Embed)` -> `임베드 코드(Embed code)`** 탭을 클릭합니다.
3. 이 폴더의 **`google-sites-full-embed.html`** 파일 내용을 전체 복사(`Ctrl+A` -> `Ctrl+C`)하여 붙여넣고 `다음` -> `삽입`을 누릅니다.
4. 삽입된 블록을 페이지 전체 너비로 늘려주시면 골드리트리버 랜딩 페이지가 동작합니다.

## 포함된 파일
- `google-sites-full-embed.html`: CSS + JS + 수채화 일러스트 7장이 모두 단일 파일로 내장된 올인원 임베드 코드 (외부 서버 없이 독립 실행, 샌드박스 iframe 탈출용 `target="_top"` 패치 적용)
- `google-sites-privacy-embed.html`: 구글 사이트 도구의 별도 하위 페이지(`/privacy`)에 임베드할 수 있는 개인정보처리방침 단일 HTML 코드
- `images/`: 구글 사이트 기본 이미지 블록으로 직접 디자인을 조합하고 싶을 때 사용할 수 있는 원본 수채화 일러스트 파일 모음
