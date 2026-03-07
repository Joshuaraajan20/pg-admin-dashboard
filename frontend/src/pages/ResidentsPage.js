import React, { useEffect, useState, useMemo } from 'react';
import { residentsApi, propertiesApi, roomsApi } from '@/lib/api';
import { formatCurrency, formatDate, capitalize } from '@/lib/utils';
import { DataTable, StatusBadge, FormModal, ConfirmModal } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Calendar,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ResidentsPage() {
  const [residents, setResidents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [editingResident, setEditingResident] = useState(null);
  const [deletingResident, setDeletingResident] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    emergency_contact: '',
    property_id: '',
    room_id: '',
    bed_number: 1,
    check_in_date: '',
    contract_end_date: '',
    deposit_paid: 0,
    status: 'active',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [residentsRes, propertiesRes] = await Promise.all([
        residentsApi.getAll(),
        propertiesApi.getAll(),
      ]);
      setResidents(residentsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadRoomsForProperty = async (propertyId) => {
    try {
      const response = await roomsApi.getAll(propertyId);
      setRooms(response.data);
    } catch (error) {
      toast.error('Failed to load rooms');
    }
  };

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      if (filterProperty !== 'all' && r.property_id !== filterProperty) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    });
  }, [residents, filterProperty, filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...form,
        deposit_paid: parseFloat(form.deposit_paid),
        bed_number: parseInt(form.bed_number),
        check_in_date: new Date(form.check_in_date).toISOString(),
        contract_end_date: new Date(form.contract_end_date).toISOString(),
      };

      if (editingResident) {
        await residentsApi.update(editingResident.id, data);
        toast.success('Resident updated successfully');
      } else {
        await residentsApi.create(data);
        toast.success('Resident added successfully');
      }
      loadData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save resident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await residentsApi.delete(deletingResident.id);
      toast.success('Resident removed successfully');
      loadData();
      setShowDeleteModal(false);
      setDeletingResident(null);
    } catch (error) {
      toast.error('Failed to delete resident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      emergency_contact: '',
      property_id: '',
      room_id: '',
      bed_number: 1,
      check_in_date: '',
      contract_end_date: '',
      deposit_paid: 0,
      status: 'active',
    });
    setEditingResident(null);
    setRooms([]);
  };

  const openEdit = (resident) => {
    setEditingResident(resident);
    loadRoomsForProperty(resident.property_id);
    setForm({
      name: resident.name,
      phone: resident.phone,
      email: resident.email,
      emergency_contact: resident.emergency_contact,
      property_id: resident.property_id,
      room_id: resident.room_id,
      bed_number: resident.bed_number,
      check_in_date: resident.check_in_date?.split('T')[0] || '',
      contract_end_date: resident.contract_end_date?.split('T')[0] || '',
      deposit_paid: resident.deposit_paid,
      status: resident.status,
    });
    setShowModal(true);
  };

  const viewProfile = async (resident) => {
    setSelectedResident(resident);
    setShowProfile(true);
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
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                {row.getValue('name').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-slate-900">{row.getValue('name')}</p>
              <p className="text-xs text-slate-500">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'property_id',
        header: 'Property',
        cell: ({ row }) => getPropertyName(row.getValue('property_id')),
      },
      {
        accessorKey: 'check_in_date',
        header: 'Check-in',
        cell: ({ row }) => formatDate(row.getValue('check_in_date')),
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
              onClick={() => viewProfile(row.original)}
              data-testid={`view-resident-${row.original.id}`}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(row.original)}
              data-testid={`edit-resident-${row.original.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDeletingResident(row.original);
                setShowDeleteModal(true);
              }}
              data-testid={`delete-resident-${row.original.id}`}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [properties]
  );

  return (
    <div className="page-container animate-fadeIn" data-testid="residents-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Residents</h1>
          <p className="text-slate-500 mt-1">Manage your PG residents</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          data-testid="add-resident-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Resident
        </Button>
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="filter-status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredResidents}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search residents..."
        emptyMessage="No residents found"
      />

      {/* Add/Edit Modal */}
      <FormModal
        open={showModal}
        onOpenChange={setShowModal}
        title={editingResident ? 'Edit Resident' : 'Add Resident'}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="form-row">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                data-testid="resident-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                data-testid="resident-email-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                data-testid="resident-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                required
                data-testid="resident-emergency-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={form.property_id}
                onValueChange={(value) => {
                  setForm({ ...form, property_id: value, room_id: '' });
                  loadRoomsForProperty(value);
                }}
              >
                <SelectTrigger data-testid="resident-property-select">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Select
                value={form.room_id}
                onValueChange={(value) => setForm({ ...form, room_id: value })}
                disabled={!form.property_id}
              >
                <SelectTrigger data-testid="resident-room-select">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.room_number} ({capitalize(r.room_type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Bed Number</Label>
              <Input
                type="number"
                min={1}
                value={form.bed_number}
                onChange={(e) => setForm({ ...form, bed_number: e.target.value })}
                required
                data-testid="resident-bed-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit Paid (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.deposit_paid}
                onChange={(e) => setForm({ ...form, deposit_paid: e.target.value })}
                required
                data-testid="resident-deposit-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Input
                type="date"
                value={form.check_in_date}
                onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                required
                data-testid="resident-checkin-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Contract End Date</Label>
              <Input
                type="date"
                value={form.contract_end_date}
                onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })}
                required
                data-testid="resident-contract-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm({ ...form, status: value })}
            >
              <SelectTrigger data-testid="resident-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormModal>

      {/* Profile Sheet */}
      <Sheet open={showProfile} onOpenChange={setShowProfile}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Resident Profile</SheetTitle>
          </SheetHeader>
          {selectedResident && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    {selectedResident.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedResident.name}</h3>
                  <StatusBadge status={selectedResident.status} />
                </div>
              </div>

              <div className="grid gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {selectedResident.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {selectedResident.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Emergency: {selectedResident.emergency_contact}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Accommodation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="w-4 h-4 text-slate-400" />
                      {getPropertyName(selectedResident.property_id)}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Bed:</span>
                      #{selectedResident.bed_number}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Deposit:</span>
                      {formatCurrency(selectedResident.deposit_paid)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Dates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Check-in: {formatDate(selectedResident.check_in_date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Contract End: {formatDate(selectedResident.contract_end_date)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Remove Resident"
        description={`Are you sure you want to remove "${deletingResident?.name}"? This will also free up their bed.`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
