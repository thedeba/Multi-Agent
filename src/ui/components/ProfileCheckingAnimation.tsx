import React from 'react';
import { ShieldCheck, Cpu, Globe, Sparkles } from 'lucide-react';
import appLogo from '../icon.svg';

interface ProfileCheckingAnimationProps {
  title?: string;
  subtitle?: string;
}

export const ProfileCheckingAnimation: React.FC<ProfileCheckingAnimationProps> = ({
  title = 'Checking your profile…',
  subtitle = 'Verifying cloud credentials, anti-detect fingerprints & network security',
}) => {
  return (
    <main className="profile-checking-container" role="status" aria-live="polite">
      {/* Background ambient lighting glows */}
      <div className="profile-checking-bg-glow profile-checking-bg-glow-1" aria-hidden="true" />
      <div className="profile-checking-bg-glow profile-checking-bg-glow-2" aria-hidden="true" />

      {/* Main Glassmorphic Card */}
      <div className="profile-checking-card">
        {/* Holographic Radar & Floating Logo */}
        <div className="profile-checking-hologram">
          {/* Outer dashed spinning radar ring */}
          <div className="profile-checking-radar-outer" aria-hidden="true" />

          {/* Middle counter-rotating gradient ring */}
          <div className="profile-checking-radar-mid" aria-hidden="true" />

          {/* Orbiting glowing particle bead */}
          <div className="profile-checking-orbit-track" aria-hidden="true">
            <div className="profile-checking-orbit-dot" />
          </div>

          {/* Center glowing logo */}
          <div className="profile-checking-logo-wrapper">
            <div className="profile-checking-core-glow" aria-hidden="true" />
            <img src={appLogo} alt="Multi Agent" className="profile-checking-logo" />
          </div>
        </div>

        {/* Text Details */}
        <div className="profile-checking-text-group">
          <div className="profile-checking-badge">
            <span className="profile-checking-badge-dot" />
            <span>INITIALIZING SECURE ENVIRONMENT</span>
          </div>

          <h2 className="profile-checking-title">
            {title}
          </h2>

          <p className="profile-checking-subtitle">
            {subtitle}
          </p>
        </div>

        {/* High-Tech Laser Shimmer Progress Bar */}
        <div className="profile-checking-bar-track">
          <div className="profile-checking-bar-fill" />
        </div>

        {/* Security & System Checkpoints */}
        <div className="profile-checking-checkpoints">
          <div className="profile-checking-pill">
            <ShieldCheck size={14} className="profile-checking-pill-icon shield" />
            <span>Anti-Detect Shield</span>
          </div>
          <div className="profile-checking-pill">
            <Globe size={14} className="profile-checking-pill-icon globe" />
            <span>Network Tunnel</span>
          </div>
          <div className="profile-checking-pill">
            <Cpu size={14} className="profile-checking-pill-icon cpu" />
            <span>Isolated Sandbox</span>
          </div>
        </div>
      </div>
    </main>
  );
};

