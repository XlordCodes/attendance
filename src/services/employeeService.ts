import { Employee } from '../types';
import QRCode from 'qrcode';

// Mock data storage for demo
let mockEmployees: Employee[] = [
  {
    id: 'emp001',
    employeeId: 'EMP001',
    name: 'John Doe',
    email: 'john.doe@company.com',
    password: 'password123',
    role: 'employee',
    department: 'Engineering',
    isActive: true,
    createdAt: new Date(),
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  },
  {
    id: 'admin001',
    employeeId: 'ADMIN001',
    name: 'Admin User',
    email: 'admin@company.com',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    isActive: true,
    createdAt: new Date(),
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
];

class EmployeeService {
  async createEmployee(employeeData: Omit<Employee, 'id' | 'createdAt' | 'qrCode'>): Promise<Employee> {
    try {
      // Generate QR code for employee
      const qrCodeData = JSON.stringify({
        employeeId: employeeData.employeeId,
        name: employeeData.name,
        timestamp: Date.now()
      });
      const qrCode = await QRCode.toDataURL(qrCodeData);

      // Create employee document
      const employee: Employee = {
        id: `emp_${Date.now()}`,
        ...employeeData,
        createdAt: new Date(),
        qrCode,
      };

      mockEmployees.push(employee);
      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
    const index = mockEmployees.findIndex(emp => emp.id === id);
    if (index !== -1) {
      mockEmployees[index] = { ...mockEmployees[index], ...updates };
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    const index = mockEmployees.findIndex(emp => emp.id === id);
    if (index !== -1) {
      mockEmployees.splice(index, 1);
    }
  }

  async getAllEmployees(): Promise<Employee[]> {
    return [...mockEmployees];
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    return mockEmployees.find(emp => emp.id === id) || null;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | null> {
    return mockEmployees.find(emp => emp.employeeId === employeeId) || null;
  }

  async approveWFH(employeeId: string, expiryDate: Date): Promise<void> {
    const employee = await this.getEmployeeByEmployeeId(employeeId);
    if (employee) {
      await this.updateEmployee(employee.id, {
        wfhApproved: true,
        wfhExpiry: expiryDate,
      });
    }
  }

  async revokeWFH(employeeId: string): Promise<void> {
    const employee = await this.getEmployeeByEmployeeId(employeeId);
    if (employee) {
      await this.updateEmployee(employee.id, {
        wfhApproved: false,
        wfhExpiry: undefined,
      });
    }
  }

  async regenerateQRCode(employeeId: string): Promise<string> {
    const employee = await this.getEmployeeByEmployeeId(employeeId);
    if (!employee) throw new Error('Employee not found');

    const qrCodeData = JSON.stringify({
      employeeId: employee.employeeId,
      name: employee.name,
      timestamp: Date.now()
    });
    const qrCode = await QRCode.toDataURL(qrCodeData);

    await this.updateEmployee(employee.id, { qrCode });
    return qrCode;
  }
}

export const employeeService = new EmployeeService();