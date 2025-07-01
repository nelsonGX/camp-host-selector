import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiSettings, FiUsers, FiBarChart2, FiRefreshCw, FiTrash2, 
  FiRotateCcw, FiDownload, FiPlay, FiEye, FiLoader, FiAlertCircle,
  FiCheckCircle, FiClock, FiUser, FiLogOut, FiShield
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI, allocationAPI, authAPI, handleAPIError, downloadFile } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsResponse, statsResponse] = await Promise.all([
        adminAPI.getStudents(),
        adminAPI.getStats()
      ]);

      if (studentsResponse.success) {
        setStudents(studentsResponse.data.students);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      toast.error(handleAPIError(error, '獲取資料失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetStudent = async (studentId, studentName) => {
    if (!window.confirm(`確定要重置學員 ${studentName} 的志願序嗎？`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [`reset_${studentId}`]: true }));
    try {
      const response = await adminAPI.resetStudent(studentId);
      if (response.success) {
        toast.success(response.message);
        fetchData();
      }
    } catch (error) {
      toast.error(handleAPIError(error, '重置失敗'));
    } finally {
      setActionLoading(prev => ({ ...prev, [`reset_${studentId}`]: false }));
    }
  };

  const handleResetAllPreferences = async () => {
    if (!window.confirm('確定要重置所有學員的志願序嗎？此操作不可復原。')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, resetAll: true }));
    try {
      const response = await adminAPI.resetAllPreferences();
      if (response.success) {
        toast.success(response.message);
        fetchData();
      }
    } catch (error) {
      toast.error(handleAPIError(error, '重置失敗'));
    } finally {
      setActionLoading(prev => ({ ...prev, resetAll: false }));
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('確定要清除所有資料嗎？此操作不可復原，包括學員資料、志願序和分配結果。')) {
      return;
    }

    const confirmText = prompt('請輸入 "CLEAR ALL" 確認清除所有資料：');
    if (confirmText !== 'CLEAR ALL') {
      toast.error('確認文字不正確');
      return;
    }

    setActionLoading(prev => ({ ...prev, clearAll: true }));
    try {
      const response = await adminAPI.clearAll();
      if (response.success) {
        toast.success(response.message);
        fetchData();
      }
    } catch (error) {
      toast.error(handleAPIError(error, '清除失敗'));
    } finally {
      setActionLoading(prev => ({ ...prev, clearAll: false }));
    }
  };

  const handleGenerateAllocation = async () => {
    if (!window.confirm('確定要生成分配結果嗎？這將清除之前的分配結果。')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, generate: true }));
    try {
      const response = await allocationAPI.generateAllocation();
      if (response.success) {
        toast.success(response.message);
        fetchData();
      }
    } catch (error) {
      toast.error(handleAPIError(error, '生成分配失敗'));
    } finally {
      setActionLoading(prev => ({ ...prev, generate: false }));
    }
  };

  const handleExportCSV = async () => {
    setActionLoading(prev => ({ ...prev, export: true }));
    try {
      const response = await allocationAPI.exportCSV();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      downloadFile(response.data, `講師分配結果_${timestamp}.csv`);
      toast.success('CSV 文件已下載');
    } catch (error) {
      toast.error(handleAPIError(error, '匯出失敗'));
    } finally {
      setActionLoading(prev => ({ ...prev, export: false }));
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('確定要登出管理員系統嗎？')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, logout: true }));
    try {
      await authAPI.adminLogout();
      
      // 清除本地認證資訊
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_session');
      
      toast.success('已安全登出');
      
      // 重導到登入頁面
      navigate('/admin/login');
    } catch (error) {
      // 即使登出 API 失敗，也要清除本地資訊
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_session');
      toast.error(handleAPIError(error, '登出時發生錯誤，但已清除本地認證'));
      navigate('/admin/login');
    } finally {
      setActionLoading(prev => ({ ...prev, logout: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubmissionStatus = (student) => {
    if (student.is_submitted) {
      return (
        <div className="flex items-center text-success-600">
          <FiCheckCircle className="h-4 w-4 mr-1" />
          <span className="text-sm">已提交</span>
        </div>
      );
    } else if (student.preferences && student.preferences.length > 0) {
      return (
        <div className="flex items-center text-warning-600">
          <FiClock className="h-4 w-4 mr-1" />
          <span className="text-sm">已填寫</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-400">
          <FiUser className="h-4 w-4 mr-1" />
          <span className="text-sm">未填寫</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">載入管理員數據中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <FiShield className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <h1 className="text-3xl font-bold text-gray-900">管理員儀表板</h1>
                <div className="flex items-center space-x-4">
                  <p className="text-gray-600">管理學員志願序與分配結果</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FiShield className="w-3 h-3 mr-1" />
                    已認證
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                className="btn btn-outline"
                disabled={loading}
              >
                <FiRefreshCw className="h-4 w-4 mr-2" />
                重新整理
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-danger"
                disabled={actionLoading.logout}
              >
                {actionLoading.logout ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    登出中...
                  </>
                ) : (
                  <>
                    <FiLogOut className="h-4 w-4 mr-2" />
                    安全登出
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiUsers className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">總學員數</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.students.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiCheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已提交</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.students.submitted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FiClock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">待提交</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.students.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiBarChart2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已分配</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.students.allocated}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按鈕區域 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">快速操作</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleGenerateAllocation}
                disabled={actionLoading.generate || students.filter(s => s.is_submitted).length === 0}
                className="btn btn-success w-full"
              >
                {actionLoading.generate ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <FiPlay className="h-4 w-4 mr-2" />
                    生成分配
                  </>
                )}
              </button>

              <Link to="/admin/results" className="btn btn-primary w-full">
                <FiEye className="h-4 w-4 mr-2" />
                查看結果
              </Link>

              <Link to="/admin/config" className="btn btn-outline w-full">
                <FiSettings className="h-4 w-4 mr-2" />
                系統配置
              </Link>

              <button
                onClick={handleExportCSV}
                disabled={actionLoading.export}
                className="btn btn-outline w-full"
              >
                {actionLoading.export ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    匯出中...
                  </>
                ) : (
                  <>
                    <FiDownload className="h-4 w-4 mr-2" />
                    匯出 CSV
                  </>
                )}
              </button>

              <button
                onClick={handleResetAllPreferences}
                disabled={actionLoading.resetAll}
                className="btn btn-warning w-full"
              >
                {actionLoading.resetAll ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    重置中...
                  </>
                ) : (
                  <>
                    <FiRotateCcw className="h-4 w-4 mr-2" />
                    重置志願序
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleClearAll}
                disabled={actionLoading.clearAll}
                className="btn btn-danger"
              >
                {actionLoading.clearAll ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    清除中...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="h-4 w-4 mr-2" />
                    清除所有資料
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                <FiAlertCircle className="h-4 w-4 inline mr-1" />
                清除所有資料將刪除學員資料、志願序和分配結果，此操作不可復原
              </p>
            </div>
          </div>
        </div>

        {/* 學員列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">學員列表</h2>
            <p className="text-sm text-gray-600">
              共 {students.length} 位學員，{students.filter(s => s.is_submitted).length} 位已提交志願序
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    學員資訊
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    志願序
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提交時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSubmissionStatus(student)}
                    </td>
                    <td className="px-6 py-4">
                      {student.preferences && student.preferences.length > 0 ? (
                        <div className="text-sm">
                          {student.preferences.map((lecturer, index) => (
                            <span key={index} className="inline-block mr-2 mb-1">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {index + 1}. {lecturer}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">未填寫</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(student.submitted_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleResetStudent(student.student_id, student.name)}
                        disabled={actionLoading[`reset_${student.student_id}`]}
                        className="text-sm text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {actionLoading[`reset_${student.student_id}`] ? (
                          <FiLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          '重置'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {students.length === 0 && (
              <div className="text-center py-12">
                <FiUsers className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  尚無學員資料
                </h3>
                <p className="text-gray-600">
                  等待學員登入並填寫志願序
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 