import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  ShieldCheck, 
  ShoppingCart,
  KeyRound,
  RefreshCw
} from 'lucide-react';

export default function TelegramSettingsManager({ fetchWithAuth }) {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 6000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/telegram-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setBotToken(data.bot_token || '');
        setChatId(data.chat_id || '');
      } else {
        notify('error', 'No se pudo cargar la configuración de Telegram.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Error al consultar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/admin/telegram-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: botToken.trim(),
          chat_id: chatId.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(prev => ({
          ...prev,
          bot_token: data.bot_token,
          chat_id: data.chat_id,
          verification: data.verification,
          is_configured: Boolean(data.bot_token && data.chat_id)
        }));
        notify('success', '¡Credenciales de Telegram guardadas y verificadas con éxito!');
      } else {
        notify('error', data.detail || data.message || 'Error al guardar credenciales.');
      }
    } catch (err) {
      notify('error', 'Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      const res = await fetchWithAuth('/api/admin/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify('success', data.message || '¡Mensaje de prueba recibido en tu Telegram!');
      } else {
        notify('error', data.message || data.error || data.detail || 'Telegram no pudo entregar el mensaje.');
      }
    } catch (err) {
      notify('error', 'Error al conectar con la API de Telegram.');
    } finally {
      setTesting(false);
    }
  };

  const verification = settings?.verification || {};
  const isBotValid = verification?.ok;

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
        <RefreshCw className="w-7 h-7 animate-spin text-primary-green" />
        <p className="font-medium text-sm">Cargando mantenedor de Telegram...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#229ED9]/10 text-[#229ED9] rounded-xl">
            <Send size={28} />
          </div>
          <div>
            <h3 className="font-header text-2xl text-secondary-brown flex items-center gap-2">
              Mantenedor de Bot Telegram
            </h3>
            <p className="text-gray-500 text-sm">
              Administra el Bot Token y el Chat ID para alertas de pedidos, pagos de Mercado Pago y códigos 2FA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Recargar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-green text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary-green-dark transition text-sm shadow-sm disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isBotValid 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            <Bot size={30} />
          </div>

          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Estado del Bot:</span>
              {isBotValid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Conectado y Operativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Desconectado / Token no verificado
                </span>
              )}
            </div>

            {isBotValid ? (
              <div className="mt-2 text-sm text-gray-800">
                Bot Oficial: <strong className="text-primary-green-dark">{verification.first_name}</strong>{' '}
                <span className="text-gray-500 font-mono">(@{verification.username})</span>
                {verification.username && (
                  <a
                    href={`https://t.me/${verification.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 inline-flex items-center gap-1 text-xs text-[#229ED9] font-bold hover:underline"
                  >
                    Abrir en Telegram <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-amber-700">
                {verification.error || 'Ingresa el Bot Token provisto por @BotFather para verificar el bot.'}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSendTest}
          disabled={testing || !botToken || !chatId}
          className="w-full md:w-auto px-5 py-2.5 bg-[#229ED9] hover:bg-[#1e8ec3] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Send size={16} className={testing ? 'animate-bounce' : ''} />
          {testing ? 'Enviando Prueba...' : 'Enviar Mensaje de Prueba'}
        </button>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h4 className="font-header text-lg text-secondary-brown flex items-center gap-2">
          <KeyRound size={20} className="text-primary-green" />
          Credenciales de la API de Telegram
        </h4>

        {/* Token Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
              Telegram Bot Token
              <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="text-xs text-gray-500 hover:text-primary-green flex items-center gap-1.5 transition"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              {showToken ? 'Ocultar Token' : 'Mostrar Token'}
            </button>
          </div>

          <input
            type={showToken ? 'text' : 'password'}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Ej: 8001076602:AAHfvGDbRLqT70mOPBq7TI1FSwT0gYHQFS4"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-800 focus:outline-none focus:border-primary-green focus:bg-white transition"
            required
          />
          <p className="text-xs text-gray-500">
            Token provisto por <strong>@BotFather</strong> al crear el bot o solicitarlo con <code>/mybots</code>.
          </p>
        </div>

        {/* Chat ID Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
            Telegram Chat ID (Personal o Grupo)
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Ej: 1468481915 o -100xxxxxxxxxx para grupos"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-800 focus:outline-none focus:border-primary-green focus:bg-white transition"
            required
          />
          <p className="text-xs text-gray-500">
            ID numérico del chat destinatario. Para obtener tu Chat ID personal, envíale <code>/start</code> a <strong>@userinfobot</strong> o <strong>@getidsbot</strong> en Telegram.
          </p>
        </div>

        {/* Features Card */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <ShieldCheck size={20} className="text-primary-green shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800 block text-sm">Código 2FA de Acceso</strong>
              Envía el código de verificación en tiempo real cuando un administrador intenta iniciar sesión en el panel.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <ShoppingCart size={20} className="text-primary-green shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800 block text-sm">Notificaciones de Pedidos & Pagos</strong>
              Recibe avisos inmediatos de nuevos pedidos y confirmación de pagos aprobados en Mercado Pago.
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-green hover:bg-primary-green-dark text-white font-bold px-6 py-2.5 rounded-xl transition shadow-sm text-sm flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar y Aplicar'}
          </button>
        </div>
      </form>

      {/* Quick Guide Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h4 className="font-header text-base text-secondary-brown flex items-center gap-2">
          <HelpCircle size={18} className="text-primary-green" />
          Guía Rápida para Configurar Telegram en Origen Canino
        </h4>

        <ol className="space-y-3 text-xs text-gray-600 list-decimal list-inside leading-relaxed">
          <li>
            <strong className="text-gray-800">Obtener el Bot Token:</strong> Abre Telegram, busca{' '}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary-green font-bold hover:underline">
              @BotFather
            </a>{' '}
            y ejecuta <code>/newbot</code> o selecciona tu bot con <code>/mybots</code> &gt; <em>API Token</em>. Copia el token aquí.
          </li>
          <li>
            <strong className="text-gray-800">Paso OBLIGATORIO (Iniciar el Bot):</strong> Abre una conversación con tu bot en Telegram y presiona el botón <strong>INICIAR (/start)</strong>. Telegram no permite que un bot envíe mensajes a una persona si ésta no inició la charla previamente.
          </li>
          <li>
            <strong className="text-gray-800">Obtener tu Chat ID:</strong> Busca en Telegram al bot{' '}
            <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary-green font-bold hover:underline">
              @userinfobot
            </a>{' '}
            o <strong>@getidsbot</strong> y presiona <code>/start</code>. Te responderá con tu número de ID personal. Cópialo en la casilla <em>Chat ID</em>.
          </li>
          <li>
            <strong className="text-gray-800">Guardar y Probar:</strong> Presiona <strong>Guardar Cambios</strong> y luego haz clic en <strong>Enviar Mensaje de Prueba</strong> para recibir la notificación de confirmación en tu teléfono.
          </li>
        </ol>
      </div>
    </div>
  );
}
