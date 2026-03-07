import React, { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    rent_due_day: 5,
    late_fee_percentage: 5,
    notice_period_days: 30,
    refund_policy: '',
    rental_agreement_template: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsApi.get();
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update({
        ...settings,
        rent_due_day: parseInt(settings.rent_due_day),
        late_fee_percentage: parseFloat(settings.late_fee_percentage),
        notice_period_days: parseInt(settings.notice_period_days),
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn" data-testid="settings-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your PG management settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>
              Configure rent collection and late fee settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent_due_day">Rent Due Day</Label>
                <Input
                  id="rent_due_day"
                  type="number"
                  min={1}
                  max={28}
                  value={settings.rent_due_day}
                  onChange={(e) => setSettings({ ...settings, rent_due_day: e.target.value })}
                  data-testid="rent-due-day-input"
                />
                <p className="text-xs text-slate-500">Day of month when rent is due</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="late_fee">Late Fee (%)</Label>
                <Input
                  id="late_fee"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settings.late_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, late_fee_percentage: e.target.value })}
                  data-testid="late-fee-input"
                />
                <p className="text-xs text-slate-500">Applied on overdue payments</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice_period">Notice Period (days)</Label>
                <Input
                  id="notice_period"
                  type="number"
                  min={1}
                  value={settings.notice_period_days}
                  onChange={(e) => setSettings({ ...settings, notice_period_days: e.target.value })}
                  data-testid="notice-period-input"
                />
                <p className="text-xs text-slate-500">Required notice before checkout</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Policy</CardTitle>
            <CardDescription>
              Define your security deposit refund policy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={settings.refund_policy}
              onChange={(e) => setSettings({ ...settings, refund_policy: e.target.value })}
              placeholder="Enter your refund policy details..."
              rows={4}
              data-testid="refund-policy-input"
            />
          </CardContent>
        </Card>

        {/* Rental Agreement Template */}
        <Card>
          <CardHeader>
            <CardTitle>Rental Agreement Template</CardTitle>
            <CardDescription>
              Upload or paste your rental agreement template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={settings.rental_agreement_template || ''}
              onChange={(e) => setSettings({ ...settings, rental_agreement_template: e.target.value })}
              placeholder="Paste your rental agreement template here..."
              rows={8}
              className="font-mono text-sm"
              data-testid="rental-agreement-input"
            />
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your admin account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">App Version</span>
                <span className="text-sm font-medium">PG Manager Pro v1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Support</span>
                <a href="mailto:support@pgmanager.com" className="text-sm text-blue-600 hover:underline">
                  support@pgmanager.com
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
