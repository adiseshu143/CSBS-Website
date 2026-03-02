// Reset admin button integration example
// Add this to your Admin Dashboard or Settings page

import React, { useState } from 'react';
import AdminResetModal from '../components/AdminResetModal';

/**
 * Admin Settings Component with Reset Button
 * This example shows how to integrate the reset functionality
 */
export const AdminSettings: React.FC = () => {
  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetClick = () => {
    // In production, verify user is admin
    // This should check auth.currentUser role == 'admin'
    setShowResetModal(true);
  };

  return (
    <div className="admin-settings">
      <h1>Admin Settings</h1>

      <section className="settings-section">
        <h2>Danger Zone</h2>
        <div className="danger-actions">
          <div className="action-group">
            <h3>Reset Project Data</h3>
            <p className="action-description">
              Permanently delete all user data, registrations, and tickets. This action cannot be
              undone.
            </p>
            <button className="btn-danger-reset" onClick={handleResetClick}>
              🔥 Reset All Data
            </button>
          </div>
        </div>
      </section>

      <AdminResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onResetComplete={() => {
          // Handle reset completion
          console.log('Reset completed successfully');
        }}
      />
    </div>
  );
};

export default AdminSettings;

/**
 * CSS for Admin Settings Component
 * Add this to your styles:
 */
/*
.admin-settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.settings-section {
  margin-top: 32px;
}

.danger-zone {
  background: #fef2f2;
  border: 2px solid #dc2626;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.danger-actions {
  display: grid;
  gap: 20px;
  margin-top: 16px;
}

.action-group {
  background: white;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 16px;
}

.action-group h3 {
  margin: 0 0 8px 0;
  color: #7f1d1d;
  font-size: 16px;
}

.action-description {
  color: #9f1239;
  font-size: 13px;
  margin: 8px 0 16px 0;
  line-height: 1.5;
}

.btn-danger-reset {
  background: #dc2626;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-danger-reset:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
}
*/
