import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../services/api';
import type { User, UserListResponse, CreateUserRequest, UpdateUserRequest, Group } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';

interface UserFormData {
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'curator' | 'admin';
  student_id?: string;
  group_id?: number;
  password?: string;
  is_active: boolean;
}

interface GroupWithDetails extends Group {
  teacher_name?: string;
  curator_name?: string;
  students: User[];
}

interface GroupWithDetails extends Group {
  teacher_name?: string;
  curator_name?: string;
  students: User[];
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all');
  const [groupFilter, setGroupFilter] = useState(searchParams.get('group_id') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('is_active') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'student',
    student_id: '',
    group_id: undefined,
    password: '',
    is_active: true
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadUsers();
    loadGroups();
  }, [currentPage, roleFilter, groupFilter, statusFilter, searchQuery]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        role: roleFilter && roleFilter !== 'all' ? roleFilter : undefined,
        group_id: groupFilter && groupFilter !== 'all' ? parseInt(groupFilter) : undefined,
        is_active: statusFilter && statusFilter !== 'all' ? statusFilter === 'true' : undefined,
        search: searchQuery || undefined
      };
      
      const response = await apiClient.getUsers(params);
      
      // Проверяем структуру ответа
      if (Array.isArray(response)) {
        // API возвращает массив пользователей напрямую
        setUsers(response);
        setTotalUsers(response.length);
      } else if (response && typeof response === 'object' && response.users) {
        // API возвращает объект с полем users
        setUsers(response.users);
        setTotalUsers(response.total || response.users.length);
      } else {
        // Неожиданный формат
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
      setUsers([]);
      setTotalUsers(0);
      showToast('error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsData = await apiClient.getGroups();
      const groupsWithDetails: GroupWithDetails[] = [];
      
             for (const group of groupsData || []) {
         // Найти куратора для этой группы
         const curator = users.find(user => 
           user.role === 'curator' && 
           user.group_id === group.id.toString()
         );
         
         // Найти студентов этой группы
         const groupStudents = users.filter(user => 
           user.role === 'student' && 
           user.group_id === group.id.toString()
         );
        
        groupsWithDetails.push({
          ...group,
          curator_name: curator?.name || curator?.full_name,
          students: groupStudents
        });
      }
      
      setGroups(groupsWithDetails);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    }
  };

  // Перезагрузить данные после изменения пользователей
  useEffect(() => {
    if (users.length > 0) {
      loadGroups();
    }
  }, [users]);

  const handleFilterChange = (filter: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(filter, value);
    } else {
      newParams.delete(filter);
    }
    setSearchParams(newParams);
    setCurrentPage(1);
  };

  const validateForm = (): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      // Простая валидация email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    return errors;
  };

  const handleCreateUser = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('error', 'Please fix the form errors');
      return;
    }
    setFormErrors({});

    try {
      const userData: CreateUserRequest = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        student_id: formData.student_id || undefined,
        group_id: formData.group_id || undefined,
        password: formData.password || undefined,
        is_active: formData.is_active
      };
      
      await apiClient.createUser(userData);
      showToast('success', 'User created successfully');
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      showToast('error', 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('error', 'Please fix the form errors');
      return;
    }
    setFormErrors({});
    
    try {
      const userData: UpdateUserRequest = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        student_id: formData.student_id || undefined,
        group_id: formData.group_id || undefined,
        password: formData.password || undefined,
        is_active: formData.is_active
      };
      
      await apiClient.updateUser(Number(selectedUser.id), userData);
      showToast('success', 'User updated successfully');
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('error', 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await apiClient.deactivateUser(Number(selectedUser.id));
      showToast('success', 'User deactivated successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      showToast('error', 'Failed to deactivate user');
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      const result = await apiClient.resetUserPassword(userId);
      showToast('success', `Password reset. New password: ${result.new_password}`);
    } catch (error) {
      console.error('Failed to reset password:', error);
      showToast('error', 'Failed to reset password');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || user.full_name || '',
      email: user.email,
      role: user.role,
      student_id: user.student_id || '',
      group_id: user.group_id ? Number(user.group_id) : undefined,
      password: '',
      is_active: user.is_active ?? true
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'student',
      student_id: '',
      group_id: undefined,
      password: '',
      is_active: true
    });
    setSelectedUser(null);
    setFormErrors({});
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage system users and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/admin/dashboard')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Name, email, or student ID"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleFilterChange('search', e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="role" className="text-sm font-medium">Role</Label>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  handleFilterChange('role', value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="curator">Curator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="group" className="text-sm font-medium">Group</Label>
              <Select
                value={groupFilter}
                onValueChange={(value) => {
                  setGroupFilter(value);
                  handleFilterChange('group_id', value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  handleFilterChange('is_active', value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

             {/* Users Table */}
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle>Users ({totalUsers})</CardTitle>
             <div className="flex items-center gap-2">
               <Button
                 onClick={loadUsers}
                 variant="ghost"
                 size="sm"
               >
                 <RefreshCw className="w-4 h-4" />
               </Button>
             </div>
           </div>
         </CardHeader>
         
         {isLoading ? (
           <div className="p-6 text-center">
             <Loader size="lg" animation="spin" color="#2563eb" />
           </div>
         ) : error ? (
           <div className="p-6 text-center">
             <div className="bg-red-50 border border-red-200 rounded-lg p-4">
               <h3 className="font-semibold text-red-800">Error loading users</h3>
               <p className="text-red-600">{error}</p>
               <button 
                 onClick={loadUsers}
                 className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
               >
                 Retry
               </button>
             </div>
           </div>
         ) : (
           <>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       User
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Role
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Group
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Status
                     </th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Actions
                     </th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {users?.map((user) => (
                     <tr key={user.id || user.email} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div>
                           <div className="text-sm font-medium text-gray-900">{user.name || user.full_name}</div>
                           <div className="text-sm text-gray-500">{user.email}</div>
                           {user.student_id && (
                             <div className="text-xs text-gray-400">ID: {user.student_id}</div>
                           )}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 py-1 text-xs rounded-full ${
                           user.role === 'admin' ? 'bg-red-100 text-red-700' :
                           user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                           user.role === 'curator' ? 'bg-blue-100 text-blue-700' :
                           'bg-green-100 text-green-700'
                         }`}>
                           {user.role}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         {user.group_name ? (
                           <div className="text-sm">
                             <div className="font-medium text-gray-900">{user.group_name}</div>
                             {user.teacher_name && (
                               <div className="text-xs text-gray-500">👨‍🏫 {user.teacher_name}</div>
                             )}
                             {user.curator_name && (
                               <div className="text-xs text-gray-500">👨‍💼 {user.curator_name}</div>
                             )}
                           </div>
                         ) : (
                           <span className="text-sm text-gray-500">No group</span>
                         )}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 py-1 text-xs rounded-full ${
                           user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                         }`}>
                           {user.is_active ? 'Active' : 'Inactive'}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end gap-2">
                           <Button
                             onClick={() => handleResetPassword(Number(user.id))}
                             variant="ghost"
                             size="sm"
                             title="Reset Password"
                           >
                             <RefreshCw className="w-4 h-4" />
                           </Button>
                           <Button
                             onClick={() => openEditModal(user)}
                             variant="ghost"
                             size="sm"
                             title="Edit User"
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             onClick={() => openDeleteModal(user)}
                             variant="ghost"
                             size="sm"
                             title="Deactivate User"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             
             {/* Pagination */}
             {totalPages > 1 && (
               <div className="px-6 py-3 border-t bg-gray-50">
                 <div className="flex items-center justify-between">
                   <div className="text-sm text-gray-700">
                     Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} results
                   </div>
                   <div className="flex items-center gap-2">
                     <Button
                       onClick={() => setCurrentPage(currentPage - 1)}
                       disabled={currentPage === 1}
                       variant="outline"
                       size="sm"
                     >
                       Previous
                     </Button>
                     <span className="px-3 py-1 text-sm">
                       Page {currentPage} of {totalPages}
                     </span>
                     <Button
                       onClick={() => setCurrentPage(currentPage + 1)}
                       disabled={currentPage === totalPages}
                       variant="outline"
                       size="sm"
                     >
                       Next
                     </Button>
                   </div>
                 </div>
               </div>
             )}
           </>
         )}
       </Card>

      {/* Create User Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        onSubmit={handleCreateUser}
        submitText="Create User"
      >
        <UserForm
          formData={formData}
          setFormData={setFormData}
          groups={groups}
          onSubmit={handleCreateUser}
          submitText="Create User"
          errors={formErrors}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        onSubmit={handleUpdateUser}
        submitText="Update User"
      >
        <UserForm
          formData={formData}
          setFormData={setFormData}
          groups={groups}
          onSubmit={handleUpdateUser}
          submitText="Update User"
          errors={formErrors}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Deactivate User"
        onSubmit={handleDeleteUser}
        submitText="Deactivate"
      >
        <div>
          <p className="text-gray-600 mb-4">
            Are you sure you want to deactivate <strong>{selectedUser?.name}</strong>? 
            This action can be undone later.
          </p>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-card z-50 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
          <button 
            onClick={() => setToast(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// User Form Component
interface UserFormProps {
  formData: UserFormData;
  setFormData: (data: UserFormData) => void;
  groups: GroupWithDetails[];
  onSubmit: () => void;
  submitText: string;
  errors?: { [key: string]: string };
}

function UserForm({ formData, setFormData, groups, onSubmit, submitText, errors = {} }: UserFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-1">
          <Label htmlFor="name" className="text-sm font-medium">Name</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>
        
        <div className="p-1">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-1">
          <Label htmlFor="role" className="text-sm font-medium">Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="z-[1100]">
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="curator">Curator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="p-1">
          <Label htmlFor="group" className="text-sm font-medium">Group</Label>
          <Select
            value={formData.group_id?.toString() || 'none'}
            onValueChange={(value) => setFormData({ ...formData, group_id: value && value !== 'none' ? parseInt(value) : undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="No Group" />
            </SelectTrigger>
            <SelectContent className="z-[1100]">
              <SelectItem value="none">No Group</SelectItem>
              {groups?.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="p-1">
        <Label htmlFor="student_id" className="text-sm font-medium">Student ID</Label>
        <Input
          id="student_id"
          type="text"
          value={formData.student_id || ''}
          onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
          placeholder="Optional"
        />
      </div>
      
      <div className="p-1">
        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password || ''}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Leave empty for auto-generation"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
        />
        <Label htmlFor="is_active" className="text-sm">
          Active
        </Label>
      </div>
    </div>
  );
}
