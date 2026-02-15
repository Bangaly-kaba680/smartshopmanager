import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AccessActionPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, denied, error, already_processed
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const processAction = async () => {
      const requestId = searchParams.get('id');
      const action = searchParams.get('action'); // approve or deny
      const accessType = searchParams.get('type'); // permanent or temporary

      if (!requestId || !action) {
        setStatus('error');
        setMessage('Lien invalide. Paramètres manquants.');
        return;
      }

      try {
        let response;
        if (action === 'approve') {
          response = await fetch(`${BACKEND_URL}/api/access/action/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId, access_type: accessType || 'permanent' })
          });
        } else if (action === 'deny') {
          response = await fetch(`${BACKEND_URL}/api/access/action/deny`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId })
          });
        } else {
          setStatus('error');
          setMessage('Action non reconnue.');
          return;
        }

        const data = await response.json();

        if (response.ok) {
          if (action === 'approve') {
            setStatus('success');
            setMessage(data.message || 'Accès accordé avec succès!');
            setDetails({
              name: data.name,
              email: data.email,
              accessType: accessType === 'temporary' ? '20 minutes' : 'Permanent'
            });
          } else {
            setStatus('denied');
            setMessage(data.message || 'Accès refusé.');
            setDetails({ name: data.name, email: data.email });
          }
        } else {
          if (data.detail?.includes('déjà')) {
            setStatus('already_processed');
            setMessage(data.detail);
          } else {
            setStatus('error');
            setMessage(data.detail || 'Une erreur est survenue.');
          }
        }
      } catch (error) {
        console.error('Error processing action:', error);
        setStatus('error');
        setMessage('Erreur de connexion au serveur.');
      }
    };

    processAction();
  }, [searchParams]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-20 h-20 text-indigo-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-20 h-20 text-green-500" />;
      case 'denied':
        return <XCircle className="w-20 h-20 text-red-500" />;
      case 'already_processed':
        return <Clock className="w-20 h-20 text-blue-500" />;
      case 'error':
      default:
        return <AlertCircle className="w-20 h-20 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Traitement en cours...';
      case 'success':
        return 'Accès Accordé!';
      case 'denied':
        return 'Accès Refusé';
      case 'already_processed':
        return 'Déjà Traité';
      case 'error':
      default:
        return 'Erreur';
    }
  };

  const getBgColor = () => {
    switch (status) {
      case 'success':
        return 'border-l-green-500';
      case 'denied':
        return 'border-l-red-500';
      case 'already_processed':
        return 'border-l-blue-500';
      case 'error':
      default:
        return 'border-l-red-500';
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
        <div className={`bg-gray-50 border-l-4 ${getBgColor()} p-4 rounded-r-lg mb-6`}>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Details */}
        {details && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            {details.name && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Nom:</span> {details.name}
              </p>
            )}
            {details.email && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Email:</span> {details.email}
              </p>
            )}
            {details.accessType && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Type d'accès:</span> {details.accessType}
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
