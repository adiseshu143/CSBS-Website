/**
 * Admin Reset Modal Component
 * 
 * Protected admin-only component for complete project reset
 * Includes multiple confirmations and safety checks
 * 
 * Usage:
 * <AdminResetModal isOpen={showReset} onClose={() => setShowReset(false)} />
 */

import React, { useState } from 'react';
import { performFrontendReset, reloadPage } from '../utils/projectReset';
import './AdminResetModal.css';

interface AdminResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
}

type ResetStep = 'welcome' | 'confirmation' | 'final' | 'progress' | 'complete' | 'error';

export const AdminResetModal: React.FC<AdminResetModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
}) => {
  const [step, setStep] = useState<ResetStep>('welcome');
  const [confirmationText, setConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const addProgress = (message: string) => {
    setResetProgress((prev) => [...prev, message]);
  };

  const handleStartReset = () => {
    setStep('confirmation');
    setConfirmationText('');
  };

  const handleConfirmation = () => {
    if (confirmationText === 'YES I UNDERSTAND') {
      setStep('final');
      setConfirmationText('');
    }
  };

  const handleFinalConfirmation = () => {
    if (confirmationText === 'DELETE ALL DATA NOW') {
      performReset();
    }
  };

  const performReset = async () => {
    setIsResetting(true);
    setStep('progress');
    setResetProgress([]);

    try {
      addProgress('⏳ Starting complete project reset...');
      addProgress('');

      // Frontend cleanup
      addProgress('🔄 Clearing localStorage...');
      addProgress('🔄 Clearing sessionStorage...');
      addProgress('🔄 Clearing IndexedDB...');
      addProgress('🔄 Clearing cookies...');

      await performFrontendReset();

      addProgress('✅ Frontend reset complete');
      addProgress('');
      addProgress('ℹ️  Next steps:');
      addProgress('1. Run Firebase Admin script to delete Auth users');
      addProgress('2. Run Firebase Admin script to clear Firestore');
      addProgress('3. Run Google Apps Script to clear Sheets');
      addProgress('');
      addProgress('✅ COMPLETE RESET SUCCESSFUL');

      setTimeout(() => {
        setStep('complete');
        setIsResetting(false);
        onResetComplete?.();
      }, 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      setStep('error');
      setIsResetting(false);
      addProgress(`❌ Reset failed: ${errorMsg}`);
    }
  };

  const handleClose = () => {
    if (!isResetting) {
      setStep('welcome');
      setConfirmationText('');
      setResetProgress([]);
      setErrorMessage('');
      onClose();
    }
  };

  const handleReload = () => {
    reloadPage(500);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="reset-modal">
        {/* WELCOME STEP */}
        {step === 'welcome' && (
          <div className="reset-step">
            <div className="warning-header">
              <div className="warning-icon">⚠️</div>
              <h2>Complete Project Reset</h2>
              <p className="warning-text">This action is IRREVERSIBLE</p>
            </div>

            <div className="reset-content">
              <p className="intro-text">
                This will permanently delete <strong>ALL</strong> data from your project:
              </p>

              <ul className="data-list">
                <li>❌ All Firebase Authentication users (admin + regular)</li>
                <li>❌ All Firestore collections and documents</li>
                <li>❌ All registration data</li>
                <li>❌ All registration tickets</li>
                <li>❌ All admin logs</li>
                <li>❌ All cached frontend state</li>
                <li>❌ All localStorage and sessionStorage</li>
              </ul>

              <div className="will-preserve">
                <p>
                  <strong>✅ Will NOT be deleted:</strong>
                </p>
                <ul>
                  <li>Firebase configuration and security rules</li>
                  <li>Environment variables</li>
                  <li>Google Apps Script configuration</li>
                  <li>Cloudinary setup</li>
                  <li>Project files and code</li>
                </ul>
              </div>

              <p className="bold-warning">After reset: Website will behave like a brand new deployment</p>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleClose}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleStartReset}>
                I Understand - Proceed
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMATION STEP 1 */}
        {step === 'confirmation' && (
          <div className="reset-step">
            <h3>First Confirmation Required</h3>
            <p className="confirmation-text">
              Type the following text to confirm you understand this action:
            </p>
            <p className="confirmation-code">YES I UNDERSTAND</p>

            <input
              type="text"
              placeholder="Type exactly: YES I UNDERSTAND"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="confirmation-input"
              autoFocus
            />

            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleConfirmation}
                disabled={confirmationText !== 'YES I UNDERSTAND'}
              >
                Proceed to Final Confirmation
              </button>
            </div>
          </div>
        )}

        {/* FINAL CONFIRMATION STEP */}
        {step === 'final' && (
          <div className="reset-step">
            <h3>Final Confirmation Required</h3>
            <div className="danger-alert">
              <p className="alert-title">🔥 LAST CHANCE - THIS CANNOT BE UNDONE 🔥</p>
              <p className="alert-text">
                Type the following text to PERMANENTLY delete all data:
              </p>
              <p className="confirmation-code">DELETE ALL DATA NOW</p>
            </div>

            <input
              type="text"
              placeholder="Type exactly: DELETE ALL DATA NOW"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="confirmation-input final-input"
              autoFocus
            />

            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleClose}>
                Cancel - Do NOT Reset
              </button>
              <button
                className="btn-danger-final"
                onClick={handleFinalConfirmation}
                disabled={confirmationText !== 'DELETE ALL DATA NOW'}
              >
                🔥 DELETE ALL DATA NOW 🔥
              </button>
            </div>
          </div>
        )}

        {/* PROGRESS STEP */}
        {step === 'progress' && (
          <div className="reset-step">
            <h3>Resetting Project...</h3>
            <div className="progress-box">
              {resetProgress.map((msg, idx) => (
                <p key={idx} className="progress-message">
                  {msg}
                </p>
              ))}
              {isResetting && <div className="spinner"></div>}
            </div>
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === 'complete' && (
          <div className="reset-step">
            <div className="success-header">
              <div className="success-icon">✅</div>
              <h3>Frontend Reset Complete!</h3>
            </div>

            <div className="complete-content">
              <p className="success-text">
                Frontend cleanup has been completed successfully.
              </p>

              <div className="next-steps">
                <p>
                  <strong>📋 Next Steps Required:</strong>
                </p>
                <ol>
                  <li>
                    <strong>Firebase Admin Reset</strong>
                    <br />
                    Run: <code>node scripts/firebaseResetAdmin.js</code>
                    <br />
                    This deletes all Auth users and clears Firestore
                  </li>
                  <li>
                    <strong>Google Sheets Cleanup</strong>
                    <br />
                    Run the Google Apps Script cleanup function
                    <br />
                    This clears registration sheets but keeps headers
                  </li>
                  <li>
                    <strong>Reload Application</strong>
                    <br />
                    Click "Reload" below to refresh the frontend
                  </li>
                </ol>
              </div>

              <p className="info-text">
                ✅ Your website will then behave like a brand new deployment with all old data
                removed.
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleClose}>
                Keep Page Open
              </button>
              <button className="btn-primary" onClick={handleReload}>
                Reload Application
              </button>
            </div>
          </div>
        )}

        {/* ERROR STEP */}
        {step === 'error' && (
          <div className="reset-step">
            <h3>Reset Failed</h3>
            <div className="error-box">
              <p className="error-title">❌ An error occurred during reset:</p>
              <p className="error-message">{errorMessage}</p>
              <div className="progress-box">
                {resetProgress.map((msg, idx) => (
                  <p key={idx} className="progress-message">
                    {msg}
                  </p>
                ))}
              </div>
            </div>

            <p className="error-info">Please check the browser console for more details.</p>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setStep('welcome')}>
                Try Again
              </button>
              <button className="btn-cancel" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResetModal;
