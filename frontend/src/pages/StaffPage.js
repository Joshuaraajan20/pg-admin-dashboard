import React, { useEffect, useState, useMemo } from 'react';
import { staffApi, propertiesApi } from '@/lib/api';
import { formatCurrency, capitalize } from '@/lib/utils';
import { DataTable, StatusBadge, FormModal, ConfirmModal } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCog, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { value: 'warden', label: 'Warden' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'cook', label: 'Cook' },
  { value: 'maintenance', label: 'Maintenance' },
];

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: '',
    assigned_property_id: '',
    salary: 0,
    status: 'active',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [staffRes, propertiesRes] = await Promise.all([
        staffApi.getAll(),
        propertiesApi.getAll(),
      ]);
      setStaffList(staffRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (filterProperty !== 'all' && s.assigned_property_id !== filterProperty) return false;
      if (filterRole !== 'all' && s.role !== filterRole) return false;
      return true;
    });
  }, [staffList, filterProperty, filterRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...form,
        salary: parseFloat(form.salary),
      };

      if (editingStaff) {
        await staffApi.update(editingStaff.id, data);
        toast.success('Staff updated successfully');
      } else {
        await staffApi.create(data);
        toast.success('Staff added successfully');
      }
      loadData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await staffApi.delete(deletingStaff.id);
      toast.success('Staff removed successfully');
      loadData();
      setShowDeleteModal(false);
      setDeletingStaff(null);
    } catch (error) {
      toast.error('Failed to delete staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      role: '',
      assigned_property_id: '',
      salary: 0,
      status: 'active',
    });
    setEditingStaff(null);
  };

  const openEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setForm({
      name: staffMember.name,
      phone: staffMember.phone,
      role: staffMember.role,
      assigned_property_id: staffMember.assigned_property_id,
      salary: staffMember.salary,
      status: staffMember.status,
    });
    setShowModal(true);
  };

  const getPropertyName = (propertyId) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown';
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">{row.getValue('name')}</span>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <span className="px-2 py-1 bg-slate-100 rounded text-sm">
            {capitalize(row.getValue('role'))}
          </span>
        ),
      },
      {
        accessorKey: 'assigned_property_id',
        header: 'Property',
        cell: ({ row }) => getPropertyName(row.getValue('assigned_property_id')),
      },
      {
        accessorKey: 'salary',
        header: 'Salary',
        cell: ({ row }) => formatCurrency(row.getValue('salary')),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(row.original)}
              data-testid={`edit-staff-${row.original.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDeletingStaff(row.original);
                setShowDeleteModal(true);
              }}
              data-testid={`delete-staff-${row.original.id}`}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [properties]
  );

  const totalSalary = staffList.filter(s => s.status === 'active').reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="page-container animate-fadeIn" data-testid="staff-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="text-slate-500 mt-1">Manage your PG staff members</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          data-testid="add-staff-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{staffList.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Active Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {staffList.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Monthly Salary</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSalary)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-48" data-testid="filter-property">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40" data-testid="filter-role">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredStaff}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search staff..."
        emptyMessage="No staff found"
      />

      {/* Add/Edit Modal */}
      <FormModal
        open={showModal}
        onOpenChange={setShowModal}
        title={editingStaff ? 'Edit Staff' : 'Add Staff'}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div className="form-row">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                data-testid="staff-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                data-testid="staff-phone-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm({ ...form, role: value })}
              >
                <SelectTrigger data-testid="staff-role-select">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Property</Label>
              <Select
                value={form.assigned_property_id}
                onValueChange={(value) => setForm({ ...form, assigned_property_id: value })}
              >
                <SelectTrigger data-testid="staff-property-select">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Monthly Salary (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                required
                data-testid="staff-salary-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger data-testid="staff-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Delete Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Remove Staff"
        description={`Are you sure you want to remove "${deletingStaff?.name}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
