import React, { useState, useEffect } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { getLeaderboard, getActivePlayer } from '../utils/playerStorage';

export const LeaderboardModal = ({ isOpen, initialGame = 'runway_devil', onLaunchGame, onClose }) => {
  const [activeTab, setActiveTab] = useState(initialGame); // 'runway_devil' | 'rpg'
  const [devilBoard, setDevilBoard] = useState([]);
  const [rpgBoard, setRpgBoard] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    soundEngine.init();
    setActivePlayer(getActivePlayer());
    setDevilBoard(getLeaderboard('runway_devil'));
    setRpgBoard(getLeaderboard('rpg'));
    if (initialGame) setActiveTab(initialGame);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        soundEngine.playModalClose();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initialGame, onClose]);

  if (!isOpen) return null;

  const currentBoard = activeTab === 'runway_devil' ? devilBoard : rpgBoard;

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="leaderboard-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="leaderboard-modal-header">
          <div className="leaderboard-title-group">
            <span className="leaderboard-gold-pill">ATELIER ARCADE</span>
            <h2 className="leaderboard-heading">HALL OF RUNWAY CHAMPIONS</h2>
            <p className="leaderboard-subheading">
              GLOBAL RANKINGS • RECORDED PROGRESS & VERIFIED RUNS
            </p>
          </div>
          <button 
            className="leaderboard-close-btn" 
            onClick={() => { soundEngine.playModalClose(); onClose(); }}
            onMouseEnter={() => soundEngine.playHover()}
            title="Close Leaderboard [ESC]"
          >
            ✕
          </button>
        </header>

        {/* Tab Selector */}
        <div className="leaderboard-tabs-bar">
          <button
            className={`leaderboard-tab-btn ${activeTab === 'runway_devil' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('runway_devil'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            😈 RUNWAY DEVIL // TROLL PLATFORMER
          </button>
          <button
            className={`leaderboard-tab-btn ${activeTab === 'rpg' ? 'active' : ''}`}
            onClick={() => { soundEngine.playClick(); setActiveTab('rpg'); }}
            onMouseEnter={() => soundEngine.playHover()}
          >
            🕹️ ATELIER ARCHIVE // COUTURE RPG
          </button>
        </div>

        {/* Content Body */}
        <div className="leaderboard-table-container">
          {currentBoard.length === 0 ? (
            <div className="leaderboard-empty-state">
              <span>No recorded champions yet. Be the first to establish a runway record!</span>
            </div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>RANK</th>
                  <th>CHAMPION</th>
                  {activeTab === 'runway_devil' ? (
                    <>
                      <th>HIGHEST STAGE</th>
                      <th>ATTEMPTS</th>
                    </>
                  ) : (
                    <>
                      <th>HIGHEST FLOOR</th>
                      <th>SWATCHES</th>
                      <th>TOTAL SCORE</th>
                    </>
                  )}
                  <th>LAST RUN</th>
                </tr>
              </thead>
              <tbody>
                {currentBoard.map((entry, idx) => {
                  const isCurrent = activePlayer && (entry.playerId === activePlayer.playerId || entry.alias === activePlayer.alias);
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <tr 
                      key={entry.playerId || idx} 
                      className={`${isCurrent ? 'current-player-row' : ''} ${isTop1 ? 'gold-row' : isTop2 ? 'silver-row' : isTop3 ? 'bronze-row' : ''}`}
                    >
                      <td className="rank-cell">
                        {isTop1 ? (
                          <span className="rank-badge gold-badge">👑 01</span>
                        ) : isTop2 ? (
                          <span className="rank-badge silver-badge">✦ 02</span>
                        ) : isTop3 ? (
                          <span className="rank-badge bronze-badge">✦ 03</span>
                        ) : (
                          <span className="rank-badge standard-badge">{idx < 9 ? `0${idx + 1}` : idx + 1}</span>
                        )}
                      </td>
                      <td className="player-alias-cell">
                        <strong>{entry.alias}</strong>
                        {isCurrent && <span className="you-pill">YOU</span>}
                      </td>

                      {activeTab === 'runway_devil' ? (
                        <>
                          <td className="metric-cell volt">STAGE #{entry.stage}</td>
                          <td className="metric-cell text-muted">{entry.attempts} ATTEMPTS</td>
                        </>
                      ) : (
                        <>
                          <td className="metric-cell volt">FLOOR #{entry.floor}</td>
                          <td className="metric-cell">{entry.swatches || 0} TEXTILES</td>
                          <td className="metric-cell score-highlight">{entry.score?.toLocaleString()} PTS</td>
                        </>
                      )}

                      <td className="date-cell">
                        {entry.lastActiveAt ? new Date(entry.lastActiveAt).toLocaleDateString() : 'RECENT'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info & CTA */}
        <footer className="leaderboard-modal-footer">
          <div className="leaderboard-footer-stats">
            <span>TOTAL REGISTERED CHAMPIONS: <strong>{currentBoard.length}</strong></span>
            {activePlayer && (
              <span className="active-player-tag">
                LOGGED IN AS: <strong>{activePlayer.alias}</strong>
              </span>
            )}
          </div>
          {onLaunchGame && (
            <button
              className="leaderboard-play-btn"
              onClick={() => {
                soundEngine.playGameStart();
                onClose();
                onLaunchGame(activeTab === 'runway_devil' ? 'devil' : 'rpg');
              }}
              onMouseEnter={() => soundEngine.playHover()}
            >
              PLAY {activeTab === 'runway_devil' ? 'RUNWAY DEVIL' : 'ATELIER RPG'} NOW ↗
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
