import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiArrowUp, FiArrowDown, FiSave, FiSend, FiLoader, FiLogOut, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { studentAPI, handleAPIError } from '../services/api';

const StudentPreferences = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 從 localStorage 獲取學員資料
  useEffect(() => {
    const storedData = localStorage.getItem('student_data');
    if (storedData) {
      const data = JSON.parse(storedData);
      setStudentData(data);
      
      // 如果已提交，重定向到結果頁面
      if (data.is_submitted) {
        navigate('/student/result');
        return;
      }
      
      // 設定已儲存的志願序
      if (data.preferences && data.preferences.length > 0) {
        setPreferences(data.preferences);
      }
    } else {
      // 沒有學員資料，重定向到登入頁面
      navigate('/student/login');
      return;
    }

    // 獲取系統資訊
    fetchSystemInfo();
  }, [navigate]);

  const fetchSystemInfo = async () => {
    try {
      const response = await studentAPI.getSystemInfo();
      if (response.success) {
        setSystemInfo(response.data);
        
        // 如果還沒有志願序，初始化為講師列表
        if (preferences.length === 0) {
          setPreferences(response.data.lecturers);
        }
      }
    } catch (error) {
      toast.error(handleAPIError(error, '獲取系統資訊失敗'));
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newPreferences = [...preferences];
    [newPreferences[index], newPreferences[index - 1]] = [newPreferences[index - 1], newPreferences[index]];
    setPreferences(newPreferences);
  };

  const moveDown = (index) => {
    if (index === preferences.length - 1) return;
    const newPreferences = [...preferences];
    [newPreferences[index], newPreferences[index + 1]] = [newPreferences[index + 1], newPreferences[index]];
    setPreferences(newPreferences);
  };

  const handleSave = async () => {
    if (!studentData) return;

    setSaveLoading(true);
    try {
      const response = await studentAPI.updatePreferences(
        studentData.student_id,
        preferences
      );
      
      if (response.success) {
        toast.success('志願序已儲存');
        
        // 更新 localStorage 中的資料
        const updatedData = {
          ...studentData,
          preferences
        };
        localStorage.setItem('student_data', JSON.stringify(updatedData));
        setStudentData(updatedData);
      }
    } catch (error) {
      toast.error(handleAPIError(error, '儲存失敗'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!studentData) return;

    // 確認是否要提交
    if (!window.confirm('確定要提交志願序嗎？提交後將無法修改。')) {
      return;
    }

    setLoading(true);
    try {
      // 先儲存志願序
      await studentAPI.updatePreferences(
        studentData.student_id,
        preferences
      );

      // 然後提交
      const response = await studentAPI.submitPreferences(studentData.student_id);
      
      if (response.success) {
        toast.success('志願序提交成功！');
        
        // 更新 localStorage
        const updatedData = {
          ...studentData,
          is_submitted: true,
          submitted_at: response.data.submitted_at,
          preferences
        };
        localStorage.setItem('student_data', JSON.stringify(updatedData));
        
        // 重定向到結果頁面
        navigate('/student/result');
      }
    } catch (error) {
      toast.error(handleAPIError(error, '提交失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_data');
    navigate('/student/login');
  };

  if (!studentData || !systemInfo) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <FiLoader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <FiUser className="h-5 w-5 text-primary-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">志願序填寫</h1>
                  <p className="text-sm text-gray-600">
                    學員：{studentData.name} ({studentData.student_id})
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
              >
                <FiLogOut className="h-4 w-4 mr-2" />
                登出
              </button>
            </div>
          </div>
          
          {/* 說明區域 */}
          <div className="px-6 py-4 bg-blue-50">
            <div className="flex">
              <FiInfo className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">填寫說明</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>請拖拽或使用上下箭頭調整講師的優先順序</li>
                    <li>第 1 順位是您最希望聽到的講師</li>
                    <li>系統會為您安排兩個時段，且確保不會重複聽同一位講師</li>
                    <li>每位講師每時段最多容納 13 位學員</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 志願序列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              講師志願序排列
            </h2>
            <p className="text-sm text-gray-600">
              使用箭頭按鈕調整順序，數字越小代表優先度越高
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {preferences.map((lecturer, index) => (
                <div
                  key={lecturer}
                  className={`
                    flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200
                    ${index === 0 ? 'border-yellow-300 bg-yellow-50' : 
                      index === 1 ? 'border-gray-300 bg-gray-50' :
                      index === 2 ? 'border-orange-300 bg-orange-50' :
                      'border-red-300 bg-red-50'}
                  `}
                >
                  <div className="flex items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${index === 0 ? 'bg-yellow-500 text-white' : 
                        index === 1 ? 'bg-gray-500 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-red-500 text-white'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {lecturer}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {index === 0 ? '第一志願' : 
                         index === 1 ? '第二志願' :
                         index === 2 ? '第三志願' : '第四志願'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <FiArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === preferences.length - 1}
                      className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <FiArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 時段資訊 */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">時段資訊</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemInfo.time_slots.map((slot) => (
                <div key={slot.id} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">{slot.name}</h3>
                  <p className="text-primary-600 font-medium">{slot.time}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    每位講師最多 {systemInfo.max_capacity} 人
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="btn btn-outline"
          >
            {saveLoading ? (
              <>
                <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <FiSave className="h-4 w-4 mr-2" />
                儲存志願序
              </>
            )}
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <FiSend className="h-4 w-4 mr-2" />
                確認提交
              </>
            )}
          </button>
        </div>

        {/* 返回連結 */}
        <div className="mt-8 text-center">
          <Link
            to="/student/login"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            返回登入頁面
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentPreferences; 