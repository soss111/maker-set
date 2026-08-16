import React, { useState } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Container,
  Paper
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

type LoginMode = 'code' | 'password';
type CodeStep = 'email' | 'code';

const Login: React.FC = () => {
  // Default to password while production SMTP is often unset; code login remains available.
  const [mode, setMode] = useState<LoginMode>('password');
  const [codeStep, setCodeStep] = useState<CodeStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, requestLoginCode, loginWithCode } = useAuth();
  const navigate = useNavigate();

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const switchToPassword = (message?: string) => {
    setMode('password');
    setCodeStep('email');
    if (message) {
      setError(message);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const result = await requestLoginCode(email);
      setInfo(result.message);
      setCodeStep('code');
      setCode('');
    } catch (err: any) {
      const msg = err.message || 'Failed to send login code.';
      // SMTP missing/broken → guide user to password login immediately
      if (/smtp|email login is unavailable|not configured|password/i.test(msg)) {
        switchToPassword(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      await loginWithCode(email, code);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{ px: { xs: 2, sm: 3 }, width: '100%', boxSizing: 'border-box' }}
    >
      <Box
        sx={{
          marginTop: { xs: 2, sm: 8 },
          marginBottom: { xs: 3, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: { xs: 2, sm: 4 },
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography
              component="h1"
              variant="h4"
              sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' }, textAlign: 'center' }}
            >
              Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              {mode === 'code'
                ? 'Enter your email and we will send a 6-digit login code.'
                : 'Sign in with your email and password.'}
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {renderError(error)}
              </Alert>
            )}
            {info && (
              <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
                {info}
              </Alert>
            )}

            {mode === 'code' && codeStep === 'email' && (
              <Box component="form" onSubmit={handleRequestCode} sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 1 }}
                  disabled={loading}
                >
                  {loading ? 'Sending code...' : 'Send 6-digit code'}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={loading}
                  onClick={() => switchToPassword()}
                >
                  Use password instead
                </Button>
              </Box>
            )}

            {mode === 'code' && codeStep === 'code' && (
              <Box component="form" onSubmit={handleVerifyCode} sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email-readonly"
                  label="Email Address"
                  value={email}
                  disabled
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="code"
                  label="6-digit code"
                  name="code"
                  autoFocus
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 1 }}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  disabled={loading}
                  onClick={() => {
                    setCodeStep('email');
                    setCode('');
                    resetMessages();
                  }}
                >
                  Use a different email
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  disabled={loading}
                  onClick={async () => {
                    resetMessages();
                    setLoading(true);
                    try {
                      const result = await requestLoginCode(email);
                      setInfo(result.message || 'A new code was sent to your email.');
                      setCode('');
                    } catch (err: any) {
                      const msg = err.message || 'Failed to send login code.';
                      if (/smtp|email login is unavailable|not configured|password/i.test(msg)) {
                        switchToPassword(msg);
                      } else {
                        setError(msg);
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Resend code
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 1 }}
                  disabled={loading}
                  onClick={() => switchToPassword()}
                >
                  Use password instead
                </Button>
              </Box>
            )}

            {mode === 'password' && (
              <Box component="form" onSubmit={handlePasswordSubmit} sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 1 }}
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  disabled={loading}
                  onClick={() => {
                    setMode('code');
                    setCodeStep('email');
                    resetMessages();
                  }}
                >
                  Use 6-digit email code instead
                </Button>
              </Box>
            )}

            <Box sx={{ textAlign: 'center', width: '100%', mt: 2 }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link component={RouterLink} to="/register" variant="body2">
                  Sign up here
                </Link>
              </Typography>
              {mode === 'password' && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <Link component={RouterLink} to="/forgot-password" variant="body2">
                    Forgot your password?
                  </Link>
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
