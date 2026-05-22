import React from 'react';
import { X, Shield, FileText, Users, Database, Clock, MapPin, Bell } from 'lucide-react';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">Attendance Management Terms & Conditions</h2>
              <p className="text-blue-100 mt-1">AINTRIX Global Attendance System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8 max-w-4xl">
            {/* Introduction */}
            <section>
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Introduction</h3>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">
                  Welcome to the AINTRIX Global Attendance Management System. By using this system, you agree to comply with and be bound by the following terms and conditions. These terms govern your use of the attendance tracking system and outline your rights and responsibilities as an employee.
                </p>
              </div>
            </section>

            {/* Working Hours Policy */}
            <section>
              <div className="flex items-center mb-4">
                <Clock className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Working Hours Policy</h3>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-green-800">Standard Hours</div>
                    <div className="text-green-700">10:00 AM - 8:00 PM</div>
                    <div className="text-sm text-green-600">10 hours daily</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">Lunch Break</div>
                    <div className="text-green-700">2:00 PM - 3:00 PM</div>
                    <div className="text-sm text-green-600">1 hour break</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">Late Threshold</div>
                    <div className="text-green-700">After 10:00 AM</div>
                    <div className="text-sm text-green-600">Requires justification</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Important:</strong> Consistent late arrivals may result in disciplinary action. 
                    Please ensure you clock in on time and provide valid reasons for any delays.
                  </p>
                </div>
              </div>
            </section>

            {/* Attendance Tracking */}
            <section>
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Attendance Tracking Requirements</h3>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>Daily Clock-In/Out:</strong> All employees must clock in upon arrival and clock out before leaving the premises.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>Break Tracking:</strong> All breaks exceeding 15 minutes must be properly logged in the system.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>Late Justification:</strong> Any arrival after 10:00 AM requires a reason to be provided in the system.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <strong>Accuracy:</strong> Employees are responsible for ensuring their attendance records are accurate and complete.
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* Location & Privacy */}
            <section>
              <div className="flex items-center mb-4">
                <MapPin className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Location & Privacy Policy</h3>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-2">Location Tracking</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Location data may be collected for attendance verification</li>
                      <li>• Used only for legitimate business purposes</li>
                      <li>• Can be disabled in privacy settings</li>
                      <li>• Data is encrypted and securely stored</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-2">Data Protection</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Attendance data is confidential and protected</li>
                      <li>• Access limited to authorized personnel only</li>
                      <li>• Data retention as per company policy</li>
                      <li>• Compliance with data protection regulations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Data Management */}
            <section>
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-indigo-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Data Management & Retention</h3>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-indigo-800 mb-3">Data Collection</h4>
                    <div className="space-y-2 text-sm text-indigo-700">
                      <div className="flex justify-between">
                        <span>Clock-in/out times:</span>
                        <span className="font-medium">Always</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Break durations:</span>
                        <span className="font-medium">Always</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location data:</span>
                        <span className="font-medium">Optional</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Device information:</span>
                        <span className="font-medium">Basic only</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-800 mb-3">Retention Period</h4>
                    <div className="space-y-2 text-sm text-indigo-700">
                      <div className="flex justify-between">
                        <span>Daily records:</span>
                        <span className="font-medium">3 years</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly summaries:</span>
                        <span className="font-medium">7 years</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Personal preferences:</span>
                        <span className="font-medium">Until deletion</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location data:</span>
                        <span className="font-medium">30 days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section>
              <div className="flex items-center mb-4">
                <Bell className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Notification Policy</h3>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-700 mb-3">
                  The system may send notifications for various attendance-related events. You can control these in your settings:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-2">Automatic Notifications</h4>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Clock-in reminders (10:00 AM)</li>
                      <li>• Clock-out reminders (8:00 PM)</li>
                      <li>• Break time reminders</li>
                      <li>• Weekly attendance summaries</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-2">Optional Notifications</h4>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Overtime alerts</li>
                      <li>• Leave request updates</li>
                      <li>• System maintenance notices</li>
                      <li>• Policy updates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Employee Rights and Responsibilities */}
            <section>
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Employee Rights & Responsibilities</h3>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-red-800 mb-3">Your Rights</h4>
                    <ul className="text-sm text-red-700 space-y-2">
                      <li>• Access to your attendance records</li>
                      <li>• Request corrections to inaccurate data</li>
                      <li>• Control over optional data sharing</li>
                      <li>• Privacy protection of personal information</li>
                      <li>• Appeal attendance-related decisions</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 mb-3">Your Responsibilities</h4>
                    <ul className="text-sm text-red-700 space-y-2">
                      <li>• Accurate and timely attendance recording</li>
                      <li>• Compliance with working hours policy</li>
                      <li>• Proper use of the attendance system</li>
                      <li>• Reporting system issues promptly</li>
                      <li>• Maintaining confidentiality of access credentials</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions or Concerns?</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-3">
                  If you have any questions about these terms and conditions or the attendance system, please contact:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-gray-900">HR Department</strong>
                    <div className="text-gray-600">hr@aintrix.com</div>
                    <div className="text-gray-600">+1 (555) 123-4567</div>
                  </div>
                  <div>
                    <strong className="text-gray-900">IT Support</strong>
                    <div className="text-gray-600">support@aintrix.com</div>
                    <div className="text-gray-600">+1 (555) 123-4568</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <section className="border-t border-gray-200 pt-4">
              <div className="text-center text-sm text-gray-600">
                <p>Last updated: July 11, 2025</p>
                <p className="mt-1">AINTRIX Global • Attendance Management System v1.0.0</p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            By using this system, you acknowledge that you have read and agree to these terms.
          </div>
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsModal;
