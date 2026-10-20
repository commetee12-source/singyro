import { ArrowRight, Download, Expand } from "lucide-react";
import { Modal } from "./components";

// Original user-provided artwork. Keep image paths separate from the layout.
export const seoulBrand = {
  signature: "/brand/seoul-education-signature.jpg",
  welcome: "/brand/characters-welcome.jpg",
  growing: "/brand/characters-growing.jpg",
  visionHorizontal: "/brand/vision-horizontal.jpg",
  visionStacked: "/brand/vision-stacked.jpg",
  poster: "/brand/direction-poster.png",
  posterLandscape: "/brand/direction-poster-landscape.png",
  posterPdf: "/brand/seoul-direction-2026-2030.pdf",
};

export function SeoulEducationLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`seoul-logo ${className}`}
      viewBox="480 615 610 135"
      role="img"
      aria-label="서울특별시교육청 로고"
    >
      {/* Show the intact logo area of 응용형1.jpg without redrawing its artwork. */}
      <image href={seoulBrand.signature} width="1562" height="750" />
    </svg>
  );
}

export function SeoulWelcomeCharacters() {
  return (
    <figure className="seoul-welcome">
      <div className="seoul-welcome-image">
        <img
          src={seoulBrand.welcome}
          width="422"
          height="422"
          alt="환영해! 하고 인사하는 서울시교육청 캐릭터 자라나와 열리미"
          fetchPriority="high"
        />
      </div>
      <figcaption>
        <strong>자라나·열리미</strong>와 함께하는 서울교육 첫걸음
      </figcaption>
    </figure>
  );
}

export function SeoulVisionBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <section
      className="seoul-vision-banner"
      aria-label="2026–2030 서울교육방향"
    >
      <div className="seoul-vision-label">
        <span>2026–2030</span>
        <strong>서울교육방향</strong>
      </div>
      <picture>
        <source media="(max-width: 600px)" srcSet={seoulBrand.visionStacked} />
        <img
          src={seoulBrand.visionHorizontal}
          width="1712"
          height="168"
          alt="모두를 위한 기본교육, 행복한 협력교육"
        />
      </picture>
      <button className="vision-open" onClick={onOpen}>
        교육방향 보기 <ArrowRight size={16} />
      </button>
    </section>
  );
}

export function SeoulDirectionModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="2026–2030 서울교육방향" onClose={onClose} wide>
      <div className="seoul-direction-body">
        <h2>우리가 함께 만들어 갈 서울교육</h2>
        <p>시작은 촘촘하게, 기본은 탄탄하게, 성장은 다양하게.</p>
        <a
          className="direction-poster-link"
          href={seoulBrand.poster}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="서울교육방향 포스터 원본 크게 보기 (새 창)"
        >
          <picture>
            <source
              media="(min-width: 700px)"
              srcSet={seoulBrand.posterLandscape}
            />
            <img
              src={seoulBrand.poster}
              width="1078"
              height="1475"
              alt="2026–2030 서울교육방향. 창의와 공감의 미래형 전인교육, 모두의 배움을 보장하는 책임교육, 지속 가능한 민주시민교육, 함께 누리는 교육복지, 안전하고 평화로운 교육공동체."
            />
          </picture>
          <span>
            <Expand size={15} />
            포스터를 누르면 원본을 크게 볼 수 있어요
          </span>
        </a>
        <div className="direction-actions">
          <span>서울특별시교육청 교육방향 제공 이미지</span>
          <a className="button primary" href={seoulBrand.posterPdf} download>
            <Download size={16} />
            포스터 PDF 받기
          </a>
        </div>
      </div>
    </Modal>
  );
}
