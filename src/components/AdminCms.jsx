import React, { useState, useEffect } from 'react';
import { saveCmsConfig, resetCmsConfig } from '../config/brandConfig';
import { clearAdminSession, updateMasterPasscode } from '../utils/auth';
import { 
  getAllPlayers, 
  deletePlayer, 
  clearAllPlayers, 
  getContestSubmissions, 
  deleteContestSubmission 
} from '../utils/playerStorage';
import { soundEngine } from '../audio/soundEngine';

export const AdminCms = ({ config, onSave, onClose, onLogout }) => {
  const [formData, setFormData] = useState(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState('all_logins'); // 'copy' | 'telemetry' | 'contest' | 'game' | 'all_logins' | 'contest_submissions' | 'contact' | 'security'
  const [toastMessage, setToastMessage] = useState('');
  
  // All Players Logins state
  const [players, setPlayers] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Security passcodes form
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdStatus, setPwdStatus] = useState('');

  useEffect(() => {
    // Load player accounts, contest entries, and subscribers
    try {
      setPlayers(getAllPlayers());
      setSubmissions(getContestSubmissions());
      const storedEmails = JSON.parse(localStorage.getItem('jvan_subscribers') || '[]');
      setSubscribers(storedEmails);
    } catch (err) {
      console.error("Error loading logins & leads in CMS:", err);
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSave = () => {
    soundEngine.init();
    soundEngine.playSubscribeSuccess();
    saveCmsConfig(formData);
    onSave(formData);
    showToast("✓ ALL CHANGES SAVED AND APPLIED TO LIVE WEBSITE!");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all website text to factory defaults?")) {
      soundEngine.init();
      soundEngine.playHazard();
      const defaults = resetCmsConfig();
      setFormData(JSON.parse(JSON.stringify(defaults)));
      onSave(defaults);
      showToast("↺ RESTORED DEFAULT BRAND CONFIGURATION!");
    }
  };

  const handleLogoutClick = () => {
    soundEngine.init();
    soundEngine.playModalClose();
    clearAdminSession();
    if (onLogout) {
      onLogout();
    } else {
      onClose();
    }
  };

  // Generic updater
  const updateField = (path, value) => {
    setFormData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  // Ticker items management
  const handleAddTicker = () => {
    const item = prompt("Enter new ticker message:");
    if (item && item.trim()) {
      setFormData(prev => ({
        ...prev,
        tickerItems: [...(prev.tickerItems || []), item.trim().toUpperCase()]
      }));
    }
  };

  const handleRemoveTicker = (idx) => {
    setFormData(prev => ({
      ...prev,
      tickerItems: prev.tickerItems.filter((_, i) => i !== idx)
    }));
  };

  // Player Logins Management
  const handleDeletePlayer = (playerId) => {
    soundEngine.init();
    if (window.confirm(`Delete player account "${playerId}"? This will erase their game progress from the leaderboard.`)) {
      soundEngine.playHazard();
      const updated = deletePlayer(playerId);
      setPlayers(updated);
      showToast(`✓ Player ${playerId} removed from arcade registry.`);
    }
  };

  const handleClearAllPlayers = () => {
    soundEngine.init();
    if (window.confirm("CRITICAL CONFIRMATION: Clear ALL player accounts? This will wipe all recorded game progress and reset leaderboards.")) {
      soundEngine.playHazard();
      const cleared = clearAllPlayers();
      setPlayers(cleared);
      showToast("✓ All player accounts cleared.");
    }
  };

  const handleExportPlayersJson = () => {
    soundEngine.init();
    soundEngine.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(players, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `jvan_all_player_logins_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const handleExportPlayersCsv = () => {
    soundEngine.init();
    soundEngine.playClick();
    const headers = ["Player ID", "Alias", "Contact Type", "Contact Value", "First Login", "Last Active", "Runway Devil Stage", "Runway Devil Attempts", "RPG Floor", "RPG Swatches", "RPG Score", "Last Game Played"];
    const rows = players.map(p => [
      p.playerId,
      `"${(p.alias || '').replace(/"/g, '""')}"`,
      p.contactType,
      `"${(p.contactValue || '').replace(/"/g, '""')}"`,
      p.firstLoginAt,
      p.lastActiveAt,
      p.highestLevelDevil || 1,
      p.totalAttemptsDevil || 0,
      p.highestFloorRpg || 1,
      p.rpgSwatches || 0,
      p.highestScoreRpg || 0,
      p.lastGamePlayed || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jvan_all_player_logins_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  // Submissions management
  const handleDeleteSubmission = (subId) => {
    soundEngine.init();
    if (window.confirm(`Delete submission receipt ${subId}?`)) {
      soundEngine.playHazard();
      const updated = deleteContestSubmission(subId);
      setSubmissions(updated);
      try {
        window.dispatchEvent(new Event('jvan_contest_updated'));
      } catch (_) {}
      showToast(`✓ Deleted submission ${subId}`);
    }
  };

  const handleClearSubscribers = () => {
    if (window.confirm("Clear all email subscribers? This cannot be undone.")) {
      setSubscribers([]);
      localStorage.setItem('jvan_subscribers', JSON.stringify([]));
      showToast("Cleared email subscribers.");
    }
  };

  const handleCopyEmails = () => {
    if (subscribers.length === 0) return;
    navigator.clipboard.writeText(subscribers.join(', '));
    showToast(`✓ Copied ${subscribers.length} email addresses to clipboard!`);
  };

  const handleExportSubmissionsJson = () => {
    soundEngine.init();
    soundEngine.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(submissions, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `jvan_contest_submissions_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  // Password update handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pwdCurrent || !pwdNew) return;

    if (pwdNew !== pwdConfirm) {
      setPwdStatus("❌ New passcodes do not match.");
      return;
    }

    if (pwdNew.length < 6) {
      setPwdStatus("❌ New passcode must be at least 6 characters.");
      return;
    }

    setPwdStatus("⏳ Updating cryptographic hash...");
    const res = await updateMasterPasscode(pwdCurrent, pwdNew);
    if (res.success) {
      soundEngine.playLevelUp();
      setPwdStatus("✓ MASTER PASSCODE SUCCESSFULLY UPDATED!");
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setTimeout(() => setPwdStatus(''), 5000);
    } else {
      soundEngine.playHazard();
      setPwdStatus(`❌ ${res.message || "Failed to update passcode."}`);
    }
  };

  // Secret login method toggle with safety lockout guard
  const handleToggleLoginMethod = (methodKey, nextVal) => {
    soundEngine.init();
    if (!nextVal) {
      const current = {
        easterEggClick: formData.loginMethods?.easterEggClick !== false,
        keystrokeSequence: formData.loginMethods?.keystrokeSequence !== false,
        keyboardShortcut: formData.loginMethods?.keyboardShortcut !== false,
        urlHash: formData.loginMethods?.urlHash !== false,
      };
      const activeCount = Object.values(current).filter(Boolean).length;
      if (activeCount <= 1) {
        soundEngine.playHazard();
        alert("LOCKOUT PROTECTION: You cannot disable this method because at least one secret login method must remain active to access the Admin panel.");
        return;
      }
    }
    soundEngine.playClick();
    updateField(`loginMethods.${methodKey}`, nextVal);
  };

  return (
    <div className="admin-cms-overlay">
      <div className="admin-cms-container">
        {/* Top Header */}
        <header className="admin-cms-header">
          <div className="cms-brand-group">
            <span className="cms-badge">SECURE CMS</span>
            <h2 className="cms-title">JVāN HAUTE STOREFRONT CONTROL</h2>
            <span className="cms-status-indicator">● ENCRYPTED SESSION ACTIVE</span>
          </div>

          <div className="cms-header-actions">
            <button 
              className="cms-btn-reset" 
              onClick={handleReset} 
              onMouseEnter={() => soundEngine.playHover()}
              title="Restore original text"
            >
              ↺ RESET DEFAULTS
            </button>
            <button 
              className="cms-btn-save" 
              onClick={handleSave} 
              onMouseEnter={() => soundEngine.playHover()}
              title="Save changes to website"
            >
              💾 SAVE & APPLY
            </button>
            <button 
              className="cms-btn-exit" 
              onClick={onClose} 
              onMouseEnter={() => soundEngine.playHover()}
              title="Return to live site"
            >
              ✕ VIEW LIVE SITE
            </button>
            <button 
              className="cms-btn-logout" 
              onClick={handleLogoutClick} 
              onMouseEnter={() => soundEngine.playHover()}
              title="Terminate Admin Session"
            >
              🔒 LOGOUT
            </button>
          </div>
        </header>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="cms-toast-alert" role="status">
            {toastMessage}
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="cms-tabs-bar">
          <button 
            className={`cms-tab-btn ${activeTab === 'copy' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('copy'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            📢 COPY & HEADLINES
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('telemetry'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            ⚡ TELEMETRY DIAGNOSTICS
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'contest' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('contest'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            🏆 CONTEST & PRIZES
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('game'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            🕹️ GAME LAUNCHER
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'all_logins' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('all_logins'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            👥 ALL LOGINS ({players.length})
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'contest_submissions' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('contest_submissions'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            📁 SUBMISSIONS & DETAILS ({submissions.length})
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('contact'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            🌐 CONTACT & SOCIALS
          </button>
          <button 
            className={`cms-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('security'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            🔒 SECURITY & PASSCODE
          </button>
        </nav>

        {/* CMS Body Content */}
        <div className="cms-scroll-content">
          {/* TAB 1: COPY & HEADLINES */}
          {activeTab === 'copy' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <h3 className="cms-section-heading">BRAND IDENTITY</h3>
                <div className="cms-grid-2">
                  <div className="cms-form-field">
                    <label>BRAND WORDMARK NAME</label>
                    <input 
                      type="text" 
                      value={formData.brandName} 
                      onChange={(e) => updateField('brandName', e.target.value)} 
                    />
                    <small>Accented spelling (e.g. JVāN with macron)</small>
                  </div>

                  <div className="cms-form-field">
                    <label>BRAND SUBTITLE</label>
                    <input 
                      type="text" 
                      value={formData.brandSubtext} 
                      onChange={(e) => updateField('brandSubtext', e.target.value)} 
                    />
                    <small>Header tagline (e.g. LUXURY STREETWEAR // EST. 2024)</small>
                  </div>
                </div>
              </div>

              <div className="cms-section-card">
                <h3 className="cms-section-heading">HERO & UNDER MAINTENANCE NOTICE</h3>
                <div className="cms-form-field">
                  <label>OFFICIAL STATUS BADGE (TOP RIGHT & HERO)</label>
                  <input 
                    type="text" 
                    value={formData.maintenance.statusBadge} 
                    onChange={(e) => updateField('maintenance.statusBadge', e.target.value)} 
                  />
                </div>

                <div className="cms-form-field">
                  <label>MAIN HERO HEADLINE</label>
                  <input 
                    type="text" 
                    value={formData.maintenance.headline} 
                    onChange={(e) => updateField('maintenance.headline', e.target.value)} 
                  />
                  <small>Primary focal announcement (e.g. JVāN IS CURRENTLY UNDER MAINTENANCE)</small>
                </div>

                <div className="cms-form-field">
                  <label>SUBHEADLINE</label>
                  <input 
                    type="text" 
                    value={formData.maintenance.subheadline} 
                    onChange={(e) => updateField('maintenance.subheadline', e.target.value)} 
                  />
                  <small>Monospace technical sub-banner text</small>
                </div>

                <div className="cms-form-field">
                  <label>MAINTENANCE ANNOUNCEMENT DESCRIPTION</label>
                  <textarea 
                    rows={4}
                    value={formData.maintenance.description} 
                    onChange={(e) => updateField('maintenance.description', e.target.value)} 
                  />
                  <small>Detailed message explaining why Shopify is paused and upcoming relaunch plans</small>
                </div>
              </div>

              <div className="cms-section-card">
                <div className="cms-card-header-row">
                  <h3 className="cms-section-heading">TECHNICAL TICKER RIBBON MESSAGES</h3>
                  <button className="cms-btn-action" onClick={handleAddTicker}>+ ADD TICKER ITEM</button>
                </div>

                <div className="cms-ticker-list">
                  {(formData.tickerItems || []).map((item, idx) => (
                    <div key={idx} className="cms-ticker-row">
                      <span className="ticker-index">#{idx + 1}</span>
                      <input 
                        type="text" 
                        value={item} 
                        onChange={(e) => {
                          const updated = [...formData.tickerItems];
                          updated[idx] = e.target.value;
                          setFormData(prev => ({ ...prev, tickerItems: updated }));
                        }}
                      />
                      <button 
                        className="ticker-delete-btn" 
                        onClick={() => handleRemoveTicker(idx)}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TELEMETRY DIAGNOSTICS */}
          {activeTab === 'telemetry' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <h3 className="cms-section-heading">SYSTEM TELEMETRY DIAGNOSTICS (4 CARDS)</h3>
                <p className="cms-section-desc">
                  These 4 status metrics appear in the diagnostic grid on the maintenance hero page.
                </p>

                <div className="cms-grid-2">
                  {(formData.maintenance.telemetry || []).map((item, idx) => (
                    <div key={idx} className="cms-telemetry-edit-card">
                      <div className="telemetry-card-idx">DIAGNOSTIC CARD #{idx + 1}</div>
                      
                      <div className="cms-form-field">
                        <label>METRIC LABEL</label>
                        <input 
                          type="text" 
                          value={item.label}
                          onChange={(e) => {
                            const updated = [...formData.maintenance.telemetry];
                            updated[idx].label = e.target.value;
                            updateField('maintenance.telemetry', updated);
                          }}
                        />
                      </div>

                      <div className="cms-form-field">
                        <label>VALUE / STATUS TEXT</label>
                        <input 
                          type="text" 
                          value={item.val}
                          onChange={(e) => {
                            const updated = [...formData.maintenance.telemetry];
                            updated[idx].val = e.target.value;
                            updateField('maintenance.telemetry', updated);
                          }}
                        />
                      </div>

                      <div className="cms-form-field">
                        <label>STATUS COLOR CODING</label>
                        <select 
                          value={item.status}
                          onChange={(e) => {
                            const updated = [...formData.maintenance.telemetry];
                            updated[idx].status = e.target.value;
                            updateField('maintenance.telemetry', updated);
                          }}
                        >
                          <option value="ok">Cyan / Normal (✓ OK)</option>
                          <option value="active">Electric Volt / Active (⚡ ACTIVE)</option>
                          <option value="warning">Orange / Amber (⚠ WARNING / PAUSED)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTEST & PRIZES */}
          {activeTab === 'contest' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <div className="cms-card-header-row">
                  <h3 className="cms-section-heading">COMMUNITY DESIGN CONTEST</h3>
                  <label className="cms-toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={formData.contest.enabled !== false}
                      onChange={(e) => updateField('contest.enabled', e.target.checked)}
                    />
                    <span>CONTEST SECTION VISIBLE</span>
                  </label>
                </div>

                <div className="cms-form-field">
                  <label>CONTEST SECTION TITLE</label>
                  <input 
                    type="text" 
                    value={formData.contest.title} 
                    onChange={(e) => updateField('contest.title', e.target.value)} 
                  />
                </div>

                <div className="cms-form-field">
                  <label>CONTEST DESCRIPTION / LEAD</label>
                  <textarea 
                    rows={3}
                    value={formData.contest.description} 
                    onChange={(e) => updateField('contest.description', e.target.value)} 
                  />
                </div>
              </div>

              <div className="cms-section-card">
                <h3 className="cms-section-heading">CONTEST PRIZE TIERS</h3>

                <div className="cms-grid-2">
                  {(formData.contest.prizes || []).map((prize, idx) => (
                    <div key={idx} className="cms-prize-edit-card">
                      <div className="prize-tier-badge">PRIZE TIER #{idx + 1}</div>

                      <div className="cms-form-field">
                        <label>RANK BADGE LABEL</label>
                        <input 
                          type="text" 
                          value={prize.rank}
                          onChange={(e) => {
                            const updated = [...formData.contest.prizes];
                            updated[idx].rank = e.target.value;
                            updateField('contest.prizes', updated);
                          }}
                        />
                      </div>

                      <div className="cms-form-field">
                        <label>HIGHLIGHT TITLE</label>
                        <input 
                          type="text" 
                          value={prize.highlight}
                          onChange={(e) => {
                            const updated = [...formData.contest.prizes];
                            updated[idx].highlight = e.target.value;
                            updateField('contest.prizes', updated);
                          }}
                        />
                      </div>

                      <div className="cms-form-field">
                        <label>FULL PRIZE DETAILS</label>
                        <textarea 
                          rows={3}
                          value={prize.details}
                          onChange={(e) => {
                            const updated = [...formData.contest.prizes];
                            updated[idx].details = e.target.value;
                            updateField('contest.prizes', updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARCADE GAMES LAUNCHER */}
          {activeTab === 'game' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <h3 className="cms-section-heading">GAME 01: ATELIER ARCHIVE (PIXEL RPG)</h3>
                <p className="cms-section-desc">
                  Customize the button label, subtext, and HUD title for the Detective Atelier Archive RPG.
                </p>

                <div className="cms-form-field">
                  <label>BUTTON MAIN HEADLINE</label>
                  <input 
                    type="text" 
                    value={formData.game?.buttonLabel || ''} 
                    onChange={(e) => updateField('game.buttonLabel', e.target.value)} 
                  />
                  <small>Example: EXPLORE THE ATELIER ARCHIVE // FULL-SCREEN PIXEL RPG</small>
                </div>

                <div className="cms-form-field">
                  <label>BUTTON SUBTITLE / TAGS</label>
                  <input 
                    type="text" 
                    value={formData.game?.buttonSubtext || ''} 
                    onChange={(e) => updateField('game.buttonSubtext', e.target.value)} 
                  />
                  <small>Example: COLLECT BESPOKE TEXTILES & SKETCHES • SPRAWLING RUNWAY VAULT • INFINITE LEVELS</small>
                </div>

                <div className="cms-form-field">
                  <label>GAME BRAND TITLE (INSIDE HUD)</label>
                  <input 
                    type="text" 
                    value={formData.game?.title || ''} 
                    onChange={(e) => updateField('game.title', e.target.value)} 
                  />
                </div>
              </div>

              <div className="cms-section-card" style={{ marginTop: '1.5rem' }}>
                <h3 className="cms-section-heading">GAME 02: RUNWAY DEVIL (TROLL PLATFORMER)</h3>
                <p className="cms-section-desc">
                  Customize the button label, subtext, and HUD title for the Level Devil-inspired precision platformer.
                </p>

                <div className="cms-form-field">
                  <label>BUTTON MAIN HEADLINE</label>
                  <input 
                    type="text" 
                    value={formData.runwayDevil?.buttonLabel || ''} 
                    onChange={(e) => {
                      if (!formData.runwayDevil) updateField('runwayDevil', {});
                      updateField('runwayDevil.buttonLabel', e.target.value);
                    }} 
                  />
                  <small>Example: PLAY RUNWAY DEVIL // TROLL PRECISION PLATFORMER</small>
                </div>

                <div className="cms-form-field">
                  <label>BUTTON SUBTITLE / TAGS</label>
                  <input 
                    type="text" 
                    value={formData.runwayDevil?.buttonSubtext || ''} 
                    onChange={(e) => {
                      if (!formData.runwayDevil) updateField('runwayDevil', {});
                      updateField('runwayDevil.buttonSubtext', e.target.value);
                    }} 
                  />
                  <small>Example: INFINITE DECEPTIVE LEVELS • SHIFTING FLOORS & TRICKS • NEVER IMPOSSIBLE</small>
                </div>

                <div className="cms-form-field">
                  <label>GAME BRAND TITLE (INSIDE HUD)</label>
                  <input 
                    type="text" 
                    value={formData.runwayDevil?.title || ''} 
                    onChange={(e) => {
                      if (!formData.runwayDevil) updateField('runwayDevil', {});
                      updateField('runwayDevil.title', e.target.value);
                    }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALL LOGINS */}
          {activeTab === 'all_logins' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <div className="cms-card-header-row">
                  <div>
                    <h3 className="cms-section-heading">ALL REGISTERED PLAYER LOGINS & GAME PROGRESS ({players.length})</h3>
                    <p className="cms-section-desc">
                      Every authenticated player across Runway Devil and Couture RPG. Game progress, highest stages, and contact credentials are saved persistently.
                    </p>
                  </div>
                  <div className="cms-inline-actions">
                    {players.length > 0 && (
                      <>
                        <button className="cms-btn-action" onClick={handleExportPlayersJson} title="Download JSON records">
                          📥 EXPORT JSON
                        </button>
                        <button className="cms-btn-action" onClick={handleExportPlayersCsv} title="Download CSV spreadsheet">
                          📊 EXPORT CSV
                        </button>
                        <button className="cms-btn-danger" onClick={handleClearAllPlayers} title="Clear all accounts">
                          🗑 CLEAR ALL
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* KPI Metrics Summary Bar */}
                <div className="cms-kpi-metrics-grid">
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">TOTAL REGISTERED PLAYERS</span>
                    <span className="cms-kpi-value volt">{players.length}</span>
                    <span className="cms-kpi-sub">Across all arcade titles</span>
                  </div>
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">RUNWAY DEVIL PLAYERS</span>
                    <span className="cms-kpi-value">{players.filter(p => (p.highestLevelDevil || 0) > 0 || (p.totalAttemptsDevil || 0) > 0).length}</span>
                    <span className="cms-kpi-sub">Stage records saved</span>
                  </div>
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">COUTURE RPG DETECTIVES</span>
                    <span className="cms-kpi-value">{players.filter(p => (p.highestFloorRpg || 0) > 0 || (p.highestScoreRpg || 0) > 0).length}</span>
                    <span className="cms-kpi-sub">Floor & Swatch records</span>
                  </div>
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">ACTIVE WITHIN 24H</span>
                    <span className="cms-kpi-value highlight">{players.filter(p => p.lastActiveAt && (Date.now() - new Date(p.lastActiveAt).getTime() < 86400000)).length}</span>
                    <span className="cms-kpi-sub">Recent arcade sessions</span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="cms-filter-bar">
                  <div className="cms-search-input-wrap">
                    <span className="search-icon">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search by player handle, Instagram or email..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="cms-search-input"
                    />
                    {playerSearch && (
                      <button className="clear-search-btn" onClick={() => setPlayerSearch('')}>✕</button>
                    )}
                  </div>
                  <span className="cms-filter-count">
                    Showing {players.filter(p => {
                      if (!playerSearch.trim()) return true;
                      const term = playerSearch.toLowerCase();
                      return (
                        (p.alias && p.alias.toLowerCase().includes(term)) ||
                        (p.contactValue && p.contactValue.toLowerCase().includes(term)) ||
                        (p.playerId && p.playerId.toLowerCase().includes(term))
                      );
                    }).length} of {players.length} accounts
                  </span>
                </div>

                {/* Players Table */}
                {players.length === 0 ? (
                  <div className="cms-empty-state">
                    <span>No player accounts registered yet. Players who authenticate on the storefront to play either game will appear here with live progress tracking.</span>
                  </div>
                ) : (
                  <div className="cms-submissions-table-wrap">
                    <table className="cms-table">
                      <thead>
                        <tr>
                          <th>PLAYER ID</th>
                          <th>ALIAS / HANDLE</th>
                          <th>CONTACT CREDENTIALS</th>
                          <th>RUNWAY DEVIL</th>
                          <th>COUTURE RPG</th>
                          <th>ACTIVITY LOG</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players
                          .filter(p => {
                            if (!playerSearch.trim()) return true;
                            const term = playerSearch.toLowerCase();
                            return (
                              (p.alias && p.alias.toLowerCase().includes(term)) ||
                              (p.contactValue && p.contactValue.toLowerCase().includes(term)) ||
                              (p.playerId && p.playerId.toLowerCase().includes(term))
                            );
                          })
                          .map((plr) => (
                            <tr key={plr.playerId}>
                              <td className="mono volt">{plr.playerId}</td>
                              <td>
                                <strong className="player-alias-title">{plr.alias}</strong>
                                <div className="game-badge-chips">
                                  {plr.lastGamePlayed === 'runway_devil' ? (
                                    <span className="game-chip devil">😈 DEVIL</span>
                                  ) : plr.lastGamePlayed === 'rpg' ? (
                                    <span className="game-chip rpg">🕹️ RPG</span>
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <div className="contact-cred-cell">
                                  <span className={`contact-badge ${plr.contactType}`}>
                                    {plr.contactType === 'instagram' ? 'IG' : 'MAIL'}
                                  </span>
                                  <span className="mono contact-val">{plr.contactValue}</span>
                                </div>
                              </td>
                              <td>
                                <div className="game-stat-metric">
                                  <span className="stat-main">STAGE #{plr.highestLevelDevil || 1}</span>
                                  <span className="stat-sub muted mono">{plr.totalAttemptsDevil || 0} attempts</span>
                                </div>
                              </td>
                              <td>
                                <div className="game-stat-metric">
                                  <span className="stat-main">FLOOR #{plr.highestFloorRpg || 1} • {plr.rpgSwatches || 0} SW</span>
                                  <span className="stat-sub volt mono">{(plr.highestScoreRpg || 0).toLocaleString()} PTS</span>
                                </div>
                              </td>
                              <td>
                                <div className="activity-dates-cell mono">
                                  <span title={plr.lastActiveAt}>Active: {new Date(plr.lastActiveAt).toLocaleDateString()}</span>
                                  <small className="muted" title={plr.firstLoginAt}>Joined: {new Date(plr.firstLoginAt).toLocaleDateString()}</small>
                                </div>
                              </td>
                              <td>
                                <button 
                                  className="cms-btn-mini delete"
                                  onClick={() => handleDeletePlayer(plr.playerId)}
                                  title="Delete player account"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SUBMISSION LOGINS AND THEIR DETAILS */}
          {activeTab === 'contest_submissions' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <div className="cms-card-header-row">
                  <div>
                    <h3 className="cms-section-heading">DESIGN CONTEST SUBMISSION LOGINS & DETAILS ({submissions.length})</h3>
                    <p className="cms-section-desc">
                      Review verified design contest logins, creator contact details, and uploaded transparent PNG garment artwork.
                    </p>
                  </div>
                  {submissions.length > 0 && (
                    <button className="cms-btn-action" onClick={handleExportSubmissionsJson}>
                      📥 EXPORT ALL (JSON)
                    </button>
                  )}
                </div>

                {/* KPI Metrics Summary Bar */}
                <div className="cms-kpi-metrics-grid">
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">TOTAL SUBMISSIONS</span>
                    <span className="cms-kpi-value volt">{submissions.length}</span>
                    <span className="cms-kpi-sub">Public live counter: {submissions.length}</span>
                  </div>
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">VERIFIED CREATORS</span>
                    <span className="cms-kpi-value highlight">{submissions.filter(s => s.isVerified).length}</span>
                    <span className="cms-kpi-sub">100% verified credentials</span>
                  </div>
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">INSTAGRAM LOGINS</span>
                    <span className="cms-kpi-value">{submissions.filter(s => s.contactType === 'instagram' || s.instagram).length}</span>
                    <span className="cms-kpi-sub">Direct social contact</span>
                  </div>
                  <div className="cms-kpi-card">
                    <span className="cms-kpi-title">EMAIL LOGINS</span>
                    <span className="cms-kpi-value">{submissions.filter(s => s.contactType === 'email' || s.email).length}</span>
                    <span className="cms-kpi-sub">Verified email inbox</span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="cms-filter-bar">
                  <div className="cms-search-input-wrap">
                    <span className="search-icon">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search by receipt ID, contact handle, or file name..."
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      className="cms-search-input"
                    />
                    {submissionSearch && (
                      <button className="clear-search-btn" onClick={() => setSubmissionSearch('')}>✕</button>
                    )}
                  </div>
                  <span className="cms-filter-count">
                    Showing {submissions.filter(s => {
                      if (!submissionSearch.trim()) return true;
                      const term = submissionSearch.toLowerCase();
                      return (
                        (s.submissionId && s.submissionId.toLowerCase().includes(term)) ||
                        (s.contactValue && s.contactValue.toLowerCase().includes(term)) ||
                        (s.email && s.email.toLowerCase().includes(term)) ||
                        (s.instagram && s.instagram.toLowerCase().includes(term)) ||
                        (s.files && s.files.some(f => f.name.toLowerCase().includes(term)))
                      );
                    }).length} of {submissions.length} submissions
                  </span>
                </div>

                {submissions.length === 0 ? (
                  <div className="cms-empty-state">
                    <span>No design submissions recorded yet. Submissions made via the "Submit Design" modal will appear here with full creator credentials and artwork files.</span>
                  </div>
                ) : (
                  <div className="cms-submissions-table-wrap">
                    <table className="cms-table">
                      <thead>
                        <tr>
                          <th>RECEIPT ID</th>
                          <th>ARTWORK PREVIEW</th>
                          <th>SUBMISSION LOGIN & CONTACT</th>
                          <th>GARMENT SILHOUETTES</th>
                          <th>ATELIER FILES</th>
                          <th>TIMESTAMP</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions
                          .filter(s => {
                            if (!submissionSearch.trim()) return true;
                            const term = submissionSearch.toLowerCase();
                            return (
                              (s.submissionId && s.submissionId.toLowerCase().includes(term)) ||
                              (s.contactValue && s.contactValue.toLowerCase().includes(term)) ||
                              (s.email && s.email.toLowerCase().includes(term)) ||
                              (s.instagram && s.instagram.toLowerCase().includes(term)) ||
                              (s.files && s.files.some(f => f.name.toLowerCase().includes(term)))
                            );
                          })
                          .map((sub, idx) => (
                            <tr key={sub.submissionId || idx}>
                              <td className="mono volt">{sub.submissionId}</td>
                              <td>
                                {sub.previewImage ? (
                                  <div 
                                    className="artwork-thumb-container"
                                    onClick={() => setSelectedSubmission(sub)}
                                    title="Click to view full artwork lightbox"
                                  >
                                    <img 
                                      src={sub.previewImage} 
                                      alt="Artwork" 
                                      className="cms-table-thumb"
                                    />
                                    <span className="thumb-zoom-icon">🔍</span>
                                  </div>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                              <td>
                                <div className="sub-login-detail-cell">
                                  <span className="sub-contact-value">
                                    {sub.contactValue || sub.email || sub.instagram || 'Anonymous Creator'}
                                  </span>
                                  <div className="sub-badges-row">
                                    <span className={`sub-channel-pill ${sub.contactType || (sub.email ? 'email' : 'instagram')}`}>
                                      {sub.contactType === 'email' || sub.email ? 'EMAIL' : 'INSTAGRAM'}
                                    </span>
                                    {sub.isVerified && (
                                      <span className="sub-verified-pill">VERIFIED ✓</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="garment-spec-cell">
                                  <span className="garment-main-title">{sub.mockupType || "320GSM Tee & 460GSM Hoodie"}</span>
                                  <small className="muted mono">Transparent PNG</small>
                                </div>
                              </td>
                              <td>
                                <div className="sub-files-list mono">
                                  {sub.files && sub.files.length > 0 ? (
                                    sub.files.map((f, fIdx) => (
                                      <span key={fIdx} className="file-chip" title={`${f.name} (${f.dimensions || 'PNG'})`}>
                                        📄 {f.name} {f.dimensions ? `[${f.dimensions}]` : ''}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="file-chip">📄 Transparent Graphic</span>
                                  )}
                                </div>
                              </td>
                              <td className="mono muted">
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Recent'}
                              </td>
                              <td>
                                <div className="cms-table-action-btns">
                                  {sub.previewImage && (
                                    <button 
                                      className="cms-btn-mini view"
                                      onClick={() => setSelectedSubmission(sub)}
                                      title="Inspect artwork preview"
                                    >
                                      👁
                                    </button>
                                  )}
                                  <button 
                                    className="cms-btn-mini delete"
                                    onClick={() => handleDeleteSubmission(sub.submissionId)}
                                    title="Delete submission"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* VIP Subscribers Section */}
              <div className="cms-section-card">
                <div className="cms-card-header-row">
                  <div>
                    <h3 className="cms-section-heading">VIP DROP SUBSCRIBERS ({subscribers.length})</h3>
                    <p className="cms-section-desc">Emails collected from visitors waiting for the storefront to reopen.</p>
                  </div>
                  {subscribers.length > 0 && (
                    <div className="cms-inline-actions">
                      <button className="cms-btn-action" onClick={handleCopyEmails}>
                        📋 COPY ALL EMAILS
                      </button>
                      <button className="cms-btn-danger" onClick={handleClearSubscribers}>
                        🗑 CLEAR
                      </button>
                    </div>
                  )}
                </div>

                {subscribers.length === 0 ? (
                  <div className="cms-empty-state">
                    <span>No email subscribers collected yet. Users who sign up on the page will appear here.</span>
                  </div>
                ) : (
                  <div className="cms-subscriber-chips">
                    {subscribers.map((email, idx) => (
                      <span key={idx} className="cms-email-chip">
                        {email}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CONTACT & SOCIALS */}
          {activeTab === 'contact' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <h3 className="cms-section-heading">CUSTOMER CONCIERGE</h3>
                
                <div className="cms-form-field">
                  <label>CONCIERGE INQUIRIES EMAIL</label>
                  <input 
                    type="email" 
                    value={formData.conciergeEmail} 
                    onChange={(e) => updateField('conciergeEmail', e.target.value)} 
                  />
                </div>

                <div className="cms-form-field">
                  <label>FOOTER COPYRIGHT NOTICE</label>
                  <input 
                    type="text" 
                    value={formData.copyright} 
                    onChange={(e) => updateField('copyright', e.target.value)} 
                  />
                </div>
              </div>

              <div className="cms-section-card" style={{ marginTop: '1.5rem' }}>
                <div className="cms-card-header-row">
                  <div>
                    <h3 className="cms-section-heading">FOOTER SOCIAL MEDIA CHANNELS</h3>
                    <p className="cms-section-desc">
                      Toggle visibility for individual social platforms without losing configured destination URLs.
                    </p>
                  </div>
                  <label className="cms-toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={formData.socials?.masterEnabled !== false}
                      onChange={(e) => {
                        soundEngine.playClick();
                        updateField('socials.masterEnabled', e.target.checked);
                      }}
                    />
                    <span>ALL SOCIAL LINKS VISIBLE</span>
                  </label>
                </div>

                <div className="cms-socials-grid">
                  {[
                    { key: 'instagram', label: 'INSTAGRAM', domain: 'instagram.com', icon: '📸' },
                    { key: 'tiktok', label: 'TIKTOK', domain: 'tiktok.com', icon: '🎵' },
                    { key: 'discord', label: 'DISCORD', domain: 'discord.gg', icon: '💬' },
                    { key: 'twitter', label: 'X (TWITTER)', domain: 'x.com', icon: '𝕏' }
                  ].map((channel) => {
                    const isPlatformEnabled = formData.socials?.enabled?.[channel.key] !== false;
                    const isFullyVisible = isPlatformEnabled && formData.socials?.masterEnabled !== false;

                    return (
                      <div 
                        key={channel.key} 
                        className={`cms-social-card ${isPlatformEnabled ? 'active' : 'muted'}`}
                      >
                        <div className="cms-social-card-top">
                          <div className="cms-social-title-group">
                            <span className="cms-social-icon">{channel.icon}</span>
                            <span className="cms-social-name">{channel.label}</span>
                            <span className={`cms-status-pill-mini ${isFullyVisible ? 'active' : 'muted'}`}>
                              {isFullyVisible ? '● VISIBLE' : isPlatformEnabled ? '○ MASTER OFF' : '○ MUTED'}
                            </span>
                          </div>
                          <label className="cms-toggle-switch">
                            <input 
                              type="checkbox"
                              checked={isPlatformEnabled}
                              onChange={(e) => {
                                soundEngine.playClick();
                                updateField(`socials.enabled.${channel.key}`, e.target.checked);
                              }}
                            />
                            <span>{isPlatformEnabled ? 'ENABLED' : 'DISABLED'}</span>
                          </label>
                        </div>

                        <div className="cms-form-field" style={{ marginTop: '0.75rem' }}>
                          <label>{channel.label} PROFILE URL</label>
                          <input 
                            type="text" 
                            value={formData.socials?.[channel.key] || ''} 
                            onChange={(e) => updateField(`socials.${channel.key}`, e.target.value)} 
                            placeholder={`https://${channel.domain}/handle`}
                            disabled={!isPlatformEnabled}
                            style={{ opacity: isPlatformEnabled ? 1 : 0.45 }}
                          />
                          <small>
                            {isPlatformEnabled 
                              ? (isFullyVisible ? `Live in public footer.` : `Platform enabled, but master toggle is OFF.`)
                              : `Hidden from footer (URL safely saved).`}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY & PASSCODE */}
          {activeTab === 'security' && (
            <div className="cms-tab-panel">
              <div className="cms-section-card">
                <h3 className="cms-section-heading">ADMIN PASSCODE & ENCRYPTION</h3>
                <p className="cms-section-desc">
                  Update the master authorization passcode used to log into this Admin CMS. Passcodes are hashed with SHA-256.
                </p>

                <form onSubmit={handlePasswordSubmit} className="cms-grid-2">
                  <div className="cms-form-field">
                    <label>CURRENT MASTER PASSCODE</label>
                    <input 
                      type="password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      placeholder="Enter current passcode"
                      required
                    />
                  </div>

                  <div className="cms-form-field">
                    <label>NEW PASSCODE (MIN 6 CHARS)</label>
                    <input 
                      type="password"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      placeholder="Enter new master passcode"
                      required
                    />
                  </div>

                  <div className="cms-form-field">
                    <label>CONFIRM NEW PASSCODE</label>
                    <input 
                      type="password"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      placeholder="Confirm new passcode"
                      required
                    />
                  </div>

                  <div className="cms-form-field" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="cms-btn-action" style={{ padding: '0.85rem 1.5rem' }}>
                      🔐 UPDATE MASTER PASSCODE
                    </button>
                  </div>
                </form>

                {pwdStatus && (
                  <div className="cms-toast-alert" style={{ marginTop: '0.5rem' }}>
                    {pwdStatus}
                  </div>
                )}
              </div>

              <div className="cms-section-card">
                <div className="cms-card-header-row">
                  <div>
                    <h3 className="cms-section-heading">SECRETIVE LOGIN METHODS (CONFIDENTIAL)</h3>
                    <p className="cms-section-desc">
                      Public admin buttons are completely hidden from visitors. Toggle individual trigger mechanisms below.
                    </p>
                  </div>
                  <div className="cms-active-counter-badge">
                    {[
                      formData.loginMethods?.easterEggClick !== false,
                      formData.loginMethods?.keystrokeSequence !== false,
                      formData.loginMethods?.keyboardShortcut !== false,
                      formData.loginMethods?.urlHash !== false
                    ].filter(Boolean).length} OF 4 ACTIVE
                  </div>
                </div>

                <div className="cms-security-methods-list">
                  {/* Method 1: Easter Egg Click */}
                  <div className={`cms-sec-item ${formData.loginMethods?.easterEggClick !== false ? 'method-active' : 'method-disabled'}`}>
                    <div className="cms-method-top">
                      <div className="cms-method-meta">
                        <span className="mono volt">METHOD 01</span>
                        <strong>EASTER EGG CLICK TRIGGER</strong>
                        <span className={`cms-status-pill-mini ${formData.loginMethods?.easterEggClick !== false ? 'active' : 'muted'}`}>
                          {formData.loginMethods?.easterEggClick !== false ? '● ACTIVE' : '○ DISABLED'}
                        </span>
                      </div>
                      <label className="cms-toggle-switch">
                        <input 
                          type="checkbox"
                          checked={formData.loginMethods?.easterEggClick !== false}
                          onChange={(e) => handleToggleLoginMethod('easterEggClick', e.target.checked)}
                        />
                        <span>{formData.loginMethods?.easterEggClick !== false ? 'ENABLED' : 'DISABLED'}</span>
                      </label>
                    </div>
                    <p>Triple-click the accent letter <strong>ā</strong> in the <strong>JVāN</strong> header wordmark (or double-click the pulsing status dot).</p>
                  </div>

                  {/* Method 2: Stealth Keystroke Sequence */}
                  <div className={`cms-sec-item ${formData.loginMethods?.keystrokeSequence !== false ? 'method-active' : 'method-disabled'}`}>
                    <div className="cms-method-top">
                      <div className="cms-method-meta">
                        <span className="mono volt">METHOD 02</span>
                        <strong>STEALTH KEYSTROKE SEQUENCE</strong>
                        <span className={`cms-status-pill-mini ${formData.loginMethods?.keystrokeSequence !== false ? 'active' : 'muted'}`}>
                          {formData.loginMethods?.keystrokeSequence !== false ? '● ACTIVE' : '○ DISABLED'}
                        </span>
                      </div>
                      <label className="cms-toggle-switch">
                        <input 
                          type="checkbox"
                          checked={formData.loginMethods?.keystrokeSequence !== false}
                          onChange={(e) => handleToggleLoginMethod('keystrokeSequence', e.target.checked)}
                        />
                        <span>{formData.loginMethods?.keystrokeSequence !== false ? 'ENABLED' : 'DISABLED'}</span>
                      </label>
                    </div>
                    <p>Type <strong>jvan</strong> or <strong>vault</strong> on your keyboard anywhere on the page (tactile tumbler audio triggers on valid characters).</p>
                  </div>

                  {/* Method 3: Secret Keyboard Shortcut */}
                  <div className={`cms-sec-item ${formData.loginMethods?.keyboardShortcut !== false ? 'method-active' : 'method-disabled'}`}>
                    <div className="cms-method-top">
                      <div className="cms-method-meta">
                        <span className="mono volt">METHOD 03</span>
                        <strong>SECRET KEYBOARD SHORTCUT</strong>
                        <span className={`cms-status-pill-mini ${formData.loginMethods?.keyboardShortcut !== false ? 'active' : 'muted'}`}>
                          {formData.loginMethods?.keyboardShortcut !== false ? '● ACTIVE' : '○ DISABLED'}
                        </span>
                      </div>
                      <label className="cms-toggle-switch">
                        <input 
                          type="checkbox"
                          checked={formData.loginMethods?.keyboardShortcut !== false}
                          onChange={(e) => handleToggleLoginMethod('keyboardShortcut', e.target.checked)}
                        />
                        <span>{formData.loginMethods?.keyboardShortcut !== false ? 'ENABLED' : 'DISABLED'}</span>
                      </label>
                    </div>
                    <p>Press <strong>Cmd + Option + J</strong> (macOS) or <strong>Ctrl + Alt + J</strong> (Windows) at any time.</p>
                  </div>

                  {/* Method 4: Secret URL Hash */}
                  <div className={`cms-sec-item ${formData.loginMethods?.urlHash !== false ? 'method-active' : 'method-disabled'}`}>
                    <div className="cms-method-top">
                      <div className="cms-method-meta">
                        <span className="mono volt">METHOD 04</span>
                        <strong>SECRET URL PARAMETER / HASH</strong>
                        <span className={`cms-status-pill-mini ${formData.loginMethods?.urlHash !== false ? 'active' : 'muted'}`}>
                          {formData.loginMethods?.urlHash !== false ? '● ACTIVE' : '○ DISABLED'}
                        </span>
                      </div>
                      <label className="cms-toggle-switch">
                        <input 
                          type="checkbox"
                          checked={formData.loginMethods?.urlHash !== false}
                          onChange={(e) => handleToggleLoginMethod('urlHash', e.target.checked)}
                        />
                        <span>{formData.loginMethods?.urlHash !== false ? 'ENABLED' : 'DISABLED'}</span>
                      </label>
                    </div>
                    <p>Append <code>#vault</code> or <code>?access=vault</code> to the URL (e.g. <code>yoursite.com/#vault</code>).</p>
                  </div>
                </div>

                <div className="cms-sec-warning-box">
                  <span className="sec-warn-icon">🛡️</span>
                  <span>
                    <strong>LOCKOUT PROTECTION ACTIVE:</strong> At least 1 secret login method must remain enabled at all times to prevent administrative lockout.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Artwork Lightbox with Detailed Submitter Information */}
        {selectedSubmission && (
          <div className="cms-lightbox-backdrop" onClick={() => setSelectedSubmission(null)} role="dialog" aria-modal="true">
            <div className="cms-lightbox-card" onClick={e => e.stopPropagation()}>
              <div className="cms-lightbox-header">
                <div className="cms-lightbox-title-wrap">
                  <span className="volt mono">{selectedSubmission.submissionId}</span>
                  <strong>{selectedSubmission.contactValue || selectedSubmission.designerName || 'Contest Artwork Preview'}</strong>
                  {selectedSubmission.isVerified && (
                    <span className="sub-verified-pill-inline">VERIFIED ✓</span>
                  )}
                </div>
                <button 
                  className="cms-lightbox-close" 
                  onClick={() => setSelectedSubmission(null)}
                  title="Close Preview [ESC]"
                >
                  ✕
                </button>
              </div>

              <div className="cms-lightbox-body">
                <div className="cms-lightbox-canvas-area">
                  <img 
                    src={selectedSubmission.previewImage} 
                    alt="Full contest submission artwork" 
                    className="cms-lightbox-img" 
                  />
                </div>
              </div>

              <div className="cms-lightbox-footer">
                <div className="lightbox-meta-grid">
                  <div className="meta-col">
                    <span className="meta-lbl">SUBMITTER CONTACT:</span>
                    <strong className="mono volt">{selectedSubmission.contactValue || selectedSubmission.email || selectedSubmission.instagram || 'Anonymous'}</strong>
                  </div>
                  <div className="meta-col">
                    <span className="meta-lbl">CHANNEL:</span>
                    <span className="mono uppercase">{selectedSubmission.contactType || (selectedSubmission.email ? 'Email' : 'Instagram')}</span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-lbl">FILES ATTACHED:</span>
                    <span className="mono">{selectedSubmission.files ? `${selectedSubmission.files.length} Transparent PNG(s)` : '1 Graphic'}</span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-lbl">SUBMITTED ON:</span>
                    <span className="mono">{selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Recent'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
