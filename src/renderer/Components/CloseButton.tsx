import React from 'react';

interface CloseButtonProps {
  onClose: () => void;
  position: 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const CloseButton: React.FC<CloseButtonProps> = ({
  onClose,
  position,
  className
}) => {
  // Determine the appropriate class based on position
  const getButtonClass = () => {
    switch (position) {
      case 'top-right':
        return 'close-button-top';
      case 'bottom-left':
        return 'close-button-left';
      case 'bottom-right':
        return 'close-button-right';
      default:
        return 'close-button-top';
    }
  };

  const buttonClass = className || getButtonClass();

  return (
    <button
      className={buttonClass}
      onClick={onClose}
      title="Close"
      aria-label="Close"
    >
      ×
    </button>
  );
};

export default CloseButton;
