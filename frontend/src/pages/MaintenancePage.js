import React, { useEffect, useState, useMemo } from 'react';
import { complaintsApi, residentsApi, staffApi } from '@/lib/api';
import { formatDateTime, capitalize } from '@/lib/utils';
import { DataTable, StatusBadge, FormModal, ConfirmModal } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'ac_cooler', label: 'AC/Cooler' },
  { value: 'internet', label: 'Internet' },
  { value: 'other', label: 'Other' },
];

export default function MaintenancePage() {
  const [complaints, setComplaints] = useState([]);
  const [residents, setResidents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [deletingComplaint, setDeletingComplaint] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [form, setForm] = useState({
    resident_id: '',
    room_id: '',
    category: '',
    description: '',
    photo_url: '',
  });

  const [assignForm, setAssignForm] = useState({
    assigned_staff_id: '',
    status: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [complaintsRes, residentsRes, staffRes] = await Promise.all([
        complaintsApi.getAll(),
        residentsApi.getAll(),
        staffApi.getAll(),
      ]);
      setComplaints(complaintsRes.data);
      setResidents(residentsRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      return true;
    });
  }, [complaints, filterStatus, filterCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingComplaint) {
        await complaintsApi.update(editingComplaint.id, {
          status: form.status,
          assigned_staff_id: form.assigned_staff_id,
        });
        toast.success('Complaint updated successfully');
      } else {
        const resident = residents.find(r => r.id === form.resident_id);
        await complaintsApi.create({
          ...form,
          room_id: resident?.room_id || '',
        });
        toast.success('Complaint created successfully');
      }
      loadData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await complaintsApi.update(selectedComplaint.id, assignForm);
      toast.success('Complaint updated successfully');
      loadData();
      setShowAssignModal(false);
      setSelectedComplaint(null);
    } catch (error) {
      toast.error('Failed to update complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await complaintsApi.delete(deletingComplaint.id);
      toast.success('Complaint deleted successfully');
      loadData();
      setShowDeleteModal(false);
      setDeletingComplaint(null);
    } catch (error) {
      toast.error('Failed to delete complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      resident_id: '',
      room_id: '',
      category: '',
      description: '',
      photo_url: '',
    });
    setEditingComplaint(null);
  };

  const openAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setAssignForm({
      assigned_staff_id: complaint.assigned_staff_id || '',
      status: complaint.status,
    });
    setShowAssignModal(true);
  };

  const getResidentName = (residentId) => {
    return residents.find(r => r.id === residentId)?.name || 'Unknown';
  };

  const getStaffName = (staffId) => {
    return staff.find(s => s.id === staffId)?.name || 'Unassigned';
  };

  const maintenanceStaff = staff.filter(s => s.role === 'maintenance' || s.role === 'warden');

  const columns = useMemo(
    () => [
      {
        accessorKey: 'resident_id',
        header: 'Resident',
        cell: ({ row }) => (
          <span className="font-medium">{getResidentName(row.getValue('resident_id'))}</span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => capitalize(row.getValue('category')),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="max-w-xs truncate block">{row.getValue('description')}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      },
      {
        accessorKey: 'assigned_staff_id',
        header: 'Assigned To',
        cell: ({ row }) => getStaffName(row.getValue('assigned_staff_id')),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => formatDateTime(row.getValue('created_at')),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openAssignModal(row.original)}
              data-testid={`assign-complaint-${row.original.id}`}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDeletingComplaint(row.original);
                setShowDeleteModal(true);
              }}
              data-testid={`delete-complaint-${row.original.id}`}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [residents, staff]
  );

  const openCount = complaints.filter(c => c.status === 'open').length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;

  return (
    <div className="page-container animate-fadeIn" data-testid="maintenance-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="text-slate-500 mt-1">Manage complaints and maintenance requests</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          data-testid="add-complaint-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Complaint
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{complaints.length}</p>
        </div>
        <div className="stat-card border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-slate-500">Open</p>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{openCount}</p>
        </div>
        <div className="stat-card border-blue-200 bg-blue-50/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-slate-500">In Progress</p>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
        </div>
        <div className="stat-card border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-medium text-slate-500">Resolved</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="filter-status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40" data-testid="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredComplaints}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search complaints..."
        emptyMessage="No complaints found"
      />

      {/* Create Complaint Modal */}
      <FormModal
        open={showModal}
        onOpenChange={setShowModal}
        title="Add Complaint"
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resident</Label>
            <Select
              value={form.resident_id}
              onValueChange={(value) => setForm({ ...form, resident_id: value })}
            >
              <SelectTrigger data-testid="complaint-resident-select">
                <SelectValue placeholder="Select resident" />
              </SelectTrigger>
              <SelectContent>
                {residents.filter(r => r.status === 'active').map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger data-testid="complaint-category-select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the issue..."
              required
              data-testid="complaint-description-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Photo URL (optional)</Label>
            <Input
              value={form.photo_url}
              onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
              placeholder="https://..."
              data-testid="complaint-photo-input"
            />
          </div>
        </div>
      </FormModal>

      {/* Assign/Update Modal */}
      <FormModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        title="Update Complaint"
        onSubmit={handleAssign}
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={assignForm.status}
              onValueChange={(value) => setAssignForm({ ...assignForm, status: value })}
            >
              <SelectTrigger data-testid="assign-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select
              value={assignForm.assigned_staff_id}
              onValueChange={(value) => setAssignForm({ ...assignForm, assigned_staff_id: value })}
            >
              <SelectTrigger data-testid="assign-staff-select">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({capitalize(s.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormModal>

      {/* Delete Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Complaint"
        description="Are you sure you want to delete this complaint?"
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
