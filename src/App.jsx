import React, { useState, useEffect, useRef } from 'react';
import { PixelRpgFullScreen } from './components/PixelRpgFullScreen';
import { RunwayDevilFullScreen } from './components/RunwayDevilFullScreen';
import { ContestSubmissionModal } from './components/ContestSubmissionModal';
import { PlayerAuthModal } from './components/PlayerAuthModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AdminCms } from './components/AdminCms';
import { AdminAuthModal } from './components/AdminAuthModal';
import { FabricBackground } from './components/FabricBackground';
import { loadCmsConfig } from './config/brandConfig';
import { hasActiveAdminSession, clearAdminSession } from './utils/auth';
import { getActivePlayer, logoutPlayer, getContestSubmissionsCount } from './utils/playerStorage';
import { soundEngine } from './audio/soundEngine';
import './App.css';

export function App() {
  const [cmsConfig, setCmsConfig] = useState(loadCmsConfig);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isDevilGameOpen, setIsDevilGameOpen] = useState(false);
  const [isContestOpen, setIsContestOpen] = useState(false);

  // Player Auth, Progress & Leaderboard States
  const [activePlayer, setActivePlayer] = useState(() => getActivePlayer());
  const [isPlayerAuthOpen, setIsPlayerAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [pendingGame, setPendingGame] = useState(null); // 'rpg' | 'runway_devil'
  const [leaderboardGame, setLeaderboardGame] = useState('runway_devil');
  const [submissionCount, setSubmissionCount] = useState(() => getContestSubmissionsCount());
  
  // Secret Admin states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminCmsOpen, setIsAdminCmsOpen] = useState(false);

  const [audioMode, setAudioMode] = useState(soundEngine.mode);
  const [muted, setMuted] = useState(soundEngine.isMuted);
  const [emailInput, setEmailInput] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('');

  // Secret Click Tracking
  const accentClickCount = useRef(0);
  const accentClickTimer = useRef(null);

  // Keep live ref to cmsConfig for document event listeners
  const cmsConfigRef = useRef(cmsConfig);
  useEffect(() => {
    cmsConfigRef.current = cmsConfig;
  }, [cmsConfig]);

  // Trigger Auth Gate (or CMS directly if already logged in)
  const triggerAuthGate = () => {
    soundEngine.init();
    soundEngine.playModalOpen();
    if (hasActiveAdminSession()) {
      setIsAdminCmsOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  // 1. Secret Keystroke Sequence ("jvan" or "vault") & Secret Shortcut (Cmd/Ctrl + Alt + J)
  useEffect(() => {
    let keyBuffer = '';

    const handleKeyDown = (e) => {
      // Don't trigger stealth keystrokes if typing inside the email form input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Secret Shortcut: Cmd+Option+J or Ctrl+Alt+J
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'KeyJ') {
        if (cmsConfigRef.current.loginMethods?.keyboardShortcut !== false) {
          e.preventDefault();
          soundEngine.playDoorUnlock();
          triggerAuthGate();
          return;
        }
      }

      // Stealth sequence buffer (e.g. typing "jvan" or "vault" anywhere)
      if (cmsConfigRef.current.loginMethods?.keystrokeSequence !== false) {
        if (e.key && e.key.length === 1) {
          // If typing one of the secret letters, play subtle tactile tumbler tick
          if ('jvanvault'.includes(e.key.toLowerCase())) {
            soundEngine.playSecretKey();
          }

          keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-8);
          if (keyBuffer.endsWith('jvan') || keyBuffer.endsWith('vault')) {
            keyBuffer = '';
            soundEngine.playDoorUnlock();
            triggerAuthGate();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Secret URL Hash check (#vault or ?access=vault)
  useEffect(() => {
    const checkSecretUrl = () => {
      if (cmsConfigRef.current.loginMethods?.urlHash !== false) {
        if (window.location.hash === '#vault' || window.location.search.includes('access=vault')) {
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (_) {}
          soundEngine.playDoorUnlock();
          triggerAuthGate();
        }
      }
    };
    checkSecretUrl();
    window.addEventListener('hashchange', checkSecretUrl);
    return () => window.removeEventListener('hashchange', checkSecretUrl);
  }, []);

  // 3. Secret Triple-Click on Accent Letter 'ā' in Header
  const handleSecretAccentClick = (e) => {
    e.stopPropagation();
    if (cmsConfig.loginMethods?.easterEggClick === false) return;

    soundEngine.init();
    soundEngine.playSecretKey();
    accentClickCount.current++;
    clearTimeout(accentClickTimer.current);

    if (accentClickCount.current >= 3) {
      accentClickCount.current = 0;
      soundEngine.playDoorUnlock();
      triggerAuthGate();
    } else {
      accentClickTimer.current = setTimeout(() => {
        accentClickCount.current = 0;
      }, 1200);
    }
  };

  // 4. Secret Double-Click on Status Dot
  const handleSecretDotDoubleClick = (e) => {
    e.stopPropagation();
    if (cmsConfig.loginMethods?.easterEggClick === false) return;

    soundEngine.init();
    soundEngine.playDoorUnlock();
    triggerAuthGate();
  };

  // Synchronize live public contest counter on storage / custom event
  useEffect(() => {
    const syncCounter = () => {
      setSubmissionCount(getContestSubmissionsCount());
    };
    window.addEventListener('jvan_contest_updated', syncCounter);
    window.addEventListener('storage', syncCounter);
    return () => {
      window.removeEventListener('jvan_contest_updated', syncCounter);
      window.removeEventListener('storage', syncCounter);
    };
  }, []);

  const handleCycleAudio = () => {
    soundEngine.init();
    const nextMode = soundEngine.cycleAudioMode();
    setAudioMode(nextMode);
    setMuted(nextMode === 'muted');
    if (nextMode !== 'muted') soundEngine.playClick();
  };

  // Launch Game with Authentication Gate
  const handleLaunchGame = () => {
    soundEngine.init();
    const current = getActivePlayer();
    if (!current) {
      soundEngine.playModalOpen();
      setPendingGame('rpg');
      setIsPlayerAuthOpen(true);
      return;
    }
    soundEngine.playGameStart();
    setIsGameOpen(true);
  };

  const handleLaunchDevilGame = () => {
    soundEngine.init();
    const current = getActivePlayer();
    if (!current) {
      soundEngine.playModalOpen();
      setPendingGame('runway_devil');
      setIsPlayerAuthOpen(true);
      return;
    }
    soundEngine.playGameStart();
    setIsDevilGameOpen(true);
  };

  const handlePlayerAuthSuccess = (player) => {
    setActivePlayer(player);
    setIsPlayerAuthOpen(false);
    if (pendingGame === 'rpg') {
      setIsGameOpen(true);
    } else if (pendingGame === 'runway_devil') {
      setIsDevilGameOpen(true);
    }
    setPendingGame(null);
  };

  const handlePlayerLogout = () => {
    soundEngine.playModalClose();
    logoutPlayer();
    setActivePlayer(null);
  };

  const handleOpenLeaderboard = (game = 'runway_devil') => {
    soundEngine.init();
    soundEngine.playClick();
    setLeaderboardGame(game);
    setIsLeaderboardOpen(true);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    const val = emailInput.trim();
    if (!val) return;

    soundEngine.init();
    soundEngine.playSubscribeSuccess();

    const saved = JSON.parse(localStorage.getItem('jvan_subscribers') || '[]');
    if (!saved.includes(val)) {
      saved.push(val);
      localStorage.setItem('jvan_subscribers', JSON.stringify(saved));
    }

    setSubscribeStatus(`✓ WE'LL NOTIFY ${val} AS SOON AS THE ATELIER RELAUNCHES.`);
    setEmailInput('');
    setTimeout(() => setSubscribeStatus(''), 6000);
  };

  // Successful Authentication Handler
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsAdminCmsOpen(true);
  };

  // Logout Handler
  const handleLogout = () => {
    soundEngine.playModalClose();
    clearAdminSession();
    setIsAdminCmsOpen(false);
  };

  return (
    <div className="app-container">
      {/* Animated Luxury Draped Fabric & Fashion Video Backdrop */}
      <FabricBackground />

      {/* Floating Audio Button (Bottom Left - Minimalist Custom Sound Icon Only) */}
      <button 
        className={`floating-audio-fab ${audioMode === 'all' ? 'active-audio active-ambient' : audioMode === 'sfx' ? 'active-audio' : 'muted-audio'}`}
        onClick={handleCycleAudio}
        onMouseEnter={() => soundEngine.playHover()}
        aria-label="Toggle Audio Experience"
        title={`Sound: ${audioMode === 'all' ? 'Atelier Luxe (Ambient + SFX)' : audioMode === 'sfx' ? 'Tactile SFX Only' : 'Muted'}`}
      >
        <span className="fab-icon">
          {audioMode === 'all' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.25" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
          {audioMode === 'sfx' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.25" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
          {audioMode === 'muted' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </span>
      </button>

      {/* Main Content Layout - Begins with Official Notice (Nothing beside or above it) */}
      <main className="main-content-flow">
        {/* Section 1: Main Focus - Under Maintenance Notice */}
        <section className="maintenance-hero-section">
          <div 
            className="notice-meta-tag"
            onDoubleClick={handleSecretDotDoubleClick}
            title=""
          >
            [OFFICIAL STATUS NOTICE]
          </div>
          
          <h1 className="maintenance-headline">
            <span className="brand-wordmark-highlight">
              JV<span 
                className="accent-letter stealth-trigger-letter"
                onClick={handleSecretAccentClick}
                title=""
              >ā</span>N
            </span>
            {" " + (cmsConfig.maintenance?.headline ? cmsConfig.maintenance.headline.replace(/^JVāN\s*/i, '').replace(/^JVAN\s*/i, '') : "IS CURRENTLY UNDER MAINTENANCE")}
          </h1>

          <div className="maintenance-subheadline">
            {cmsConfig.maintenance.subheadline}
          </div>

          <p className="maintenance-description">
            {cmsConfig.maintenance.description}
          </p>

          {/* System Telemetry Diagnostics Dashboard */}
          <div className="telemetry-grid">
            {(cmsConfig.maintenance.telemetry || []).map((item, idx) => (
              <div 
                key={idx} 
                className="telemetry-card"
                onMouseEnter={() => soundEngine.playHover()}
              >
                <span className="telemetry-label">{item.label}</span>
                <span className={`telemetry-val ${item.status}`}>
                  {item.status === 'warning' && '⚠ '}
                  {item.status === 'ok' && '✓ '}
                  {item.status === 'active' && '⚡ '}
                  {item.val}
                </span>
              </div>
            ))}
          </div>

          {/* Dual Action Suite for Fullscreen Games with Player Session Indicator */}
          <div className="game-action-container dual-arcade-suite">
            {/* Player Session & Leaderboard Bar */}
            <div className="arcade-session-bar">
              <div className="arcade-session-left">
                {activePlayer ? (
                  <div className="active-player-session">
                    <span className="session-status-dot online"></span>
                    <span className="session-label">PLAYER ACTIVE:</span>
                    <strong className="session-alias">{activePlayer.alias}</strong>
                    <span className="session-contact mono">{activePlayer.contactValue}</span>
                    <button 
                      className="session-switch-btn" 
                      onClick={handlePlayerLogout}
                      onMouseEnter={() => soundEngine.playHover()}
                      title="Switch player profile or sign out"
                    >
                      [SWITCH / LOGOUT]
                    </button>
                  </div>
                ) : (
                  <div className="guest-player-session">
                    <span className="session-status-dot req"></span>
                    <span className="session-notice">ARCADE ACCESS: AUTHENTICATION REQUIRED • PROGRESS PERSISTENTLY SAVED</span>
                  </div>
                )}
              </div>
              <div className="arcade-session-right">
                <button 
                  className="view-leaderboard-btn"
                  onClick={() => handleOpenLeaderboard('runway_devil')}
                  onMouseEnter={() => soundEngine.playHover()}
                  title="View Runway Devil & Atelier RPG Global Leaderboards"
                >
                  🏆 HALL OF CHAMPIONS // LEADERBOARDS
                </button>
              </div>
            </div>

            <div className="dual-game-grid">
              {/* Game 01: Atelier Archive RPG */}
              <button 
                className="game-launch-button arcade-card" 
                onClick={handleLaunchGame}
                onMouseEnter={() => soundEngine.playHover()}
              >
                <div className="game-btn-icon-wrap">
                  <span className="game-btn-icon">🕹️</span>
                  <span className="game-btn-beacon"></span>
                </div>
                <div className="game-btn-text">
                  <span className="arcade-game-badge">ARCADE 01 // COUTURE RPG</span>
                  <span className="btn-main-title">{cmsConfig.game.buttonLabel}</span>
                  <span className="btn-sub-label">{cmsConfig.game.buttonSubtext}</span>
                </div>
                <span className="game-btn-arrow">↗</span>
              </button>

              {/* Game 02: Runway Devil Precision Platformer */}
              <button 
                className="game-launch-button arcade-card devil-accent" 
                onClick={handleLaunchDevilGame}
                onMouseEnter={() => soundEngine.playHover()}
              >
                <div className="game-btn-icon-wrap">
                  <span className="game-btn-icon">😈</span>
                  <span className="game-btn-beacon devil-beacon"></span>
                </div>
                <div className="game-btn-text">
                  <span className="arcade-game-badge devil-badge">ARCADE 02 // TROLL PLATFORMER</span>
                  <span className="btn-main-title">{cmsConfig.runwayDevil?.buttonLabel || "PLAY RUNWAY DEVIL // TROLL PRECISION PLATFORMER"}</span>
                  <span className="btn-sub-label">{cmsConfig.runwayDevil?.buttonSubtext || "INFINITE DECEPTIVE LEVELS • SHIFTING FLOORS & TRICKS • NEVER IMPOSSIBLE"}</span>
                </div>
                <span className="game-btn-arrow">↗</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Contest Information */}
        {cmsConfig.contest?.enabled !== false && (
          <section className="contest-info-section">
            <div className="contest-card-wrapper">
              {/* Couture Atelier Corner Accents */}
              <div className="atelier-corner-mark top-left" aria-hidden="true"></div>
              <div className="atelier-corner-mark top-right" aria-hidden="true"></div>
              <div className="atelier-corner-mark bottom-left" aria-hidden="true"></div>
              <div className="atelier-corner-mark bottom-right" aria-hidden="true"></div>

              <div className="contest-card-header">
                <div className="contest-tag-row">
                  <span className="contest-status-pill">
                    <span className="live-pulse-dot"></span>
                    ACTIVE CURATION
                  </span>
                  <span className="contest-tag-sep">/</span>
                  {/* Public Anonymized Live Submission Counter (Strictly count only, no participant details) */}
                  <span className="contest-live-counter-pill" title="Live anonymized count of submitted concepts">
                    <span className="counter-num">{submissionCount}</span> CONCEPTS SUBMITTED // 100% ANONYMIZED
                  </span>
                  <span className="contest-tag-sep">/</span>
                  <span className="contest-tag">COMMUNITY ATELIER INITIATIVE // SS26 RUNWAY</span>
                </div>
                <h3 className="contest-title">{cmsConfig.contest.title}</h3>
                <p className="contest-lead">
                  {cmsConfig.contest.description}
                </p>
              </div>

              <div className="contest-prizes-grid">
                {(cmsConfig.contest.prizes || []).map((prize, idx) => (
                  <div 
                    key={idx} 
                    className={`prize-card-block ${idx === 0 ? 'primary-prize' : 'secondary-prize'}`}
                    onMouseEnter={() => soundEngine.playHover()}
                  >
                    <div className="prize-card-top">
                      <span className="prize-rank-index">0{idx + 1}</span>
                      <div className="prize-rank-badge">
                        {idx === 0 ? '✦ ' : ''}{prize.rank}
                      </div>
                    </div>
                    <div className="prize-highlight-title">{prize.highlight}</div>
                    <p className="prize-details-text">{prize.details}</p>
                    <div className="prize-card-watermark" aria-hidden="true">
                      <span>{idx === 0 ? 'RUNWAY' : 'ARCHIVE'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Garment Blueprint Specs Bar with Live Submissions Highlight */}
              <div className="contest-specs-banner">
                <div className="spec-badge-item counter-spec-item">
                  <span className="spec-bullet">✦</span>
                  <span className="spec-title">TOTAL SUBMISSIONS:</span>
                  <span className="spec-desc counter-bold-val">{submissionCount} CONCEPTS RECEIVED</span>
                </div>
                <div className="spec-badge-item">
                  <span className="spec-bullet">■</span>
                  <span className="spec-title">SILHOUETTES:</span>
                  <span className="spec-desc">320GSM Heavyweight Tee & 460GSM French Terry Hoodie</span>
                </div>
                <div className="spec-badge-item">
                  <span className="spec-bullet">■</span>
                  <span className="spec-title">FORMAT:</span>
                  <span className="spec-desc">Transparent PNG (Up to 2 Graphics)</span>
                </div>
                <div className="spec-badge-item">
                  <span className="spec-bullet">■</span>
                  <span className="spec-title">RIGHTS:</span>
                  <span className="spec-desc">Any and all submissions are owned by JVāN</span>
                </div>
              </div>

              <div className="contest-action-row">
                <button 
                  className="open-contest-btn" 
                  onMouseEnter={() => soundEngine.playHover()}
                  onClick={() => { soundEngine.playModalOpen(); setIsContestOpen(true); }}
                >
                  <span className="btn-pen-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                  </span>
                  <span className="btn-label">LAUNCH ATELIER DESIGN LAB // SUBMIT CONCEPT</span>
                  <span className="btn-arrow">↗</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: VIP Drop Alert Form */}
        <section className="notify-section">
          <div className="notify-box">
            <label htmlFor="user-email" className="notify-prompt">
              GET NOTIFIED THE MOMENT OUR STOREFRONT RELAUNCHES:
            </label>
            <form onSubmit={handleSubscribe} className="notify-form">
              <input
                id="user-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key !== 'Enter') soundEngine.playInputTick(); }}
                placeholder="ENTER YOUR EMAIL ADDRESS"
                required
                className="notify-input"
              />
              <button 
                type="submit" 
                className="notify-btn"
                onMouseEnter={() => soundEngine.playHover()}
              >
                NOTIFY ME ↗
              </button>
            </form>
            {subscribeStatus && (
              <div className="notify-success" role="status">
                {subscribeStatus}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Clean Footer - Discreet & Professional (No Visible Admin Links) */}
      <footer className="site-footer">
        <div className="footer-left">
          <span>{cmsConfig.copyright}</span>
          <span className="concierge-mail">
            INQUIRIES: <a href={`mailto:${cmsConfig.conciergeEmail}`} onMouseEnter={() => soundEngine.playHover()}>{cmsConfig.conciergeEmail}</a>
          </span>
        </div>

        {cmsConfig.socials?.masterEnabled !== false && (
          <div className="footer-social-links">
            {cmsConfig.socials?.enabled?.instagram !== false && cmsConfig.socials?.instagram && (
              <a href={cmsConfig.socials.instagram} target="_blank" rel="noopener noreferrer" onMouseEnter={() => soundEngine.playHover()}>INSTAGRAM</a>
            )}
            {cmsConfig.socials?.enabled?.tiktok !== false && cmsConfig.socials?.tiktok && (
              <a href={cmsConfig.socials.tiktok} target="_blank" rel="noopener noreferrer" onMouseEnter={() => soundEngine.playHover()}>TIKTOK</a>
            )}
            {cmsConfig.socials?.enabled?.discord !== false && cmsConfig.socials?.discord && (
              <a href={cmsConfig.socials.discord} target="_blank" rel="noopener noreferrer" onMouseEnter={() => soundEngine.playHover()}>DISCORD</a>
            )}
            {cmsConfig.socials?.enabled?.twitter !== false && cmsConfig.socials?.twitter && (
              <a href={cmsConfig.socials.twitter} target="_blank" rel="noopener noreferrer" onMouseEnter={() => soundEngine.playHover()}>X (TWITTER)</a>
            )}
          </div>
        )}
      </footer>

      {/* Full-Screen Detective RPG Game Modal */}
      {isGameOpen && (
        <PixelRpgFullScreen 
          isOpen={isGameOpen} 
          onOpenLeaderboard={handleOpenLeaderboard}
          onClose={() => {
            soundEngine.playModalClose();
            setIsGameOpen(false);
          }} 
        />
      )}

      {/* Full-Screen Runway Devil Platformer Game Modal */}
      {isDevilGameOpen && (
        <RunwayDevilFullScreen 
          isOpen={isDevilGameOpen} 
          onOpenLeaderboard={handleOpenLeaderboard}
          onClose={() => {
            soundEngine.playModalClose();
            setIsDevilGameOpen(false);
          }} 
        />
      )}

      {/* Player Login Authentication Modal */}
      <PlayerAuthModal 
        isOpen={isPlayerAuthOpen}
        targetGame={pendingGame}
        onSuccess={handlePlayerAuthSuccess}
        onClose={() => {
          soundEngine.playModalClose();
          setIsPlayerAuthOpen(false);
          setPendingGame(null);
        }}
      />

      {/* Arcade Hall of Champions Leaderboards Modal */}
      <LeaderboardModal 
        isOpen={isLeaderboardOpen}
        initialGame={leaderboardGame}
        onLaunchGame={(game) => {
          setIsLeaderboardOpen(false);
          if (game === 'rpg') handleLaunchGame();
          else handleLaunchDevilGame();
        }}
        onClose={() => {
          soundEngine.playModalClose();
          setIsLeaderboardOpen(false);
        }}
      />

      {/* Contest Submission Modal */}
      <ContestSubmissionModal 
        isOpen={isContestOpen} 
        onClose={() => { soundEngine.playModalClose(); setIsContestOpen(false); }} 
      />

      {/* Secret Authentication Clearance Gate */}
      <AdminAuthModal 
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
        onClose={() => { soundEngine.playModalClose(); setIsAuthModalOpen(false); }}
      />

      {/* Secure Admin CMS Dashboard */}
      {isAdminCmsOpen && (
        <AdminCms 
          config={cmsConfig}
          onSave={(updated) => setCmsConfig(updated)}
          onClose={() => { soundEngine.playModalClose(); setIsAdminCmsOpen(false); }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
