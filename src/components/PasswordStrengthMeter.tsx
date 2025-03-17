import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  onStrengthChange?: (strength: number) => void;
}

export function PasswordStrengthMeter({ password, onStrengthChange }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let calculatedStrength = 0;
    let feedbackText = '';

    if (password.length > 0) {
      // Length check
      if (password.length >= 8) {
        calculatedStrength += 1;
      } else {
        feedbackText = 'Password should be at least 8 characters';
      }

      // Complexity checks
      if (/[A-Z]/.test(password)) calculatedStrength += 1;
      if (/[a-z]/.test(password)) calculatedStrength += 1;
      if (/[0-9]/.test(password)) calculatedStrength += 1;
      if (/[^A-Za-z0-9]/.test(password)) calculatedStrength += 1;

      if (feedbackText === '') {
        if (calculatedStrength === 1) feedbackText = 'Weak';
        else if (calculatedStrength === 2) feedbackText = 'Fair';
        else if (calculatedStrength === 3) feedbackText = 'Good';
        else if (calculatedStrength === 4) feedbackText = 'Strong';
        else if (calculatedStrength === 5) feedbackText = 'Very strong';
      }
    }

    setStrength(calculatedStrength);
    setFeedback(feedbackText);
    
    if (onStrengthChange) {
      onStrengthChange(calculatedStrength);
    }
  }, [password, onStrengthChange]);

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${
              strength <= 1 ? 'bg-red-500' : 
              strength === 2 ? 'bg-yellow-500' : 
              strength === 3 ? 'bg-yellow-400' : 
              strength === 4 ? 'bg-green-400' : 'bg-green-500'
            }`}
            style={{ width: `${(strength / 5) * 100}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-500">{feedback}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center text-xs text-gray-500">
          <Check className={`h-3 w-3 mr-1 ${password.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
          <span>8+ characters</span>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Check className={`h-3 w-3 mr-1 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
          <span>Uppercase</span>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Check className={`h-3 w-3 mr-1 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
          <span>Lowercase</span>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Check className={`h-3 w-3 mr-1 ${/[0-9]/.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
          <span>Number</span>
        </div>
      </div>
    </div>
  );
}