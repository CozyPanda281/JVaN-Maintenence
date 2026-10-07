import React, { useState, useEffect, useRef } from 'react';
import { verifyPasscode, isTerminalLocked, getRemainingLockoutSec } from '../utils/auth';
import { soundEngine } from '../audio/soundEngine';

export const AdminAuthModal = ({ isOpen, onSuccess, onClose }) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutSec, setLockoutSec] = useState(0);

  const inputRef = useRef(null);

  // Check lockout on mount and tick down
  useEffect(() => {
    if (!isOpen) return;

    soundEngine.init();
    setPasscode('');
    setErrorMsg('');

    if (isTerminalLocked()) {
      setLockoutSec(getRemainingLockoutSec());
    } else {
      setLockoutSec(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSec <= 0) return;
    const timer = setInterval(() => {
      setLockoutSec(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSec]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim() || isVerifying || lockoutSec > 0) return;

    setIsVerifying(true);
    setErrorMsg('');

    const res = await verifyPasscode(passcode);
    setIsVerifying(false);

    if (res.success) {
      soundEngine.playDoorUnlock();
      onSuccess();
    } else {
      soundEngine.playHazard();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (res.locked) {
        setLockoutSec(res.remainingSec || 60);
        setErrorMsg("TERMINAL LOCKED: TOO MANY FAILED ATTEMPTS.");
      } else {
        setErrorMsg(`ACCESS DENIED // ${res.attemptsRemaining} ATTEMPTS REMAINING`);
        setPasscode('');
        inputRef.current?.focus();
      }
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div 
        className={`auth-terminal-card ${isShaking ? 'shake-anim' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="auth-terminal-header">
          <div className="auth-badge-row">
            <span className="auth-security-pill">RESTRICTED ACCESS</span>
            <span className="auth-sub-pill">CLEARANCE LEVEL 5</span>
          </div>
          <button 
            className="auth-close-btn" 
            onClick={onClose} 
            onMouseEnter={() => soundEngine.playHover()}
            title="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Terminal Body */}
        <div className="auth-terminal-body">
          <div className="auth-terminal-title-wrap">
            <div className="auth-shield-icon">🛡️</div>
            <div>
              <h3 className="auth-terminal-title">JVāN ARCHIVE CONTROL</h3>
              <p className="auth-terminal-desc">AUTHENTICATION REQUIRED FOR SYSTEM MODIFICATION</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-flow">
            <div className="auth-input-group">
              <label htmlFor="admin-key">ENTER MASTER AUTHORIZATION KEY:</label>
              <div className="auth-input-wrap">
                <input
                  id="admin-key"
                  ref={inputRef}
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onKeyDown={(e) => { if (e.key !== 'Enter') soundEngine.playInputTick(); }}
                  placeholder="••••••••••••"
                  disabled={lockoutSec > 0 || isVerifying}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-show-pwd-btn"
                  onClick={() => { soundEngine.playClick(); setShowPasscode(!showPasscode); }}
                  onMouseEnter={() => soundEngine.playHover()}
                  title={showPasscode ? "Hide Passcode" : "Show Passcode"}
                >
                  {showPasscode ? "👁️" : "🔒"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="auth-error-banner" role="alert">
                ⚠ {errorMsg}
              </div>
            )}

            {lockoutSec > 0 && (
              <div className="auth-lockout-banner">
                ⏳ BRUTE-FORCE LOCKOUT: RETRY IN {lockoutSec}s
              </div>
            )}

            <div className="auth-actions-row">
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={lockoutSec > 0 || isVerifying || !passcode}
                onMouseEnter={() => soundEngine.playHover()}
              >
                {isVerifying ? "VERIFYING CRYPTO HASH..." : "AUTHENTICATE ↗"}
              </button>
              <button 
                type="button" 
                className="auth-cancel-btn" 
                onClick={onClose}
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
