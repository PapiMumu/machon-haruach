import React from "react";

/** Left logo panel — matches Goodnews World Rock splash (#splash .logo-background). */
export const LoginHeroPanel: React.FC = () => (
  <>
    <style>{`
      .splash-logo-background {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        background-color: var(--c1, #2f3465);
        height: 100%;
        width: 100%;
        grid-column: 1 / 2;
        grid-row: 1 / 2;
        z-index: 1001;
        animation: splash-slide-left 1.3s ease-in-out forwards;
        overflow: hidden;
        box-shadow: 0 0 0 1px rgba(75, 82, 136, 0.35);
      }
      .splash-logo-background .hero-logo {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-height: 120px;
        margin: 0;
      }
      .splash-logo-background .hero-logo img {
        width: 220px;
        height: 220px;
        max-width: 65%;
        max-height: 65%;
        object-fit: contain;
      }
      @media (max-width: 992px) {
        .splash-logo-background {
          position: relative;
          animation: none;
          min-height: 200px;
          border-radius: 16px 16px 0 0;
        }
        .splash-logo-background .hero-logo img {
          width: 160px;
          height: 160px;
        }
      }
      @keyframes splash-slide-left {
        0% { width: 190%; }
        50% { width: 190%; }
        100% { width: 100%; }
      }
    `}</style>
    <div className="splash-logo-background" aria-hidden="true">
      <div className="hero-logo">
        <img src="/images/gnw_logo-gold_512.png" alt="" />
      </div>
    </div>
  </>
);
