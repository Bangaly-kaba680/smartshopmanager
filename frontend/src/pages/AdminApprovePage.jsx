import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Shield, User, Eye, DollarSign, Briefcase } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ROLE_INFO = {
  viewer: { icon: Eye, label: 'Lecture Seule', color: 'text-green-500', bg: 'bg-green-100' },
  cashier: { icon: DollarSign, label: 'Caissier', color: 'text-blue-500', bg: 'bg-blue-100' },
  manager: { icon: Briefcase, label: 'Manager', color: 'text-purple-500', bg: 'bg-purple-100' },
  ceo: { icon: Shield, label: 'CEO/PDG', color: 'text-orange-500', bg: 'bg-orange-100' },
};

const AdminApprovePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Traitement en cours...');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const processAction = async () => {
      const attemptId = searchParams.get('id');
      const role = searchParams.get('role');
      const isDeny = window.location.pathname.includes('/deny');

      if (!attemptId) {
        setStatus('error');
        setMessage('Lien invalide');
        return;
      }

      try {
        let response;
        if (isDeny) {
          response = await fetch(`${BACKEND_URL}/api/security/deny-request/${attemptId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          response = await fetch(`${BACKEND_URL}/api/security/approve-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attempt_id: attemptId, role: role || 'viewer' })
          });
        }

        const data = await response.json();

        if (response.ok) {
          setStatus(isDeny ? 'denied' : 'approved');
          setMessage(isDeny ? 'Accès refusé' : `Accès accordé avec le rôle: ${ROLE_INFO[role]?.label || role}`);
          setDetails(data);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Une erreur est survenue');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erreur de connexion');
      }
    };

    processAction();
  }, [searchParams]);

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />;
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'denied':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <XCircle className="w-16 h-16 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src="/logo-icon.png" alt="SM" className="w-10 h-10" />
          <span className="font-bold text-gray-800">StartupManager Pro</span>
        </div>

        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {status === 'processing' ? 'Traitement...' : 
           status === 'approved' ? 'Accès Accordé!' :
           status === 'denied' ? 'Accès Refusé' : 'Erreur'}
        </h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {details && details.email && (
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <p className="text-sm"><strong>Email:</strong> {details.email}</p>
            {details.role && <p className="text-sm"><strong>Rôle:</strong> {ROLE_INFO[details.role]?.label || details.role}</p>}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Action enregistrée dans le journal d'audit.<br/>
          <strong>Super Admin: Bangaly Kaba</strong>
        </p>
      </div>
    </div>
  );
};

export default AdminApprovePage;
