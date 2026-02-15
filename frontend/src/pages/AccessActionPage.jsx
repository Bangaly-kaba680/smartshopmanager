import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AccessActionPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const processAction = async () => {
      const requestId = searchParams.get('id');
      const action = searchParams.get('action');
      const accessType = searchParams.get('type') || 'permanent';

      if (!requestId || !action) {
        setStatus('error');
        setMessage('Lien invalide. Paramètres manquants.');
        return;
      }

      try {
        const endpoint = action === 'approve' 
          ? `${BACKEND_URL}/api/access/action/approve`
          : `${BACKEND_URL}/api/access/action/deny`;
        
        const body = action === 'approve'
          ? { request_id: requestId, access_type: accessType }
          : { request_id: requestId };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        // Clone response before reading to avoid "body already read" error
        const responseClone = response.clone();
        
        let data;
        try {
          data = await response.json();
        } catch {
          const text = await responseClone.text();
          data = { detail: text || 'Erreur inconnue' };
        }

        if (response.ok) {
          setStatus(action === 'approve' ? 'success' : 'denied');
          setMessage(data.message || (action === 'approve' ? 'Accès accordé!' : 'Accès refusé.'));
          setDetails({
            name: data.name,
            email: data.email,
            accessType: accessType === 'temporary' ? '20 minutes' : 'Permanent'
          });
        } else {
          // Check if already processed
          const detail = data.detail || '';
          if (detail.includes('déjà') || detail.includes('already')) {
            setStatus('already_processed');
            setMessage('Cette demande a déjà été traitée.');
          } else if (detail.includes('non trouvée') || detail.includes('not found')) {
            setStatus('error');
            setMessage('Demande non trouvée ou expirée.');
          } else {
            setStatus('error');
            setMessage(detail || 'Une erreur est survenue.');
          }
        }
      } catch (error) {
        console.error('Network error:', error);
        setStatus('error');
        setMessage('Erreur de connexion. Veuillez réessayer.');
      }
    };

    processAction();
  }, [searchParams]);

  const getIcon = () => {
    const iconProps = { className: "w-20 h-20" };
    switch (status) {
      case 'loading':
        return <Loader2 {...iconProps} className="w-20 h-20 text-indigo-500 animate-spin" />;
      case 'success':
        return <CheckCircle {...iconProps} className="w-20 h-20 text-green-500" />;
      case 'denied':
        return <XCircle {...iconProps} className="w-20 h-20 text-orange-500" />;
      case 'already_processed':
        return <Clock {...iconProps} className="w-20 h-20 text-blue-500" />;
      default:
        return <AlertCircle {...iconProps} className="w-20 h-20 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading': return 'Traitement...';
      case 'success': return 'Accès Accordé!';
      case 'denied': return 'Accès Refusé';
      case 'already_processed': return 'Déjà Traité';
      default: return 'Erreur';
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'success': return 'border-l-green-500';
      case 'denied': return 'border-l-orange-500';
      case 'already_processed': return 'border-l-blue-500';
      default: return 'border-l-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
            BK
          </div>
          <span className="text-lg font-semibold text-gray-800">StartupManager Pro</span>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{getTitle()}</h1>

        {/* Message */}
        <div className={`bg-gray-50 border-l-4 ${getBorderColor()} p-4 rounded-r-lg mb-6`}>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Details */}
        {details && details.name && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Nom:</span> {details.name}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Email:</span> {details.email}
            </p>
            {status === 'success' && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Type:</span> {details.accessType}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-8">
          Vous pouvez fermer cette page.
          <br />
          Développé par <strong>Bangaly Kaba</strong>
        </p>
      </div>
    </div>
  );
};

export default AccessActionPage;
