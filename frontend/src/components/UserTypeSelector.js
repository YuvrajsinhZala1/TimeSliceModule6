import React from 'react';

const UserTypeSelector = ({ selectedType, onChange }) => {
  return (
    <div className="auth-form-group">
      <label>Primary Role (you can do both, but pick your main focus):</label>
      
      <div className="role-selector">
        <label className="role-option">
          <input
            type="radio"
            name="primaryRole"
            value="helper"
            checked={selectedType === 'helper'}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="role-card">
            <div className="role-icon">🤝</div>
            <div className="role-title">Helper</div>
            <div className="role-description">
              Primarily help others with tasks and earn credits
            </div>
          </div>
        </label>
        
        <label className="role-option">
          <input
            type="radio"
            name="primaryRole"
            value="taskProvider"
            checked={selectedType === 'taskProvider'}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="role-card">
            <div className="role-icon">📋</div>
            <div className="role-title">Task Provider</div>
            <div className="role-description">
              Primarily post tasks and get help using credits
            </div>
          </div>
        </label>
      </div>
      
      <div className="role-note">
        <span className="role-note-icon">💡</span>
        <span className="role-note-text">
          Don't worry! You can both post tasks AND help others regardless of your primary role.
        </span>
      </div>
    </div>
  );
};

export default UserTypeSelector;