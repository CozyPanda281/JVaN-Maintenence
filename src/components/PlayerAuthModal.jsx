import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { loginPlayer } from '../utils/playerStorage';

export const PlayerAuthModal = ({ isOpen, targetGame, onSuccess, onClose }) => {
  const [alias, setAlias] = useState('');
  const [contactType, setContactType] = useState('instagram'); // 'instagram' | 'email'
  const [contactValue, setContactValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const aliasInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    soundEngine.init();
    setErrorMsg('');
    setAlias('');
    setContactValue('');
    setTimeout(() => aliasInputRef.current?.focus(), 80);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        soundEngine.playModalClose();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    soundEngine.init();
    setErrorMsg('');

    const cleanAlias = alias.trim().toUpperCase();
    if (!cleanAlias || cleanAlias.length < 2) {
      soundEngine.playHazard();
      setErrorMsg('Please enter a player handle (at least 2 characters).');
      return;
    }

    const cleanContact = contactValue.trim();
    if (!cleanContact) {
      soundEngine.playHazard();
      setErrorMsg(`Please enter your ${contactType === 'email' ? 'email address' : 'Instagram handle'} to save progress.`);
      return;
    }

    if (contactType === 'email' && !cleanContact.includes('@')) {
      soundEngine.playHazard();
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    soundEngine.playGameStart();

    const formattedContact = contactType === 'instagram' && !cleanContact.startsWith('@')
      ? `@${cleanContact}`
      : cleanContact;

    const player = loginPlayer({
      alias: cleanAlias,
      contactType,
      contactValue: formattedContact,
      game: targetGame || 'runway_devil'
    });

    setIsSubmitting(false);
    onSuccess(player);
  };

  const gameTitle = targetGame === 'rpg' 
    ? 'ATELIER ARCHIVE // COUTURE RPG' 
    : 'RUNWAY DEVIL // TROLL PLATFORMER';

  return (
    <div className="auth-modal-backdrop player-auth-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="auth-terminal-card player-auth-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="auth-terminal-header">
          <div className="auth-badge-row">
            <span className="auth-security-pill">ARCADE CREDENTIALS</span>
            <span className="auth-sub-pill">SESSION PERSISTENCE</span>
          </div>
          <button 
            className="auth-close-btn" 
            onClick={() => { soundEngine.playModalClose(); onClose(); }} 
            onMouseEnter={() => soundEngine.playHover()}
            title="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Terminal Body */}
        <div className="auth-terminal-body">
          <div className="auth-terminal-title-wrap">
            <div className="auth-shield-icon">{targetGame === 'rpg' ? '🕹️' : '😈'}</div>
            <div>
              <h3 className="auth-terminal-title">PLAYER SIGN-IN</h3>
              <p className="auth-terminal-desc">
                {gameTitle} • PROGRESS & LEADERBOARD SYNC
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-flow">
            {/* Alias Input */}
            <div className="auth-input-group">
              <label htmlFor="player-alias">PLAYER ALIAS / GAMERTAG:</label>
              <div className="auth-input-wrap">
                <input
                  id="player-alias"
                  ref={aliasInputRef}
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key !== 'Enter') soundEngine.playInputTick(); }}
                  placeholder="E.G. KAI_ARCHIVE"
                  maxLength={18}
                  required
                />
              </div>
              <small className="player-input-hint">Displayed on the public arcade leaderboards.</small>
            </div>

            {/* Contact Switcher */}
            <div className="auth-input-group">
              <label>CONTACT RECOVERY (EMAIL OR INSTAGRAM):</label>
              <div className="contact-type-toggle" style={{ marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className={`contact-toggle-btn ${contactType === 'instagram' ? 'active' : ''}`}
                  onClick={() => { soundEngine.playClick(); setContactType('instagram'); }}
                >
                  INSTAGRAM HANDLE
                </button>
                <button
                  type="button"
                  className={`contact-toggle-btn ${contactType === 'email' ? 'active' : ''}`}
                  onClick={() => { soundEngine.playClick(); setContactType('email'); }}
                >
                  EMAIL ADDRESS
                </button>
              </div>

              <div className="auth-input-wrap">
                <input
                  id="player-contact"
                  type={contactType === 'email' ? 'email' : 'text'}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key !== 'Enter') soundEngine.playInputTick(); }}
                  placeholder={contactType === 'instagram' ? '@yourhandle' : 'yourname@domain.com'}
                  required
                />
              </div>
              <small className="player-input-hint">
                Used to restore high scores & notify leaderboard champions.
              </small>
            </div>

            {errorMsg && (
              <div className="auth-error-banner" role="alert">
                ⚠ {errorMsg}
              </div>
            )}

            {/* Value Props Ribbon */}
            <div className="player-auth-features">
              <span>✦ Auto-saves highest stage & attempts</span>
              <span>✦ Syncs with live global leaderboards</span>
            </div>

            <div className="auth-actions-row">
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isSubmitting || !alias.trim() || !contactValue.trim()}
                onMouseEnter={() => soundEngine.playHover()}
              >
                {isSubmitting ? "SYNCING PROFILE..." : "ENTER ARCADE & PLAY ↗"}
              </button>
              <button 
                type="button" 
                className="auth-cancel-btn" 
                onClick={() => { soundEngine.playModalClose(); onClose(); }}
                onMouseEnter={() => soundEngine.playHover()}
              >
                CANCEL [ESC]
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
