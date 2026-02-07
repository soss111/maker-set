import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Language as LanguageIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

// Import translation files
import enTranslations from '../translations/en.json';
import etTranslations from '../translations/et.json';
import ruTranslations from '../translations/ru.json';
import fiTranslations from '../translations/fi.json';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`translation-tabpanel-${index}`}
      aria-labelledby={`translation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TranslationManager: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const [translations, setTranslations] = useState<Record<string, any>>({
    en: enTranslations,
    et: etTranslations,
    ru: ruTranslations,
    fi: fiTranslations,
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'et', name: 'Eesti', flag: '🇪🇪' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  ];

  // Flatten nested translation objects for easier editing
  const flattenTranslations = (obj: any, prefix = ''): Record<string, string> => {
    const flattened: Record<string, string> = {};
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(flattened, flattenTranslations(obj[key], `${prefix}${key}.`));
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    return flattened;
  };

  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || '';
  };

  const setNestedValue = (obj: any, path: string, value: string): any => {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    return result;
  };

  const handleEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditingValue(currentValue);
  };

  const handleSave = () => {
    if (editingKey && editingValue !== undefined) {
      const languageCode = languages[activeTab].code;
      const updatedTranslations = {
        ...translations,
        [languageCode]: setNestedValue(translations[languageCode], editingKey, editingValue),
      };
      setTranslations(updatedTranslations);
      setEditingKey(null);
      setEditingValue('');
      setSuccessMessage(`Translation saved for ${languages[activeTab].name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const renderTranslationItem = (key: string, value: string) => {
    const isEditing = editingKey === key;
    
    return (
      <Box key={key} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {key}
          </Typography>
          {!isEditing && (
            <Tooltip title="Edit translation">
              <IconButton size="small" onClick={() => handleEdit(key, value)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {isEditing ? (
          <Box>
            <TextField
              id="translation-edit-field"
              name="translation-edit-field"
              fullWidth
              multiline
              rows={2}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              variant="outlined"
              size="small"
            />
            <Box display="flex" gap={1} mt={1}>
              <Button
                size="small"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {value || <em>No translation</em>}
          </Typography>
        )}
      </Box>
    );
  };

  const currentLanguageTranslations = translations[languages[activeTab].code];
  const flattenedTranslations = flattenTranslations(currentLanguageTranslations);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <LanguageIcon fontSize="large" color="primary" />
        <Box>
          <Typography variant="h4" component="h1">
            Translation Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage translations for all supported languages
          </Typography>
        </Box>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            {languages.map((lang, index) => (
              <Tab
                key={lang.code}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {lang.code === currentLanguage && (
                      <Chip label="Current" size="small" color="primary" />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={activeTab}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              {languages[activeTab].name} Translations ({Object.keys(flattenedTranslations).length} keys)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {Object.entries(flattenedTranslations)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <Box key={key}>
                  {renderTranslationItem(key, value)}
                </Box>
              ))}
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default TranslationManager;
