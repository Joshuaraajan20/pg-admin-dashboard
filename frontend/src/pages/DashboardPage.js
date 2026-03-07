import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatDate, capitalize } from '@/lib/utils';
import { StatCard, ChartCard, RevenueChart, OccupancyChart, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  DoorOpen,
  Users,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, revenueRes, occupancyRes, paymentsRes, complaintsRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRevenueChart(),
        dashboardApi.getOccupancyChart(),
        dashboardApi.getRecentPayments(),
        dashboardApi.getRecentComplaints(),
      ]);
      setStats(statsRes.data);
      setRevenueData(revenueRes.data);
      setOccupancyData(occupancyRes.data);
      setRecentPayments(paymentsRes.data);
      setRecentComplaints(complaintsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="page-header">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn" data-testid="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's your property overview.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value={stats?.total_properties || 0}
          icon={Building2}
        />
        <StatCard
          title="Total Rooms"
          value={stats?.total_rooms || 0}
          icon={DoorOpen}
        />
        <StatCard
          title="Occupied Rooms"
          value={stats?.occupied_rooms || 0}
          icon={Users}
        />
        <StatCard
          title="Vacant Rooms"
          value={stats?.vacant_rooms || 0}
          icon={DoorOpen}
        />
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Residents"
          value={stats?.total_residents || 0}
          icon={Users}
        />
        <StatCard
          title="Pending Dues"
          value={formatCurrency(stats?.pending_dues || 0)}
          icon={AlertCircle}
          className="border-amber-200 bg-amber-50/30"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthly_revenue || 0)}
          icon={TrendingUp}
          className="border-emerald-200 bg-emerald-50/30"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Revenue" subtitle="Last 6 months revenue trend">
          <RevenueChart data={revenueData} />
        </ChartCard>
        <ChartCard title="Occupancy by Property" subtitle="Current occupancy rates">
          <OccupancyChart data={occupancyData} />
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/payments">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No recent payments</p>
              ) : (
                recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    data-testid={`recent-payment-${payment.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{payment.resident_name}</p>
                      <p className="text-sm text-slate-500">{payment.invoice_month}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(payment.total_amount)}
                      </p>
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Complaints */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Complaints</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/maintenance">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentComplaints.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No recent complaints</p>
              ) : (
                recentComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    data-testid={`recent-complaint-${complaint.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{complaint.resident_name}</p>
                      <p className="text-sm text-slate-500">{capitalize(complaint.category)}</p>
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
