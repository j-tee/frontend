import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Col, Form, Nav, Row, Spinner, Tab } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { selectAuthState } from '../../../store/slices/authSlice'
import {
  fetchSettings,
  updateSettings,
  setAppearanceSettings,
  setRegionalSettings,
  setCurrency,
  selectSettings,
  selectCurrency,
  selectSettingsStatus,
  selectSaveStatus,
  initializeDefaultSettings,
} from '../../../store/slices/settingsSlice'
import type { ThemePreset } from '../../../types/settings'
import { AVAILABLE_CURRENCIES } from '../../../types/settings'
import { THEME_PRESETS, applyAppearanceSettings } from '../../../utils/theme'

const SettingsPage = () => {
  const dispatch = useAppDispatch()
  const { business } = useAppSelector(selectAuthState)
  const settings = useAppSelector(selectSettings)
  const currency = useAppSelector(selectCurrency)
  const status = useAppSelector(selectSettingsStatus)
  const saveStatus = useAppSelector(selectSaveStatus)
  
  const [activeTab, setActiveTab] = useState('currency')

  // Load settings on mount
  useEffect(() => {
    if (business?.id && !settings) {
      void dispatch(fetchSettings())
        .unwrap()
        .catch(() => {
          // If settings don't exist, initialize with defaults
          dispatch(initializeDefaultSettings(business.id))
        })
    }
  }, [dispatch, business, settings])

  // Apply theme when settings change
  useEffect(() => {
    if (settings?.appearance) {
      applyAppearanceSettings({
        themePreset: settings.appearance.themePreset,
        customColors: settings.appearance.customColors,
        fontSize: settings.appearance.fontSize,
        colorScheme: settings.appearance.colorScheme,
        compactMode: settings.appearance.compactMode,
        animationsEnabled: settings.appearance.animationsEnabled,
        highContrast: settings.appearance.highContrast,
      })
    }
  }, [settings?.appearance])

  const handleCurrencyChange = (currencyCode: string) => {
    const selectedCurrency = AVAILABLE_CURRENCIES.find((c) => c.code === currencyCode)
    if (selectedCurrency) {
      dispatch(setCurrency(selectedCurrency))
    }
  }

  const handleThemeChange = (preset: ThemePreset) => {
    dispatch(setAppearanceSettings({ themePreset: preset }))
  }

  const handleColorSchemeChange = (scheme: 'light' | 'dark' | 'auto') => {
    dispatch(setAppearanceSettings({ colorScheme: scheme }))
  }

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    dispatch(setAppearanceSettings({ fontSize: size }))
  }

  const handleSaveSettings = () => {
    if (settings) {
      void dispatch(updateSettings(settings))
    }
  }

  if (status === 'loading' && !settings) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Alert variant="warning">
          <Alert.Heading>Settings not found</Alert.Heading>
          <p>Unable to load settings. Please try refreshing the page.</p>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
            <p className="mt-1 text-sm text-slate-600">
              Customize your workspace appearance, currency, and preferences
            </p>
          </div>
          <Button
            variant="primary"
            className="rounded-pill px-4 py-2"
            onClick={handleSaveSettings}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Saved
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Save Changes
              </>
            )}
          </Button>
        </div>
        
        {saveStatus === 'saved' && (
          <Alert variant="success" className="mt-4 mb-0">
            <i className="bi bi-check-circle me-2"></i>
            Settings saved successfully!
          </Alert>
        )}
        
        {saveStatus === 'failed' && (
          <Alert variant="danger" className="mt-4 mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Failed to save settings. Please try again.
          </Alert>
        )}
      </div>

      {/* Settings Tabs */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Tab.Container activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)}>
          <Nav variant="tabs" className="border-bottom px-4 pt-4">
            <Nav.Item>
              <Nav.Link eventKey="currency" className="px-4">
                <i className="bi bi-currency-dollar me-2"></i>
                Currency & Regional
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="appearance" className="px-4">
                <i className="bi bi-palette me-2"></i>
                Appearance
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="notifications" className="px-4">
                <i className="bi bi-bell me-2"></i>
                Notifications
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="receipt" className="px-4">
                <i className="bi bi-receipt me-2"></i>
                Receipt
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content className="p-6">
            {/* Currency & Regional Settings */}
            <Tab.Pane eventKey="currency">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Currency Settings</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose the currency for your business. This will be used across all sales, reports, and displays.
                  </p>
                </div>

                <Form>
                  <Row className="g-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Currency</Form.Label>
                        <Form.Select
                          value={currency.code}
                          onChange={(e) => handleCurrencyChange(e.target.value)}
                          className="rounded-3 border-slate-200"
                        >
                          {AVAILABLE_CURRENCIES.map((curr) => (
                            <option key={curr.code} value={curr.code}>
                              {curr.code} - {curr.name} ({curr.symbol})
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-slate-500">
                          Select your primary business currency
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Currency Preview</Form.Label>
                        <div className="rounded-3 border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm text-slate-600">Sample amount:</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-900">
                            {currency.position === 'before'
                              ? `${currency.symbol}1,234.56`
                              : `1,234.56${currency.symbol}`}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Code: {currency.code} | Decimal places: {currency.decimalPlaces}
                          </div>
                        </div>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Date Format</Form.Label>
                        <Form.Select
                          value={settings.regional.dateFormat}
                          onChange={(e) =>
                            dispatch(
                              setRegionalSettings({
                                dateFormat: e.target.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
                              }),
                            )
                          }
                          className="rounded-3 border-slate-200"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Time Format</Form.Label>
                        <Form.Select
                          value={settings.regional.timeFormat}
                          onChange={(e) =>
                            dispatch(setRegionalSettings({ timeFormat: e.target.value as '12h' | '24h' }))
                          }
                          className="rounded-3 border-slate-200"
                        >
                          <option value="12h">12-hour (2:30 PM)</option>
                          <option value="24h">24-hour (14:30)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </div>
            </Tab.Pane>

            {/* Appearance Settings */}
            <Tab.Pane eventKey="appearance">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Visual Appearance</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Customize the look and feel of your workspace with themes and color schemes.
                  </p>
                </div>

                <Form>
                  <div className="space-y-6">
                    {/* Theme Preset */}
                    <div>
                      <Form.Label className="fw-semibold">Color Theme</Form.Label>
                      <p className="mb-3 text-sm text-slate-600">Choose a color theme for your workspace</p>
                      <Row className="g-3">
                        {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((preset) => {
                          const colors = THEME_PRESETS[preset]
                          const isActive = settings.appearance.themePreset === preset
                          return (
                            <Col key={preset} md={6} lg={4}>
                              <button
                                type="button"
                                className={`w-100 rounded-3 border p-4 text-start transition-all ${
                                  isActive
                                    ? 'border-2 border-primary shadow-md'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                                onClick={() => handleThemeChange(preset)}
                              >
                                <div className="mb-3 flex gap-2">
                                  <div
                                    className="h-10 w-10 rounded-2"
                                    style={{ backgroundColor: colors.primary }}
                                  ></div>
                                  <div
                                    className="h-10 w-10 rounded-2"
                                    style={{ backgroundColor: colors.secondary }}
                                  ></div>
                                  <div
                                    className="h-10 w-10 rounded-2"
                                    style={{ backgroundColor: colors.accent }}
                                  ></div>
                                </div>
                                <div className="fw-semibold text-slate-900">
                                  {preset
                                    .split('-')
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(' ')}
                                </div>
                                {isActive && (
                                  <Badge bg="primary" className="mt-2">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Active
                                  </Badge>
                                )}
                              </button>
                            </Col>
                          )
                        })}
                      </Row>
                    </div>

                    {/* Color Scheme */}
                    <div>
                      <Form.Label className="fw-semibold">Color Scheme</Form.Label>
                      <div className="d-flex gap-3">
                        {(['light', 'dark', 'auto'] as const).map((scheme) => (
                          <Button
                            key={scheme}
                            variant={settings.appearance.colorScheme === scheme ? 'primary' : 'outline-secondary'}
                            className="rounded-pill"
                            onClick={() => handleColorSchemeChange(scheme)}
                          >
                            <i
                              className={`bi ${
                                scheme === 'light'
                                  ? 'bi-sun'
                                  : scheme === 'dark'
                                    ? 'bi-moon'
                                    : 'bi-circle-half'
                              } me-2`}
                            ></i>
                            {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <Form.Label className="fw-semibold">Font Size</Form.Label>
                      <div className="d-flex gap-3">
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <Button
                            key={size}
                            variant={settings.appearance.fontSize === size ? 'primary' : 'outline-secondary'}
                            className="rounded-pill"
                            onClick={() => handleFontSizeChange(size)}
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="space-y-3">
                      <Form.Check
                        type="switch"
                        id="compact-mode"
                        label="Compact mode (reduce spacing)"
                        checked={settings.appearance.compactMode}
                        onChange={(e) => dispatch(setAppearanceSettings({ compactMode: e.target.checked }))}
                      />
                      <Form.Check
                        type="switch"
                        id="animations"
                        label="Enable animations"
                        checked={settings.appearance.animationsEnabled}
                        onChange={(e) => dispatch(setAppearanceSettings({ animationsEnabled: e.target.checked }))}
                      />
                      <Form.Check
                        type="switch"
                        id="high-contrast"
                        label="High contrast mode"
                        checked={settings.appearance.highContrast}
                        onChange={(e) => dispatch(setAppearanceSettings({ highContrast: e.target.checked }))}
                      />
                    </div>
                  </div>
                </Form>
              </div>
            </Tab.Pane>

            {/* Notifications */}
            <Tab.Pane eventKey="notifications">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose how you want to be notified about important events
                  </p>
                </div>

                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  Notification settings will be available in the next update.
                </Alert>
              </div>
            </Tab.Pane>

            {/* Receipt Settings */}
            <Tab.Pane eventKey="receipt">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Receipt Settings</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Configure how receipts are printed and displayed
                  </p>
                </div>

                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  Receipt customization will be available in the next update.
                </Alert>
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>
    </div>
  )
}

export default SettingsPage
