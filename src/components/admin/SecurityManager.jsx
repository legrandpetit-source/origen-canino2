import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Users, 
  KeyRound, 
  History, 
  Send, 
  UserPlus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  RefreshCw, 
  Lock, 
  Eye, 
  EyeOff, 
  Activity, 
  Globe
} from 'lucide-react';

const SecurityManager = ({ fetchWithAuth }) => {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users', 'password', 'activity', 'telegram'
  const [overview, setOverview] = useState({
    current_user: '',
    total_admins: 1,
    activity_24h: 0,
    telegram: {
      active: true,
      bot_username: '@OrigenCanino_bot',
      masked_token: '',
      chat_id: ''
    }
  });

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Notifications / feedback
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // User management modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '' });
  const [savingNewUser, setSavingNewUser] = useState(false);

  const [editingUser, setEditingUser] = useState(null); // { id, email, password: '' }
  const [savingEditUser, setSavingEditUser] = useState(false);

  const [testingTelegram, setTestingTelegram] = useState(false);

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resOverview, resUsers, resLogs] = await Promise.all([
        fetchWithAuth('/api/admin/security/overview'),
        fetchWithAuth('/api/admin/security/users'),
        fetchWithAuth('/api/admin/security/logs')
      ]);

      if (resOverview.ok) {
        setOverview(await resOverview.json());
      }
      if (resUsers.ok) {
        setUsers(await resUsers.json());
      }
      if (resLogs.ok) {
        setLogs(await resLogs.json());
      }
    } catch (err) {
      console.error("Error loading security data:", err);
      notify('error', 'Error al sincronizar datos de seguridad.');
    } finally {
      setLoading(false);
    }
  };

  const refreshLogsOnly = async () => {
    setRefreshingLogs(true);
    try {
      const res = await fetchWithAuth('/api/admin/security/logs');
      if (res.ok) {
        setLogs(await res.json());
        notify('success', 'Registro de auditoría actualizado.');
      }
    } catch (err) {
      notify('error', 'Error al actualizar el registro.');
    } finally {
      setRefreshingLogs(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle change personal password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      notify('error', 'La nueva contraseña y la confirmación no coinciden.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      notify('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetchWithAuth('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        })
      });

      const data = await res.json();
      if (res.ok) {
        notify('success', 'Contraseña actualizada exitosamente. Se envió notificación por Telegram.');
        setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
        loadAllData();
      } else {
        notify('error', data.detail || 'Error al actualizar contraseña.');
      }
    } catch (err) {
      notify('error', 'Fallo de conexión al cambiar contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle create new admin
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUserForm.password.length < 6) {
      notify('error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSavingNewUser(true);
    try {
      const res = await fetchWithAuth('/api/admin/security/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });

      const data = await res.json();
      if (res.ok) {
        notify('success', `Administrador ${newUserForm.email} creado con éxito.`);
        setNewUserForm({ email: '', password: '' });
        setIsAddUserOpen(false);
        loadAllData();
      } else {
        notify('error', data.detail || 'Error al crear administrador.');
      }
    } catch (err) {
      notify('error', 'Error en el servidor al crear usuario.');
    } finally {
      setSavingNewUser(false);
    }
  };

  // Handle edit admin
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEditUser(true);
    try {
      const res = await fetchWithAuth(`/api/admin/security/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingUser.email,
          password: editingUser.password || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        notify('success', 'Usuario administrador actualizado correctamente.');
        setEditingUser(null);
        loadAllData();
      } else {
        notify('error', data.detail || 'Error al actualizar usuario.');
      }
    } catch (err) {
      notify('error', 'Error de conexión al actualizar usuario.');
    } finally {
      setSavingEditUser(false);
    }
  };

  // Handle delete admin
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el acceso de "${user.email}"?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/admin/security/users/${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', `Usuario ${user.email} eliminado del sistema.`);
        loadAllData();
      } else {
        notify('error', data.detail || 'No se pudo eliminar el usuario.');
      }
    } catch (err) {
      notify('error', 'Error al procesar la eliminación.');
    }
  };

  // Handle test Telegram alert
  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      const res = await fetchWithAuth('/api/admin/security/telegram-test', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', '¡Alerta de prueba enviada a tu Telegram! Revisa @OrigenCanino_bot.');
      } else {
        notify('error', data.detail || 'Error al enviar alerta a Telegram.');
      }
    } catch (err) {
      notify('error', 'Error al conectar con la API de Telegram.');
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-green/10 text-primary-green rounded-xl">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="font-header text-2xl text-secondary-brown">Centro de Seguridad & Accesos</h3>
              <p className="text-gray-500 text-sm">Gestiona usuarios administradores, contraseñas, auditoría 2FA y alertas en tiempo real.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadAllData} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Global Alerts / Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
          feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={20} className="text-green-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sesión Actual</p>
            <p className="font-bold text-gray-800 text-sm truncate max-w-[180px]" title={overview.current_user}>
              {overview.current_user || 'Cargando...'}
            </p>
            <span className="inline-block px-2 py-0.5 mt-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full">
              Super Admin
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Administradores</p>
            <p className="font-bold text-gray-800 text-2xl">{overview.total_admins}</p>
            <p className="text-xs text-gray-400">Cuentas activas con 2FA</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Actividad (24h)</p>
            <p className="font-bold text-gray-800 text-2xl">{overview.activity_24h}</p>
            <p className="text-xs text-gray-400">Eventos de seguridad</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">2FA Telegram</p>
              <p className="font-bold text-emerald-700 text-sm">{overview.telegram?.bot_username || '@OrigenCanino_bot'}</p>
              <p className="text-[11px] text-gray-400">Chat ID: {overview.telegram?.chat_id || '1468481915'}</p>
            </div>
          </div>
          <button 
            onClick={handleTestTelegram} 
            disabled={testingTelegram}
            className="p-2 text-primary-green hover:bg-primary-green/10 rounded-lg transition"
            title="Enviar mensaje de prueba a Telegram"
          >
            <Send size={18} className={testingTelegram ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'users'
              ? 'border-primary-green text-primary-green'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={18} />
          Administradores ({users.length})
        </button>

        <button
          onClick={() => setActiveSubTab('password')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'password'
              ? 'border-primary-green text-primary-green'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <KeyRound size={18} />
          Cambiar Contraseña
        </button>

        <button
          onClick={() => setActiveSubTab('activity')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'activity'
              ? 'border-primary-green text-primary-green'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={18} />
          Registro de Auditoría ({logs.length})
        </button>
      </div>

      {/* --- TAB 1: USERS LIST --- */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-lg text-secondary-brown">Cuentas con Privilegios Administrativos</h4>
              <p className="text-sm text-gray-500">Todos los usuarios listados requieren código 2FA vía Telegram para ingresar.</p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-2 bg-primary-green text-white font-bold px-4 py-2.5 rounded-xl hover:bg-primary-green-dark transition text-sm shadow-sm"
            >
              <UserPlus size={18} />
              Agregar Administrador
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario / Email</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Fecha Creación</th>
                  <th className="py-3 px-4">Protección 2FA</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {users.map((u) => {
                  const isCurrent = u.email === overview.current_user;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-4 font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center font-bold text-xs">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span>{u.email}</span>
                          {isCurrent && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                          Administrador
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-500">
                        {u.created_at || 'Pre-configurado'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                          <CheckCircle size={14} />
                          Telegram Activo
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser({ id: u.id, email: u.email, password: '' })}
                            className="p-2 text-gray-400 hover:text-primary-green hover:bg-gray-100 rounded-lg transition"
                            title="Editar usuario o resetear clave"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={users.length <= 1}
                            className={`p-2 rounded-lg transition ${
                              users.length <= 1 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={users.length <= 1 ? "No puedes eliminar el único admin" : "Eliminar acceso"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: CHANGE PASSWORD --- */}
      {activeSubTab === 'password' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <h4 className="font-bold text-lg text-secondary-brown flex items-center gap-2">
              <KeyRound size={20} className="text-primary-green" />
              Actualizar Mi Contraseña
            </h4>
            <p className="text-sm text-gray-500">
              Modifica la contraseña de acceso para tu cuenta actual (<strong>{overview.current_user}</strong>).
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Actual</label>
              <div className="relative">
                <input
                  type={showOldPass ? "text" : "password"}
                  required
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  placeholder="Ingresa tu contraseña actual"
                  className="w-full border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-200 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordForm.new_password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className={`h-1.5 flex-1 rounded-full ${
                    passwordForm.new_password.length < 6 ? 'bg-red-400' :
                    passwordForm.new_password.length < 10 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {passwordForm.new_password.length < 6 ? 'Débil (mínimo 6)' :
                     passwordForm.new_password.length < 10 ? 'Media' : 'Segura'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder="Repite la nueva contraseña"
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full bg-primary-green text-white font-bold py-3.5 rounded-xl hover:bg-primary-green-dark transition shadow-md flex items-center justify-center gap-2"
              >
                {savingPassword ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Guardar Nueva Contraseña
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- TAB 3: AUDIT LOGS --- */}
      {activeSubTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="font-bold text-lg text-secondary-brown flex items-center gap-2">
                <History size={20} className="text-primary-green" />
                Registro de Auditoría & Actividad de Seguridad
              </h4>
              <p className="text-sm text-gray-500">Trazabilidad de cada inicio de sesión, generación de código 2FA y cambios críticos.</p>
            </div>
            <button
              onClick={refreshLogsOnly}
              disabled={refreshingLogs}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} className={refreshingLogs ? "animate-spin" : ""} />
              Refrescar Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Acción</th>
                  <th className="py-3 px-4">Detalle</th>
                  <th className="py-3 px-4">IP Origen</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      No hay registros de auditoría recientes.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isSuccess = log.status === 'success';
                    const isWarning = log.status === 'warning';
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {log.created_at}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {log.user_email}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate" title={log.details}>
                          {log.details || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                          {log.ip_address || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isSuccess ? 'bg-green-100 text-green-800' :
                            isWarning ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isSuccess ? 'Exitoso' : isWarning ? 'Alerta' : 'Info'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL: AGREGAR ADMINISTRADOR --- */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h4 className="font-header text-xl text-secondary-brown mb-2">Crear Nuevo Administrador</h4>
            <p className="text-sm text-gray-500 mb-4">El nuevo usuario tendrá acceso completo al panel y recibirá códigos 2FA.</p>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico o Usuario</label>
                <input
                  type="text"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="ejemplo@origencanino.cl"
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewUser}
                  className="px-5 py-2 bg-primary-green text-white rounded-xl text-sm font-bold hover:bg-primary-green-dark transition shadow"
                >
                  {savingNewUser ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDITAR / RESETEAR CLAVE ADMINISTRADOR --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h4 className="font-header text-xl text-secondary-brown mb-2">Editar Administrador</h4>
            <p className="text-sm text-gray-500 mb-4">Modifica el email o ingresa una nueva contraseña para restablecer su acceso.</p>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico o Usuario</label>
                <input
                  type="text"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nueva Contraseña <span className="font-normal text-xs text-gray-400">(Opcional, dejar vacío para no cambiar)</span>
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="Escribe para resetear la clave"
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-green outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditUser}
                  className="px-5 py-2 bg-primary-green text-white rounded-xl text-sm font-bold hover:bg-primary-green-dark transition shadow"
                >
                  {savingEditUser ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityManager;

