import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Edit2, Shield, User as UserIcon } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './UserManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin',
  });

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'admin' });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', role: user.role });
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    if (!await confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`/api/auth/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      toast.success('User deleted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete user.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/auth/users/${editingUser._id}`, formData);
        setUsers(users.map(u => u._id === editingUser._id ? { ...u, ...formData } : u));
        toast.success('User updated successfully.');
      } else {
        await axios.post('/api/auth/register', formData);
        const newUsers = await axios.get('/api/auth/users');
        setUsers(newUsers.data);
        toast.success('User created successfully.');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save user.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <div className="glass-panel user-management">Loading users...</div>;
  }

  if (error) {
    return <div className="glass-panel user-management">{error}</div>;
  }

  return (
    <div className="user-management animate-fade-in">
      <div className="user-management-header">
        <div>
          <h1>User Management</h1>
          <p>Manage system users and their roles</p>
        </div>
        <button className="btn-primary" type="button" onClick={handleAddUser}>
          <Plus size={18} />
          Add User
        </button>
      </div>

      <div className="glass-panel users-list">
        {users.length === 0 ? (
          <p className="no-users">No users found.</p>
        ) : (
          <div className="users-grid">
            {users.map((user) => (
              <div key={user._id} className="user-card">
                <div className="user-card-header">
                  <div className="user-icon">
                    <UserIcon size={32} />
                  </div>
                  <div className="user-role-badge">
                    <Shield size={16} />
                    {user.role}
                  </div>
                </div>
                <div className="user-card-body">
                  <h3>{user.email}</h3>
                  <p className="user-id">ID: {user._id}</p>
                  <p className="user-created">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="user-card-actions">
                  <button
                    className="btn-secondary btn-sm"
                    type="button"
                    onClick={() => handleEditUser(user)}
                    disabled={user._id === currentUser?.id}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    type="button"
                    onClick={() => handleDeleteUser(user._id)}
                    disabled={user._id === currentUser?.id}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <Trash2 size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input-field"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  className="input-field"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="otmps">OTMPS</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
