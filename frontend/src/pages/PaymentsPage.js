import React, { useEffect, useState, useMemo } from 'react';
import { paymentsApi, residentsApi } from '@/lib/api';
import { formatCurrency, formatDate, formatMonth, getCurrentMonth, getMonthOptions } from '@/lib/utils';
import { DataTable, StatusBadge, FormModal } from '@/components/shared';
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
import {
  CreditCard,
  Plus,
  Edit,
  Download,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResident, setFilterResident] = useState('all');

  const [form, setForm] = useState({
    resident_id: '',
    invoice_month: getCurrentMonth(),
    base_rent: 0,
    electricity_charge: 0,
    food_charge: 0,
    maintenance_charge: 0,
    due_date: '',
  });

  const [updateForm, setUpdateForm] = useState({
    status: '',
    payment_method: '',
    payment_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsRes, residentsRes] = await Promise.all([
        paymentsApi.getAll(),
        residentsApi.getAll(),
      ]);
      setPayments(paymentsRes.data);
      setResidents(residentsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterResident !== 'all' && p.resident_id !== filterResident) return false;
      return true;
    });
  }, [payments, filterStatus, filterResident]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...form,
        base_rent: parseFloat(form.base_rent),
        electricity_charge: parseFloat(form.electricity_charge),
        food_charge: parseFloat(form.food_charge),
        maintenance_charge: parseFloat(form.maintenance_charge),
        due_date: new Date(form.due_date).toISOString(),
      };
      await paymentsApi.create(data);
      toast.success('Payment created successfully');
      loadData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        status: updateForm.status,
        payment_method: updateForm.payment_method || null,
        payment_date: updateForm.payment_date ? new Date(updateForm.payment_date).toISOString() : null,
      };
      await paymentsApi.update(selectedPayment.id, data);
      toast.success('Payment updated successfully');
      loadData();
      setShowUpdateModal(false);
      setSelectedPayment(null);
    } catch (error) {
      toast.error('Failed to update payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      resident_id: '',
      invoice_month: getCurrentMonth(),
      base_rent: 0,
      electricity_charge: 0,
      food_charge: 0,
      maintenance_charge: 0,
      due_date: '',
    });
  };

  const openUpdateModal = (payment) => {
    setSelectedPayment(payment);
    setUpdateForm({
      status: payment.status,
      payment_method: payment.payment_method || '',
      payment_date: payment.payment_date?.split('T')[0] || '',
    });
    setShowUpdateModal(true);
  };

  const getResidentName = (residentId) => {
    return residents.find(r => r.id === residentId)?.name || 'Unknown';
  };

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
        accessorKey: 'invoice_month',
        header: 'Month',
        cell: ({ row }) => formatMonth(row.getValue('invoice_month')),
      },
      {
        accessorKey: 'total_amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.getValue('total_amount'))}</span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: 'Due Date',
        cell: ({ row }) => formatDate(row.getValue('due_date')),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      },
      {
        accessorKey: 'payment_method',
        header: 'Method',
        cell: ({ row }) => row.getValue('payment_method') || '-',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openUpdateModal(row.original)}
              data-testid={`edit-payment-${row.original.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            {row.original.status !== 'paid' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  toast.info('Reminder sent to resident');
                }}
                data-testid={`remind-payment-${row.original.id}`}
              >
                <Send className="w-4 h-4 text-blue-500" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [residents]
  );

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.total_amount, 0);
  const paidAmount = filteredPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.total_amount, 0);
  const pendingAmount = filteredPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.total_amount, 0);
  const overdueAmount = filteredPayments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="page-container animate-fadeIn" data-testid="payments-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-slate-500 mt-1">Track rent and utility payments</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          data-testid="add-payment-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="stat-card border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-medium text-slate-500">Paid</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="stat-card border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-slate-500">Pending</p>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(pendingAmount)}</p>
        </div>
        <div className="stat-card border-rose-200 bg-rose-50/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <p className="text-sm font-medium text-slate-500">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(overdueAmount)}</p>
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
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResident} onValueChange={setFilterResident}>
          <SelectTrigger className="w-48" data-testid="filter-resident">
            <SelectValue placeholder="All Residents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Residents</SelectItem>
            {residents.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredPayments}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search payments..."
        emptyMessage="No payments found"
      />

      {/* Create Invoice Modal */}
      <FormModal
        open={showModal}
        onOpenChange={setShowModal}
        title="Create Invoice"
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="form-row">
            <div className="space-y-2">
              <Label>Resident</Label>
              <Select
                value={form.resident_id}
                onValueChange={(value) => setForm({ ...form, resident_id: value })}
              >
                <SelectTrigger data-testid="payment-resident-select">
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
              <Label>Invoice Month</Label>
              <Select
                value={form.invoice_month}
                onValueChange={(value) => setForm({ ...form, invoice_month: value })}
              >
                <SelectTrigger data-testid="payment-month-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Base Rent (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.base_rent}
                onChange={(e) => setForm({ ...form, base_rent: e.target.value })}
                required
                data-testid="payment-rent-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Electricity (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.electricity_charge}
                onChange={(e) => setForm({ ...form, electricity_charge: e.target.value })}
                data-testid="payment-electricity-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Food Charge (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.food_charge}
                onChange={(e) => setForm({ ...form, food_charge: e.target.value })}
                data-testid="payment-food-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Maintenance (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.maintenance_charge}
                onChange={(e) => setForm({ ...form, maintenance_charge: e.target.value })}
                data-testid="payment-maintenance-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              required
              data-testid="payment-due-input"
            />
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(
                parseFloat(form.base_rent || 0) +
                parseFloat(form.electricity_charge || 0) +
                parseFloat(form.food_charge || 0) +
                parseFloat(form.maintenance_charge || 0)
              )}
            </p>
          </div>
        </div>
      </FormModal>

      {/* Update Payment Modal */}
      <FormModal
        open={showUpdateModal}
        onOpenChange={setShowUpdateModal}
        title="Update Payment"
        onSubmit={handleUpdatePayment}
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={updateForm.status}
              onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}
            >
              <SelectTrigger data-testid="update-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {updateForm.status === 'paid' && (
            <>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={updateForm.payment_method}
                  onValueChange={(value) => setUpdateForm({ ...updateForm, payment_method: value })}
                >
                  <SelectTrigger data-testid="update-method-select">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={updateForm.payment_date}
                  onChange={(e) => setUpdateForm({ ...updateForm, payment_date: e.target.value })}
                  data-testid="update-date-input"
                />
              </div>
            </>
          )}
        </div>
      </FormModal>
    </div>
  );
}
