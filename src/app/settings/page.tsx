'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LCDDisplay } from '@/components/LCDDisplay';
import type { AppSettings } from '@/types/plan';
import { DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Settings.css';
import '@/app/today/Today.css'; // Reuse Today styles

const MODULE = 'SettingsPage';

function getSettings(): AppSettings {
    if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS;
    }
    const saved = localStorage.getItem('pdca-settings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            // ignore
        }
    }
    return DEFAULT_SETTINGS;
}

function saveSettingsLocal(settings: AppSettings): void {
    localStorage.setItem('pdca-settings', JSON.stringify(settings));
}

function getFormattedDate(d: Date = new Date()) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = days[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return { dayName, dateStr: `${month}/${day}` };
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dateInfo, setDateInfo] = useState({ dayName: '', dateStr: '' });

    useEffect(() => {
        setDateInfo(getFormattedDate());
        logger.info(MODULE, '加载设置');
        const loaded = getSettings();
        setSettings(loaded);
    }, []);

    const handleSave = async () => {
        logger.info(MODULE, '保存设置');
        setSaving(true);
        setMessage('');

        try {
            saveSettingsLocal(settings);
            bailianClient.updateSettings(settings);
            setMessage('✅ SETTINGS SAVED');
            logger.info(MODULE, '设置保存成功');
        } catch (error) {
            logger.error(MODULE, '保存设置失败', { error });
            setMessage('❌ SAVE FAILED');
        } finally {
            setSaving(false);
        }
    };

    const handleClearData = async () => {
        if (!confirm('CAUTION: ERASE ALL SYSTEM DATA?')) {
            return;
        }

        logger.warn(MODULE, '用户确认清空数据');
        try {
            // 导入空数据来清空
            await apiClient.importData({ logs: [], daily_plans: [] });
            setMessage('✅ SYSTEM CLEANED');
        } catch (error) {
            logger.error(MODULE, '清空数据失败', { error });
            setMessage('❌ WIPE FAILED');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        logger.info(MODULE, '导入文件', { name: file.name });
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await apiClient.importData(data);
            setMessage('✅ DATA IMPORTED');
        } catch (error) {
            logger.error(MODULE, '导入失败', { error });
            setMessage('❌ IMPORT ERROR');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleExport = async () => {
        logger.info(MODULE, '导出数据');
        try {
            const data = await apiClient.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pdca-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMessage('✅ DATA EXPORTED');
        } catch (error) {
            logger.error(MODULE, '导出失败', { error });
            setMessage('❌ EXPORT FAILED');
        }
    };

    const handleExportLogs = () => {
        const logs = logger.exportLogs();
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdca-debug-${new Date().toISOString().split('T')[0]}.log`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage('✅ LOGS EXPORTED');
    };

    const handleClearCache = async () => {
        if (!confirm('RESET SYSTEM CACHE AND RELOAD?')) {
            return;
        }

        logger.info(MODULE, '用户请求清除缓存');
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }

            setMessage('✅ CACHE CLEARED. REBOOTING...');

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            logger.error(MODULE, '清除缓存失败', { error });
            setMessage('❌ RESET FAILED');
        }
    };

    const SectionHeader = ({ title, icon }: any) => (
        <div className="te-section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '4px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', marginRight: '8px' }}>[{title}]</span>
            <div style={{ flex: 1, height: '1px', background: '#ccc' }}></div>
        </div>
    );

    return (
        <div className="today-page">
            {/* Independent Sticky Navigation + LCD */}
            <div className="sticky-nav-container">
                <div className="te-nav-hardware">
                    <Link href="/today" className="te-nav-btn">TODAY</Link>
                    <Link href="/weekly" className="te-nav-btn">WEEK</Link>
                    <Link href="/history" className="te-nav-btn">LOGS</Link>
                    <Link href="/settings" className="te-nav-btn active">SETUP</Link>
                </div>

                <div className="te-lcd-section">
                    <LCDDisplay
                        value={dateInfo.dateStr}
                        subValue={dateInfo.dayName}
                        active={true}
                    />
                </div>
            </div>

            <header className="page-header">
                <div className="te-header-wrapper">
                    <div className="te-brand-row">
                        <div className="te-brand-col">
                            <h1 className="te-brand-title">SYSTEM CONFIG</h1>
                        </div>
                        <div className="te-brand-info">
                            <div className="te-sync-hardware">
                                <span className="te-sync-label">SYNC</span>
                                <div className="te-sync-diagram">
                                    <div className="node-top"></div>
                                    <div className="conn-vertical"></div>
                                    <div className="node-row">
                                        <div className="node"></div>
                                        <div className="node"></div>
                                        <div className="node"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="cards-container">
                <div className="te-side-labels-left">
                    <div className="side-label-item">
                        <span className="side-label-text">CONFIG</span>
                        <div className="side-label-arrow-down"></div>
                    </div>
                </div>
                <div className="te-side-labels-right">
                    <div className="side-label-item">
                        <span className="side-label-text">SYS</span>
                    </div>
                </div>

                {message && (
                    <div className={`status-toast ${message.includes('❌') ? 'error' : 'done'}`} style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginBottom: '12px', width: '100%', textAlign: 'center' }}>
                        <span className="blink-dot">●</span> {message}
                    </div>
                )}

                {/* API Settings Card */}
                <div className="te-card-module" style={{ background: '#e8e8e8', border: '1px solid #c0c0c0', borderRadius: '6px', padding: '16px', marginBottom: '16px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
                    <SectionHeader title="API CONNECTION" />

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: '#666', marginBottom: '4px' }}>API KEY</label>
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                            placeholder="sk-..."
                            style={{ width: '100%', padding: '8px', border: '1px solid #bbb', borderRadius: '4px', background: '#f0f0f0', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: '#666', marginBottom: '4px' }}>BASE URL</label>
                        <input
                            type="text"
                            value={settings.baseUrl}
                            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                            placeholder="https://..."
                            style={{ width: '100%', padding: '8px', border: '1px solid #bbb', borderRadius: '4px', background: '#f0f0f0', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: '#666', marginBottom: '4px' }}>MODEL ID</label>
                        <input
                            type="text"
                            value={settings.llmModel}
                            onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                            style={{ width: '100%', padding: '8px', border: '1px solid #bbb', borderRadius: '4px', background: '#f0f0f0', fontFamily: 'monospace' }}
                        />
                    </div>

                    <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '10px', background: '#ff6b00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
                    </button>
                </div>

                {/* Data Management Card */}
                <div className="te-card-module" style={{ background: '#e8e8e8', border: '1px solid #c0c0c0', borderRadius: '6px', padding: '16px', marginBottom: '16px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
                    <SectionHeader title="DATA STORAGE" />

                    <div className="btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-secondary" onClick={handleExport} style={{ flex: 1, padding: '8px', background: '#ccc', border: '1px solid #999', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                                EXPORT JSON
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={handleImport}
                            />
                            <button
                                className="btn-secondary"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ flex: 1, padding: '8px', background: '#ccc', border: '1px solid #999', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}
                            >
                                IMPORT JSON
                            </button>
                        </div>
                        <button className="btn-danger" onClick={handleClearData} style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                            ERASE ALL DATA
                        </button>
                    </div>
                </div>

                {/* Maintenance Card */}
                <div className="te-card-module" style={{ background: '#e8e8e8', border: '1px solid #c0c0c0', borderRadius: '6px', padding: '16px', marginBottom: '16px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
                    <SectionHeader title="MAINTENANCE" />
                    <div className="btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className="btn-secondary" onClick={handleExportLogs} style={{ width: '100%', padding: '8px', background: '#ccc', border: '1px solid #999', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                            EXPORT DEBUG LOGS
                        </button>
                        <button className="btn-warning" onClick={handleClearCache} style={{ width: '100%', padding: '8px', background: '#fff', border: '2px dashed #ff3b3b', color: '#ff3b3b', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                            RESET SYSTEM CACHE
                        </button>
                    </div>
                </div>

            </div>

            <footer className="te-hardware-footer">
                <div className="te-brand-stamp">
                    <span>#E0E0E0</span>
                    <strong>PLASTIC</strong>
                </div>

                <div className="te-power-hardware">
                    <span className="te-power-label">POWER</span>
                    <div className="te-power-switch">
                        <div className="switch-led"></div>
                        <div className="switch-slider"></div>
                    </div>
                </div>

                <div className="te-audio-labels">
                    <div className="label-item">
                        <span>AUDIO OUT</span>
                        <div className="te-arrow-down-hardware"></div>
                    </div>
                    <div className="label-item">
                        <span>HEADPHONE</span>
                        <div className="te-icon-headphone-hardware">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
