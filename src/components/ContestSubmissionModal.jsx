import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/soundEngine';

export const ContestSubmissionModal = ({ isOpen, onClose }) => {
  // Contact Method: 'email' or 'instagram'
  const [contactType, setContactType] = useState('email');
  const [contactValue, setContactValue] = useState('');
  
  // Verification states
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStep, setVerificationStep] = useState('idle'); // 'idle' | 'pending' | 'verified'
  const [generatedPin, setGeneratedPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Up to two transparent PNG files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileError, setFileError] = useState('');

  // Submission state
  const [submitted, setSubmitted] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);

  const fileInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Reset verification when contact value or type changes
  const handleContactTypeChange = (type) => {
    soundEngine.playClick();
    setContactType(type);
    setContactValue('');
    setIsVerified(false);
    setVerificationStep('idle');
    setGeneratedPin('');
    setEnteredPin('');
    setVerificationFeedback('');
    setVerificationError('');
  };

  const handleContactValueChange = (e) => {
    let val = e.target.value;
    if (contactType === 'instagram' && val && !val.startsWith('@')) {
      val = '@' + val;
    }
    setContactValue(val);
    if (isVerified) {
      setIsVerified(false);
      setVerificationStep('idle');
      setGeneratedPin('');
      setEnteredPin('');
      setVerificationFeedback('');
      setVerificationError('');
    }
  };

  // Start confirmation / verification
  const handleInitiateVerification = () => {
    soundEngine.init();
    setVerificationError('');
    setVerificationFeedback('');

    if (!contactValue.trim()) {
      soundEngine.playHazard();
      setVerificationError(`Please enter your ${contactType === 'email' ? 'email address' : 'Instagram handle'}.`);
      return;
    }

    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(contactValue.trim())) {
        soundEngine.playHazard();
        setVerificationError('Invalid email structure. Please provide a real email address (e.g. name@domain.com).');
        return;
      }

      // Generate a 6-digit confirmation PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedPin(pin);
      setVerificationStep('pending');
      soundEngine.playClue();
      setVerificationFeedback(`Atelier Verification PIN dispatched to ${contactValue.trim()}. Enter PIN below to confirm address.`);
    } else {
      // Instagram validation
      const cleanHandle = contactValue.trim().replace(/^@/, '');
      const igRegex = /^[a-zA-Z0-9._]{1,30}$/;
      if (!cleanHandle || !igRegex.test(cleanHandle) || cleanHandle.includes('..') || cleanHandle.startsWith('.') || cleanHandle.endsWith('.')) {
        soundEngine.playHazard();
        setVerificationError('Invalid Instagram ID format. Use 1–30 characters (letters, numbers, periods, underscores).');
        return;
      }

      // Generate a 4-digit challenge PIN for Instagram
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedPin(pin);
      setVerificationStep('pending');
      soundEngine.playClue();
      setVerificationFeedback(`Atelier handle validation token generated for @${cleanHandle}. Enter token below to confirm identity.`);
    }
  };

  // Confirm verification code
  const handleConfirmPin = () => {
    soundEngine.init();
    setVerificationError('');

    if (enteredPin.trim() === generatedPin.trim()) {
      setIsVerified(true);
      setVerificationStep('verified');
      soundEngine.playSubscribeSuccess();
      setVerificationFeedback(`Verified real ${contactType === 'email' ? 'Email address' : 'Instagram creator handle'}: ${contactValue.trim()} ✓`);
    } else {
      soundEngine.playHazard();
      setVerificationError('Incorrect verification PIN. Please re-enter the exact code shown above.');
    }
  };

  // Inspect and process uploaded PNG files
  const processFiles = (filesList) => {
    setFileError('');
    const files = Array.from(filesList);

    if (uploadedFiles.length + files.length > 2) {
      soundEngine.playHazard();
      setFileError('Maximum of 2 transparent PNG files allowed per submission.');
      return;
    }

    files.forEach(file => {
      // Enforce PNG extension and MIME
      const isPngExt = file.name.toLowerCase().endsWith('.png');
      const isPngMime = file.type === 'image/png';

      if (!isPngExt && !isPngMime) {
        soundEngine.playHazard();
        setFileError(`File "${file.name}" rejected: Only PNG files with transparent backgrounds are accepted.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const dimensions = `${width} × ${height} px`;

          // Canvas transparency scanner
          const canvas = document.createElement('canvas');
          const sampleW = Math.min(width, 240);
          const sampleH = Math.min(height, 240);
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, sampleW, sampleH);

          let hasTransparency = false;
          try {
            const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
            for (let i = 3; i < imgData.length; i += 4) {
              if (imgData[i] < 240) {
                hasTransparency = true;
                break;
              }
            }
          } catch (_) {
            hasTransparency = true; // Fallback if CORS or local context restricts getImageData
          }

          if (!hasTransparency) {
            soundEngine.playHazard();
            setFileError(`"${file.name}" has an opaque background. Please export with transparency for apparel production.`);
          } else {
            soundEngine.playClue();
          }

          const newFileEntry = {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            previewUrl: e.target.result,
            isTransparent: hasTransparency,
            dimensions
          };

          setUploadedFiles(prev => (prev.length >= 2 ? prev : [...prev, newFileEntry]));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (fileId, e) => {
    e.stopPropagation();
    soundEngine.playClick();
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    soundEngine.init();

    if (!isVerified) {
      soundEngine.playHazard();
      setVerificationError(`You must confirm and verify your ${contactType === 'email' ? 'email' : 'Instagram ID'} before submitting.`);
      return;
    }

    if (uploadedFiles.length === 0) {
      soundEngine.playHazard();
      setFileError('Please upload at least one transparent PNG artwork file.');
      return;
    }

    const hasOpaqueFile = uploadedFiles.some(f => !f.isTransparent);
    if (hasOpaqueFile) {
      soundEngine.playHazard();
      setFileError('All uploaded files must have transparent backgrounds.');
      return;
    }

    const receiptId = `JVN-SS26-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
    const submissionRecord = {
      submissionId: receiptId,
      contactType,
      contactValue: contactValue.trim(),
      email: contactType === 'email' ? contactValue.trim() : '',
      instagram: contactType === 'instagram' ? contactValue.trim() : '',
      isVerified: true,
      files: uploadedFiles.map(f => ({ name: f.name, size: f.size, dimensions: f.dimensions })),
      previewImage: uploadedFiles[0]?.previewUrl || null,
      submittedAt: new Date().toISOString()
    };

    // Store in local storage for Admin CMS
    const existing = JSON.parse(localStorage.getItem('jvan_contest_entries') || '[]');
    existing.push(submissionRecord);
    localStorage.setItem('jvan_contest_entries', JSON.stringify(existing));
    try {
      window.dispatchEvent(new Event('jvan_contest_updated'));
    } catch (_) {}

    setSubmissionReceipt(receiptId);
    soundEngine.playSubscribeSuccess();

    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#dfba73', '#c5a059', '#ffffff', '#22c55e']
      });
    } catch (_) {}

    setSubmitted(true);
  };

  const handleResetForm = () => {
    soundEngine.playClick();
    setSubmitted(false);
    setSubmissionReceipt(null);
    setContactValue('');
    setIsVerified(false);
    setVerificationStep('idle');
    setGeneratedPin('');
    setEnteredPin('');
    setVerificationFeedback('');
    setVerificationError('');
    setUploadedFiles([]);
    setFileError('');
  };

  return (
    <div className="atelier-modal-overlay" onClick={onClose}>
      <div 
        className="atelier-modal-window streamlined" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-headline"
      >
        {/* Editorial Top Bar */}
        <header className="atelier-modal-header">
          <div className="modal-header-meta">
            <span className="atelier-brand-tag">JVāN ATELIER // COMMUNITY DESIGN LAB</span>
            <h2 id="modal-headline" className="modal-header-title">
              SS26 APPAREL GRAPHIC SUBMISSION
            </h2>
          </div>
          <button 
            className="atelier-close-button" 
            onClick={onClose}
            onMouseEnter={() => soundEngine.playHover()}
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        {/* Awards Ribbon */}
        <div className="atelier-awards-ribbon">
          <div className="award-tier-item">
            <span className="tier-badge-gold">TIER 01</span>
            <div className="tier-text">
              <strong>TOP 3 DESIGNS:</strong> Produced for JVāN SS26 runway capsule & featured in storefront.
            </div>
          </div>
          <div className="award-tier-divider"></div>
          <div className="award-tier-item">
            <span className="tier-badge-silver">TIER 02</span>
            <div className="tier-text">
              <strong>TOP 10 FINALISTS:</strong> VIP allocation & exclusive atelier discount codes.
            </div>
          </div>
        </div>

        {/* Form Body */}
        {!submitted ? (
          <form className="atelier-modal-form streamlined-form" onSubmit={handleSubmit}>
            <div className="streamlined-form-content">

              {/* SECTION 1: VERIFIED CONTACT IDENTIFIER */}
              <div className="form-sub-section">
                <div className="column-section-header">
                  <span className="section-num">01</span>
                  <span className="section-title">VERIFIED CONTACT IDENTIFIER</span>
                </div>

                {/* Contact Type Toggle */}
                <div className="contact-type-toggle">
                  <button
                    type="button"
                    className={`contact-toggle-btn ${contactType === 'email' ? 'active' : ''}`}
                    onClick={() => handleContactTypeChange('email')}
                    onMouseEnter={() => soundEngine.playHover()}
                  >
                    <span className="toggle-icon">✉</span>
                    <span>VERIFIED EMAIL</span>
                  </button>
                  <button
                    type="button"
                    className={`contact-toggle-btn ${contactType === 'instagram' ? 'active' : ''}`}
                    onClick={() => handleContactTypeChange('instagram')}
                    onMouseEnter={() => soundEngine.playHover()}
                  >
                    <span className="toggle-icon"></span>
                    <span>INSTAGRAM ID</span>
                  </button>
                </div>

                {/* Contact Input & Verification Action */}
                <div className="verification-input-wrap">
                  <div className="atelier-input-group">
                    <label htmlFor="contactIdentifier">
                      {contactType === 'email' ? 'OFFICIAL EMAIL ADDRESS *' : 'INSTAGRAM CREATOR HANDLE *'}
                    </label>
                    <div className="input-with-action">
                      <input
                        id="contactIdentifier"
                        type={contactType === 'email' ? 'email' : 'text'}
                        required
                        disabled={isVerified}
                        placeholder={contactType === 'email' ? 'e.g. designer@atelier.com' : 'e.g. @maya.streetwear'}
                        value={contactValue}
                        onChange={handleContactValueChange}
                        onKeyDown={(e) => { if (e.key !== 'Enter') soundEngine.playInputTick(); }}
                        className={isVerified ? 'verified-input' : ''}
                      />
                      {!isVerified ? (
                        <button
                          type="button"
                          className="verify-action-btn"
                          onClick={handleInitiateVerification}
                          onMouseEnter={() => soundEngine.playHover()}
                        >
                          VERIFY {contactType === 'email' ? 'EMAIL' : 'ID'} ↗
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="change-contact-btn"
                          onClick={() => { setIsVerified(false); setVerificationStep('idle'); }}
                        >
                          Change ↺
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification PIN Entry Challenge (Confirms it is real) */}
                {verificationStep === 'pending' && !isVerified && (
                  <div className="pin-verification-box">
                    <div className="pin-notice-header">
                      <span className="pin-notice-badge">SECURITY CHECK</span>
                      <span className="pin-notice-text">
                        {verificationFeedback}
                      </span>
                    </div>

                    <div className="demo-pin-pill">
                      <span>CONFIRMATION TOKEN: </span>
                      <strong>{generatedPin}</strong>
                    </div>

                    <div className="pin-input-row">
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="ENTER CODE"
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
                        className="pin-code-input"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="confirm-pin-btn"
                        onClick={handleConfirmPin}
                        onMouseEnter={() => soundEngine.playHover()}
                      >
                        CONFIRM CODE ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Verified Success Confirmation Badge */}
                {isVerified && (
                  <div className="verified-success-banner">
                    <span className="badge-check">✓</span>
                    <span className="badge-text">
                      CONFIRMED REAL: <strong>{contactValue}</strong> ({contactType.toUpperCase()})
                    </span>
                  </div>
                )}

                {verificationError && (
                  <div className="verification-error-text">
                    ⚠️ {verificationError}
                  </div>
                )}
              </div>

              {/* SECTION 2: TRANSPARENT PNG ARTWORK UPLOAD (UP TO 2 FILES) */}
              <div className="form-sub-section" style={{ marginTop: '1.25rem' }}>
                <div className="column-section-header">
                  <span className="section-num">02</span>
                  <div className="section-title-wrap">
                    <span className="section-title">TRANSPARENT PNG ARTWORK</span>
                    <span className="section-count-tag">({uploadedFiles.length}/2 FILES ATTACHED)</span>
                  </div>
                </div>

                <p className="section-guide-note">
                  Upload up to two original apparel graphic files (e.g. Front & Back designs). 
                  <strong> Only PNG files with transparent backgrounds</strong> are accepted for runway production.
                </p>

                {/* Hidden File Input */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept=".png,image/png"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />

                {/* Uploaded Files Grid */}
                {uploadedFiles.length > 0 && (
                  <div className="uploaded-png-cards-grid">
                    {uploadedFiles.map((file, index) => (
                      <div key={file.id} className="png-file-card">
                        <div className="png-checkerboard-thumb">
                          <img src={file.previewUrl} alt={file.name} />
                          <span className="file-slot-badge">FILE 0{index + 1}</span>
                        </div>
                        <div className="png-file-meta">
                          <div className="file-name-row">
                            <span className="file-title-text" title={file.name}>{file.name}</span>
                            <button
                              type="button"
                              className="remove-file-button"
                              onClick={(e) => handleRemoveFile(file.id, e)}
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                          <span className="file-dims-text">{file.dimensions} • {file.size}</span>
                          <div className="transparency-status-pill">
                            {file.isTransparent ? (
                              <span className="status-transparent">✓ TRANSPARENT PNG</span>
                            ) : (
                              <span className="status-opaque">⚠️ OPAQUE BACKGROUND</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone (shown if less than 2 files attached) */}
                {uploadedFiles.length < 2 && (
                  <div 
                    className="atelier-dropzone compact"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={() => soundEngine.playHover()}
                  >
                    <div className="dropzone-idle-content">
                      <div className="dropzone-icon-circle">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <span className="dropzone-prompt">
                        {uploadedFiles.length === 0 ? 'DRAG & DROP TRANSPARENT PNG (UP TO 2 FILES)' : '+ ADD SECONDARY PNG GRAPHIC (OPTIONAL)'}
                      </span>
                      <span className="dropzone-specs">
                        STRICT REQUIREMENT: .PNG FORMAT • TRANSPARENT ALPHA CHANNELS ONLY
                      </span>
                    </div>
                  </div>
                )}

                {fileError && (
                  <div className="file-error-alert">
                    ⚠️ {fileError}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer Bar */}
            <footer className="atelier-modal-footer">
              <div className="footer-terms-meta">
                <span className="terms-highlight">INTELLECTUAL PROPERTY & CREATOR RIGHTS:</span>
                <span className="terms-body">
                  Any and all submitted artwork, graphics, and designs will be fully and exclusively owned by JVāN upon submission for manufacturing, marketing, and commercial production.
                </span>
              </div>
              <button 
                type="submit" 
                className={`atelier-submit-cta ${(!isVerified || uploadedFiles.length === 0) ? 'cta-disabled' : ''}`}
                onMouseEnter={() => soundEngine.playHover()}
              >
                <span>SUBMIT ARTWORK TO CURATORS</span>
                <span className="cta-arrow">↗</span>
              </button>
            </footer>
          </form>
        ) : (
          /* High-Fashion Confirmation Dossier State */
          <div className="atelier-receipt-screen">
            <div className="receipt-certificate-card">
              <div className="certificate-header">
                <span className="cert-badge">DOSSIER REGISTERED // CONFIRMED</span>
                <h3 className="cert-title">ATELIER SUBMISSION CERTIFICATE</h3>
                <span className="cert-id-tag">ENTRY RECEIPT: <strong>{submissionReceipt}</strong></span>
              </div>

              <div className="certificate-body-specs">
                <div className="spec-entry">
                  <span className="spec-key">VERIFIED CONTACT</span>
                  <span className="spec-val">{contactValue} ({contactType.toUpperCase()}) ✓</span>
                </div>
                <div className="spec-entry">
                  <span className="spec-key">FILES SUBMITTED</span>
                  <span className="spec-val">
                    {uploadedFiles.length} Transparent PNG File{uploadedFiles.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="spec-entry" style={{ gridColumn: '1 / -1' }}>
                  <span className="spec-key">ATTACHED ASSETS</span>
                  <span className="spec-val">
                    {uploadedFiles.map(f => `${f.name} (${f.dimensions})`).join(' • ')}
                  </span>
                </div>
                <div className="spec-entry" style={{ gridColumn: '1 / -1' }}>
                  <span className="spec-key">VERIFIED TIMESTAMP</span>
                  <span className="spec-val">{new Date().toLocaleDateString()} // {new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="certificate-message">
                Your transparent PNG graphic assets have been registered into the JVāN curation queue. 
                Our design panel reviews all entries prior to our storefront relaunch. 
                Selected creators will be contacted directly via your verified {contactType === 'email' ? 'email' : 'Instagram handle'}.
              </div>

              <div className="certificate-actions">
                <button 
                  type="button" 
                  className="cert-btn-primary"
                  onClick={onClose}
                  onMouseEnter={() => soundEngine.playHover()}
                >
                  RETURN TO STOREFRONT
                </button>
                <button 
                  type="button" 
                  className="cert-btn-secondary"
                  onClick={handleResetForm}
                  onMouseEnter={() => soundEngine.playHover()}
                >
                  SUBMIT ANOTHER CONCEPT +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
