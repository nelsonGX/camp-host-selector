'use client';

import React, { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiRotateCcw, FiPlus, FiX, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, handleAPIError } from '../../../lib/api';

interface TimeSlot {
  id: number;
  name: string;
  time: string;
}

interface SystemSettings {
  max_capacity_per_lecturer: number;
  system_name?: string;
  description?: string;
  allow_same_lecturer_both_slots: boolean;
}

interface SystemConfig {
  lecturers: string[];
  time_slots: TimeSlot[];
  settings: SystemSettings;
}

const SystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getConfig();
      if (response.success) {
        setConfig(response.data);
        setOriginalConfig(JSON.parse(JSON.stringify(response.data)));
      }
    } catch (error) {
      toast.error(handleAPIError(error, '獲取系統配置失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await adminAPI.updateConfig(config);
      if (response.success) {
        toast.success(response.message);
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
      }
    } catch (error) {
      toast.error(handleAPIError(error, '更新系統配置失敗'));
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.reloadConfig();
      if (response.success) {
        toast.success(response.message);
        // 重新獲取配置
        await fetchConfig();
      }
    } catch (error) {
      toast.error(handleAPIError(error, '重新載入配置失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
      toast.success('已重置為原始配置');
    }
  };

  const addLecturer = () => {
    if (!config) return;
    setConfig(prev => prev ? {
      ...prev,
      lecturers: [...prev.lecturers, '新講師']
    } : null);
  };

  const updateLecturer = (index: number, value: string) => {
    if (!config) return;
    setConfig(prev => prev ? {
      ...prev,
      lecturers: prev.lecturers.map((lecturer, i) => i === index ? value : lecturer)
    } : null);
  };

  const removeLecturer = (index: number) => {
    if (!config) return;
    if (config.lecturers.length <= 1) {
      toast.error('至少需要一位講師');
      return;
    }
    setConfig(prev => prev ? {
      ...prev,
      lecturers: prev.lecturers.filter((_, i) => i !== index)
    } : null);
  };

  const addTimeSlot = () => {
    if (!config) return;
    const newId = Math.max(...config.time_slots.map(slot => slot.id)) + 1;
    setConfig(prev => prev ? {
      ...prev,
      time_slots: [...prev.time_slots, {
        id: newId,
        name: `第${newId}時段`,
        time: '00:00-00:00'
      }]
    } : null);
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    if (!config) return;
    setConfig(prev => prev ? {
      ...prev,
      time_slots: prev.time_slots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    } : null);
  };

  const removeTimeSlot = (index: number) => {
    if (!config) return;
    if (config.time_slots.length <= 1) {
      toast.error('至少需要一個時段');
      return;
    }
    setConfig(prev => prev ? {
      ...prev,
      time_slots: prev.time_slots.filter((_, i) => i !== index)
    } : null);
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (!config) return;
    setConfig(prev => prev ? {
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    } : null);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <FiSettings className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">載入系統配置中...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">無法載入系統配置</p>
        </div>
      </div>
    );
  }

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiSettings className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">系統配置</h1>
                  <p className="text-sm text-gray-600">管理講師列表、時段設置和系統參數</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReload}
                  disabled={loading}
                  className="btn btn-outline"
                >
                  <FiRefreshCw className="h-4 w-4 mr-2" />
                  重新載入
                </button>
                {hasChanges && (
                  <button
                    onClick={handleReset}
                    className="btn btn-outline"
                  >
                    <FiRotateCcw className="h-4 w-4 mr-2" />
                    重置
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <>
                      <FiSettings className="h-4 w-4 mr-2 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <FiSave className="h-4 w-4 mr-2" />
                      儲存配置
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center">
                <FiSettings className="h-4 w-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  配置已修改，請記得儲存。配置將會立即生效。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 講師列表 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiUser className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">講師列表</h2>
              </div>
              <button
                onClick={addLecturer}
                className="btn btn-outline btn-sm"
              >
                <FiPlus className="h-4 w-4 mr-1" />
                新增講師
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.lecturers.map((lecturer, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={lecturer}
                    onChange={(e) => updateLecturer(index, e.target.value)}
                    className="input flex-1"
                    placeholder="講師姓名"
                  />
                  {config.lecturers.length > 1 && (
                    <button
                      onClick={() => removeLecturer(index)}
                      className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 時段設置 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiClock className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">時段設置</h2>
              </div>
              <button
                onClick={addTimeSlot}
                className="btn btn-outline btn-sm"
              >
                <FiPlus className="h-4 w-4 mr-1" />
                新增時段
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {config.time_slots.map((slot, index) => (
                <div key={slot.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      時段名稱
                    </label>
                    <input
                      type="text"
                      value={slot.name}
                      onChange={(e) => updateTimeSlot(index, 'name', e.target.value)}
                      className="input"
                      placeholder="時段名稱"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      時間
                    </label>
                    <input
                      type="text"
                      value={slot.time}
                      onChange={(e) => updateTimeSlot(index, 'time', e.target.value)}
                      className="input"
                      placeholder="HH:MM-HH:MM"
                    />
                  </div>
                  <div className="flex items-end">
                    {config.time_slots.length > 1 && (
                      <button
                        onClick={() => removeTimeSlot(index)}
                        className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                      >
                        <FiX className="h-4 w-4 mr-1" />
                        刪除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 系統設定 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">系統設定</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每位講師最大容量
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.settings.max_capacity_per_lecturer}
                  onChange={(e) => updateSetting('max_capacity_per_lecturer', parseInt(e.target.value))}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">
                  每個時段每位講師最多可分配的學員數量
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系統名稱
                </label>
                <input
                  type="text"
                  value={config.settings.system_name || ''}
                  onChange={(e) => updateSetting('system_name', e.target.value)}
                  className="input"
                  placeholder="系統名稱"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系統描述
                </label>
                <textarea
                  value={config.settings.description || ''}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="系統描述"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!config.settings.allow_same_lecturer_both_slots}
                    onChange={(e) => updateSetting('allow_same_lecturer_both_slots', !e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    確保學員在兩個時段選到不同講師
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;