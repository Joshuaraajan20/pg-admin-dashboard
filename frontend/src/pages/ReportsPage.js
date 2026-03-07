import React, { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency, capitalize } from '@/lib/utils';
import { ChartCard, RevenueChart, OccupancyChart } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Home,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [revenueData, setRevenueData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);
  const [duesData, setDuesData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [revenueRes, occupancyRes, duesRes, maintenanceRes] = await Promise.all([
        reportsApi.getRevenue(),
        reportsApi.getOccupancy(),
        reportsApi.getOutstandingDues(),
        reportsApi.getMaintenance(),
      ]);
      setRevenueData(revenueRes.data);
      setOccupancyData(occupancyRes.data);
      setDuesData(duesRes.data);
      setMaintenanceData(maintenanceRes.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type, format) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL;
      const url = `${baseUrl}/api/reports/export/${format}/${type}`;
      
      // Open in new window for download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.${format}`);
      
      // Use fetch with auth for authenticated download
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`${capitalize(type)} report downloaded`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const ExportButtons = ({ type }) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport(type, 'csv')}
        data-testid={`export-${type}-csv`}
      >
        <Download className="w-4 h-4 mr-1" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport(type, 'pdf')}
        data-testid={`export-${type}-pdf`}
      >
        <FileText className="w-4 h-4 mr-1" />
        PDF
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn" data-testid="reports-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-slate-500 mt-1">View and export operational reports</p>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <TrendingUp className="w-4 h-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="occupancy" data-testid="tab-occupancy">
            <Home className="w-4 h-4 mr-2" />
            Occupancy
          </TabsTrigger>
          <TabsTrigger value="dues" data-testid="tab-dues">
            <AlertCircle className="w-4 h-4 mr-2" />
            Dues
          </TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">
            <Wrench className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* Revenue Report */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Revenue Report</CardTitle>
              <ExportButtons type="revenue" />
            </CardHeader>
            <CardContent>
              <div className="h-64 mb-6">
                <RevenueChart data={revenueData.map(r => ({ month: r.month, revenue: r.paid }))} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(row.paid)}</TableCell>
                      <TableCell className="text-right text-amber-600">{formatCurrency(row.pending)}</TableCell>
                      <TableCell className="text-right text-rose-600">{formatCurrency(row.overdue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy Report */}
        <TabsContent value="occupancy">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Occupancy Report</CardTitle>
              <ExportButtons type="occupancy" />
            </CardHeader>
            <CardContent>
              <div className="h-64 mb-6">
                <OccupancyChart data={occupancyData.map(o => ({
                  property: o.property_name?.substring(0, 12) || 'Unknown',
                  occupancy: o.occupancy_rate
                }))} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Total Beds</TableHead>
                    <TableHead className="text-right">Occupied</TableHead>
                    <TableHead className="text-right">Vacant</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occupancyData.map((row) => (
                    <TableRow key={row.property_id}>
                      <TableCell className="font-medium">{row.property_name}</TableCell>
                      <TableCell>{row.city}</TableCell>
                      <TableCell className="text-right">{row.total_beds}</TableCell>
                      <TableCell className="text-right text-blue-600">{row.occupied_beds}</TableCell>
                      <TableCell className="text-right text-slate-500">{row.vacant_beds}</TableCell>
                      <TableCell className="text-right font-semibold">{row.occupancy_rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outstanding Dues Report */}
        <TabsContent value="dues">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Outstanding Dues Report</CardTitle>
              <ExportButtons type="dues" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No outstanding dues
                      </TableCell>
                    </TableRow>
                  ) : (
                    duesData.map((row) => (
                      <TableRow key={row.payment_id}>
                        <TableCell className="font-medium">{row.resident_name}</TableCell>
                        <TableCell>{row.room_number}</TableCell>
                        <TableCell>{row.invoice_month}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.total_amount)}</TableCell>
                        <TableCell>{new Date(row.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`badge ${row.status === 'overdue' ? 'status-overdue' : 'status-pending'}`}>
                            {capitalize(row.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Report */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance Report</CardTitle>
              <div />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">In Progress</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceData.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell className="font-medium">{capitalize(row.category)}</TableCell>
                      <TableCell className="text-right">{row.total}</TableCell>
                      <TableCell className="text-right text-amber-600">{row.open}</TableCell>
                      <TableCell className="text-right text-blue-600">{row.in_progress}</TableCell>
                      <TableCell className="text-right text-emerald-600">{row.resolved}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
