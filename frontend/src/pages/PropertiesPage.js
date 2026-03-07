import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertiesApi, roomsApi } from '@/lib/api';
import { formatCurrency, capitalize } from '@/lib/utils';
import { DataTable, StatusBadge, FormModal, ConfirmModal } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  DoorOpen,
  MapPin,
  Layers,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PropertiesPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    total_floors: 1,
    amenities: [],
  });

  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'single',
    number_of_beds: 1,
    rent_amount: 0,
    security_deposit: 0,
    floor: 1,
    status: 'available',
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadRooms(selectedProperty.id);
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const response = await propertiesApi.getAll();
      setProperties(response.data);
      if (response.data.length > 0 && !selectedProperty) {
        setSelectedProperty(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async (propertyId) => {
    try {
      const response = await roomsApi.getAll(propertyId);
      setRooms(response.data);
    } catch (error) {
      toast.error('Failed to load rooms');
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProperty) {
        await propertiesApi.update(editingProperty.id, propertyForm);
        toast.success('Property updated successfully');
      } else {
        await propertiesApi.create(propertyForm);
        toast.success('Property created successfully');
      }
      loadProperties();
      setShowPropertyModal(false);
      resetPropertyForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const roomData = {
        ...roomForm,
        property_id: selectedProperty.id,
        rent_amount: parseFloat(roomForm.rent_amount),
        security_deposit: parseFloat(roomForm.security_deposit),
        number_of_beds: parseInt(roomForm.number_of_beds),
        floor: parseInt(roomForm.floor),
      };
      
      if (editingRoom) {
        await roomsApi.update(editingRoom.id, roomData);
        toast.success('Room updated successfully');
      } else {
        await roomsApi.create(roomData);
        toast.success('Room created successfully');
      }
      loadRooms(selectedProperty.id);
      setShowRoomModal(false);
      resetRoomForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      if (deletingItem.type === 'property') {
        await propertiesApi.delete(deletingItem.id);
        toast.success('Property deleted successfully');
        setSelectedProperty(null);
        loadProperties();
      } else {
        await roomsApi.delete(deletingItem.id);
        toast.success('Room deleted successfully');
        loadRooms(selectedProperty.id);
      }
      setShowDeleteModal(false);
      setDeletingItem(null);
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPropertyForm = () => {
    setPropertyForm({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      total_floors: 1,
      amenities: [],
    });
    setEditingProperty(null);
  };

  const resetRoomForm = () => {
    setRoomForm({
      room_number: '',
      room_type: 'single',
      number_of_beds: 1,
      rent_amount: 0,
      security_deposit: 0,
      floor: 1,
      status: 'available',
    });
    setEditingRoom(null);
  };

  const openEditProperty = (property) => {
    setEditingProperty(property);
    setPropertyForm({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      pincode: property.pincode,
      total_floors: property.total_floors,
      amenities: property.amenities || [],
    });
    setShowPropertyModal(true);
  };

  const openEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      room_number: room.room_number,
      room_type: room.room_type,
      number_of_beds: room.number_of_beds,
      rent_amount: room.rent_amount,
      security_deposit: room.security_deposit,
      floor: room.floor,
      status: room.status,
    });
    setShowRoomModal(true);
  };

  const roomColumns = useMemo(
    () => [
      {
        accessorKey: 'room_number',
        header: 'Room No.',
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">{row.getValue('room_number')}</span>
        ),
      },
      {
        accessorKey: 'room_type',
        header: 'Type',
        cell: ({ row }) => capitalize(row.getValue('room_type')),
      },
      {
        accessorKey: 'number_of_beds',
        header: 'Beds',
      },
      {
        accessorKey: 'rent_amount',
        header: 'Rent',
        cell: ({ row }) => formatCurrency(row.getValue('rent_amount')),
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
              onClick={() => openEditRoom(row.original)}
              data-testid={`edit-room-${row.original.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDeletingItem({ type: 'room', id: row.original.id, name: row.original.room_number });
                setShowDeleteModal(true);
              }}
              data-testid={`delete-room-${row.original.id}`}
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
    <div className="page-container animate-fadeIn" data-testid="properties-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="text-slate-500 mt-1">Manage your PG properties and rooms</p>
        </div>
        <Button
          onClick={() => {
            resetPropertyForm();
            setShowPropertyModal(true);
          }}
          data-testid="add-property-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card
            key={property.id}
            className={`cursor-pointer transition-all ${
              selectedProperty?.id === property.id
                ? 'ring-2 ring-blue-500 border-blue-500'
                : 'hover:border-slate-300'
            }`}
            onClick={() => setSelectedProperty(property)}
            data-testid={`property-card-${property.id}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {property.city}, {property.state}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditProperty(property);
                    }}
                    data-testid={`edit-property-${property.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingItem({ type: 'property', id: property.id, name: property.name });
                      setShowDeleteModal(true);
                    }}
                    data-testid={`delete-property-${property.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  {property.total_floors} floors
                </span>
                <span className="flex items-center gap-1">
                  <DoorOpen className="w-4 h-4" />
                  {rooms.filter(r => r.property_id === property.id).length || '...'} rooms
                </span>
              </div>
              {property.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {property.amenities.slice(0, 3).map((amenity) => (
                    <span
                      key={amenity}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                    >
                      {amenity}
                    </span>
                  ))}
                  {property.amenities.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                      +{property.amenities.length - 3}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {properties.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">No properties yet</p>
              <p className="text-sm text-slate-500 mt-1">Add your first property to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rooms Table */}
      {selectedProperty && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Rooms in {selectedProperty.name}
              </h2>
              <p className="text-sm text-slate-500">{selectedProperty.address}</p>
            </div>
            <Button
              onClick={() => {
                resetRoomForm();
                setShowRoomModal(true);
              }}
              data-testid="add-room-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </div>
          <DataTable
            data={rooms}
            columns={roomColumns}
            searchPlaceholder="Search rooms..."
            emptyMessage="No rooms found for this property"
          />
        </div>
      )}

      {/* Property Modal */}
      <FormModal
        open={showPropertyModal}
        onOpenChange={setShowPropertyModal}
        title={editingProperty ? 'Edit Property' : 'Add Property'}
        onSubmit={handlePropertySubmit}
        isLoading={isSubmitting}
        size="lg"
      >
        <div className="space-y-4">
          <div className="form-row">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input
                value={propertyForm.name}
                onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                placeholder="Sunshine PG"
                required
                data-testid="property-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Floors</Label>
              <Input
                type="number"
                min={1}
                value={propertyForm.total_floors}
                onChange={(e) => setPropertyForm({ ...propertyForm, total_floors: parseInt(e.target.value) })}
                required
                data-testid="property-floors-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={propertyForm.address}
              onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
              placeholder="123 Main Street"
              required
              data-testid="property-address-input"
            />
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={propertyForm.city}
                onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                placeholder="Bangalore"
                required
                data-testid="property-city-input"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={propertyForm.state}
                onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value })}
                placeholder="Karnataka"
                required
                data-testid="property-state-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input
                value={propertyForm.pincode}
                onChange={(e) => setPropertyForm({ ...propertyForm, pincode: e.target.value })}
                placeholder="560001"
                required
                data-testid="property-pincode-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Amenities (comma separated)</Label>
              <Input
                value={propertyForm.amenities?.join(', ') || ''}
                onChange={(e) => setPropertyForm({ ...propertyForm, amenities: e.target.value.split(',').map(a => a.trim()).filter(Boolean) })}
                placeholder="WiFi, AC, Food, Laundry"
                data-testid="property-amenities-input"
              />
            </div>
          </div>
        </div>
      </FormModal>

      {/* Room Modal */}
      <FormModal
        open={showRoomModal}
        onOpenChange={setShowRoomModal}
        title={editingRoom ? 'Edit Room' : 'Add Room'}
        onSubmit={handleRoomSubmit}
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          <div className="form-row">
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                placeholder="101"
                required
                data-testid="room-number-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input
                type="number"
                min={1}
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) })}
                required
                data-testid="room-floor-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select
                value={roomForm.room_type}
                onValueChange={(value) => {
                  const beds = value === 'single' ? 1 : value === 'double' ? 2 : 3;
                  setRoomForm({ ...roomForm, room_type: value, number_of_beds: beds });
                }}
              >
                <SelectTrigger data-testid="room-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="triple">Triple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Beds</Label>
              <Input
                type="number"
                min={1}
                value={roomForm.number_of_beds}
                onChange={(e) => setRoomForm({ ...roomForm, number_of_beds: parseInt(e.target.value) })}
                required
                data-testid="room-beds-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="space-y-2">
              <Label>Rent Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={roomForm.rent_amount}
                onChange={(e) => setRoomForm({ ...roomForm, rent_amount: e.target.value })}
                required
                data-testid="room-rent-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Security Deposit (₹)</Label>
              <Input
                type="number"
                min={0}
                value={roomForm.security_deposit}
                onChange={(e) => setRoomForm({ ...roomForm, security_deposit: e.target.value })}
                required
                data-testid="room-deposit-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={roomForm.status}
              onValueChange={(value) => setRoomForm({ ...roomForm, status: value })}
            >
              <SelectTrigger data-testid="room-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title={`Delete ${deletingItem?.type === 'property' ? 'Property' : 'Room'}`}
        description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
