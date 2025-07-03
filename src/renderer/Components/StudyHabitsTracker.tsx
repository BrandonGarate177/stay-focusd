import React from 'react';

interface StudyHabitsTrackerProps {
  onClose?: () => void;
}

const StudyHabitsTracker: React.FC<StudyHabitsTrackerProps> = ({ onClose }) => {
  return (
    <div className="study-habits-container">
      <h2>Study Habits Tracker</h2>
      <p>This is where your study statistics and habits will be displayed.</p>
      <p>Track your progress and improve your focus over time.</p>
      {/* Future content will go here */}
    </div>
  );
};

export default StudyHabitsTracker;
