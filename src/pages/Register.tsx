import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ShoppingBag, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);

  useEffect(() => {
    // Check password strength
    let strength = 0;
    let feedback = '';

    if (password.length > 0) {
      // Length check
      if (password.length >= 8) {
        strength += 1;
      } else {
        feedback = 'Password should be at least 8 characters';
      }

      // Complexity checks
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;

      if (strength === 1) feedback = 'Password is weak';
      else if (strength === 2) feedback = 'Password is fair';
      else if (strength === 3) feedback = 'Password is good';
      else if (strength === 4) feedback = 'Password is strong';
      else if (strength === 5) feedback = 'Password is very strong';
    }

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (passwordStrength < 3) {
      setError('Please use a stronger password');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <ShoppingBag className="h-12 w-12 text-primary-orange" />
        </div>
        <h2 className="text-2xl sm:text-3xl text-center font-extrabold text-gray-900 mb-2">
          Create your UlishaStore account
        </h2>
        <p className="text-center text-gray-600">Join our community today</p>
      </div>

      <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:px-10 shadow-xl rounded-lg border border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <input
                  id="name"
                  type="text"
                  required
                  className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <User className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  type="email"
                  required
                  className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="pl-10 pr-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-orange focus:ring-primary-orange"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          passwordStrength <= 1 ? 'bg-red-500' : 
                          passwordStrength === 2 ? 'bg-yellow-500' : 
                          passwordStrength === 3 ? 'bg-yellow-400' : 
                          passwordStrength === 4 ? 'bg-green-400' : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{passwordFeedback}</span>
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
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={`pl-10 pr-10 block w-full rounded-md border ${
                    confirmPassword && password !== confirmPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-primary-orange focus:ring-primary-orange'
                  } px-3 py-2 shadow-sm`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-orange focus:ring-primary-orange border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the <a href="#" className="text-primary-orange hover:text-primary-orange/90">Terms of Service</a> and <a href="#" className="text-primary-orange hover:text-primary-orange/90">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || password !== confirmPassword || passwordStrength < 3}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-orange hover:bg-primary-orange/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-orange transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-orange hover:text-primary-orange/90">
                    Sign in
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}