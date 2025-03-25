import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-4 w-8',
          circle: 'h-3 w-3',
          translate: checked ? 'translate-x-4' : 'translate-x-1'
        };
      case 'lg':
        return {
          container: 'h-7 w-14',
          circle: 'h-5 w-5',
          translate: checked ? 'translate-x-8' : 'translate-x-1'
        };
      default: // md
        return {
          container: 'h-5 w-10',
          circle: 'h-4 w-4',
          translate: checked ? 'translate-x-5' : 'translate-x-1'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex ${sizeClasses.container} items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${
        checked ? 'bg-green-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block ${sizeClasses.circle} transform rounded-full bg-white transition-transform ${
          sizeClasses.translate
        }`}
      />
    </button>
  );
};

export default ToggleSwitch; 