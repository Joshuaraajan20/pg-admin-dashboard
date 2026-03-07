import React, { useEffect, useState, useMemo } from 'react';
import { noticesApi } from '@/lib/api';
import { formatDateTime, capitalize } from '@/lib/utils';
import { DataTable, FormModal, ConfirmModal } from '@/components/shared';
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
import { Bell, Plus, Edit, Trash2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [deletingNotice, setDeletingNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    target: 'all',
    priority: 'normal',
  });

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const response = await noticesApi.getAll();
      setNotices(response.data);
    } catch (error) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingNotice) {
        await noticesApi.update(editingNotice.id, form);
        toast.success('Notice updated successfully');
      } else {
        await noticesApi.create(form);
        toast.success('Notice created successfully');
      }
      loadNotices();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await noticesApi.delete(deletingNotice.id);
      toast.success('Notice deleted successfully');
      loadNotices();
      setShowDeleteModal(false);
      setDeletingNotice(null);
    } catch (error) {
      toast.error('Failed to delete notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      target: 'all',
      priority: 'normal',
    });
    setEditingNotice(null);
  };

  const openEdit = (notice) => {
    setEditingNotice(notice);
    setForm({
      title: notice.title,
      description: notice.description,
      target: notice.target,
      priority: notice.priority,
    });
    setShowModal(true);
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.priority === 'important' ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <Info className="w-4 h-4 text-blue-500" />
            )}
            <span className="font-medium text-slate-900">{row.getValue('title')}</span>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="max-w-md truncate block text-slate-600">
            {row.getValue('description')}
          </span>
        ),
      },
      {
        accessorKey: 'target',
        header: 'Target',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.getValue('target') === 'all' ? 'All Residents' : 'Selected Rooms'}
          </span>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <span
            className={`badge ${
              row.getValue('priority') === 'important'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {capitalize(row.getValue('priority'))}
          </span>
        ),
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
              onClick={() => openEdit(row.original)}
              data-testid={`edit-notice-${row.original.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDeletingNotice(row.original);
                setShowDeleteModal(true);
              }}
              data-testid={`delete-notice-${row.original.id}`}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="page-container animate-fadeIn" data-testid="notices-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notices</h1>
          <p className="text-slate-500 mt-1">Send announcements to your residents</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          data-testid="add-notice-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Notice
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Total Notices</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{notices.length}</p>
        </div>
        <div className="stat-card border-amber-200 bg-amber-50/30">
          <p className="text-sm font-medium text-slate-500">Important</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {notices.filter(n => n.priority === 'important').length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-500">Normal</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {notices.filter(n => n.priority === 'normal').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={notices}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search notices..."
        emptyMessage="No notices found"
      />

      {/* Add/Edit Modal */}
      <FormModal
        open={showModal}
        onOpenChange={setShowModal}
        title={editingNotice ? 'Edit Notice' : 'Create Notice'}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Notice title"
              required
              data-testid="notice-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Notice content..."
              rows={4}
              required
              data-testid="notice-description-input"
            />
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                value={form.target}
                onValueChange={(value) => setForm({ ...form, target: value })}
              >
                <SelectTrigger data-testid="notice-target-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Residents</SelectItem>
                  <SelectItem value="selected">Selected Rooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm({ ...form, priority: value })}
              >
                <SelectTrigger data-testid="notice-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
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
        title="Delete Notice"
        description={`Are you sure you want to delete "${deletingNotice?.title}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
