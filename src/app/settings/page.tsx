'use client';

import { useState, useEffect, useRef } from 'react';
import type { AppSettings } from '@/types/plan';
import { DEFAULT_SETTINGS } from '@/types/plan';
import * as apiClient from '@/lib/apiClient';
import bailianClient from '@/lib/bailianClient';
import logger from '@/lib/logger';
import './Settings.css';

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

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
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
            setMessage('✅ 设置已保存');
            logger.info(MODULE, '设置保存成功');
        } catch (error) {
            logger.error(MODULE, '保存设置失败', { error });
            setMessage('❌ 保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleClearData = async () => {
        if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            return;
        }

        logger.warn(MODULE, '用户确认清空数据');
        try {
            // 导入空数据来清空
            await apiClient.importData({ logs: [], daily_plans: [] });
            setMessage('✅ 数据已清空');
        } catch (error) {
            logger.error(MODULE, '清空数据失败', { error });
            setMessage('❌ 清空失败');
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
            setMessage('✅ 数据导入成功');
        } catch (error) {
            logger.error(MODULE, '导入失败', { error });
            setMessage('❌ 导入失败，请检查文件格式');
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
            setMessage('✅ 数据已导出');
        } catch (error) {
            logger.error(MODULE, '导出失败', { error });
            setMessage('❌ 导出失败');
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
        setMessage('✅ 调试日志已导出');
    };

    return (
        <div className="settings-page">
            <header className="page-header">
                <h1 className="page-title">设置</h1>
            </header>

            {message && (
                <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            <section className="settings-section">
                <h2 className="section-title">🔑 API 配置</h2>

                <div className="form-group">
                    <label>API Key</label>
                    <input
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                        placeholder="sk-..."
                    />
                </div>

                <div className="form-group">
                    <label>Base URL</label>
                    <input
                        type="text"
                        value={settings.baseUrl}
                        onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                        placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                    />
                </div>

                <div className="form-group">
                    <label>ASR 模型</label>
                    <input
                        type="text"
                        value={settings.asrModel}
                        onChange={(e) => setSettings({ ...settings, asrModel: e.target.value })}
                        placeholder="paraformer-realtime-v2"
                    />
                </div>

                <div className="form-group">
                    <label>LLM 模型</label>
                    <input
                        type="text"
                        value={settings.llmModel}
                        onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                        placeholder="qwen-plus"
                    />
                </div>

                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '保存设置'}
                </button>
            </section>

            <section className="settings-section">
                <h2 className="section-title">📦 数据管理</h2>

                <div className="btn-group">
                    <button className="btn-secondary" onClick={handleExport}>
                        导出 JSON
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
                    >
                        导入 JSON
                    </button>
                    <button className="btn-danger" onClick={handleClearData}>
                        清空所有数据
                    </button>
                </div>
            </section>

            <section className="settings-section">
                <h2 className="section-title">🔧 调试</h2>
                <button className="btn-secondary" onClick={handleExportLogs}>
                    导出调试日志
                </button>
                <p className="hint">调试日志包含应用运行时的详细信息，可用于排查问题。</p>
            </section>
        </div>
    );
}
