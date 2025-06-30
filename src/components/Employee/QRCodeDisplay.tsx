import React, { useState } from 'react';
import { QrCode, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { employeeService } from '../../services/employeeService';
import toast from 'react-hot-toast';

const QRCodeDisplay: React.FC = () => {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(employee?.qrCode || '');

  const regenerateQRCode = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const newQrCode = await employeeService.regenerateQRCode(employee.employeeId);
      setQrCode(newQrCode);
      toast.success('QR Code regenerated successfully!');
    } catch (error) {
      toast.error('Failed to regenerate QR Code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qr-code-${employee?.employeeId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <QrCode className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Your QR Code</h2>
          <p className="text-gray-600 mt-2">
            Use this QR code for quick attendance marking at the kiosk
          </p>
        </div>

        {qrCode ? (
          <div className="mb-6">
            <img
              src={qrCode}
              alt="Employee QR Code"
              className="mx-auto border border-gray-200 rounded-lg p-4 bg-white"
            />
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Employee ID:</strong> {employee?.employeeId}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Name:</strong> {employee?.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No QR code available</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={regenerateQRCode}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          <button
            onClick={downloadQRCode}
            disabled={!qrCode}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;