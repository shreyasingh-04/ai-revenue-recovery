import React from 'react';
import { DollarSign, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function StatCard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 transition-all hover:border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={`h-5 w-5 ${colorClass.split(' ')[0]}`} />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

export default function Dashboard({ metrics, orders }) {
  if (!metrics) return null;

  const chartData = Object.keys(metrics.recovery_rate_by_cause).map(cause => ({
    name: cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    rate: metrics.recovery_rate_by_cause[cause]
  }));

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Revenue at Risk" 
          value={`₹${metrics.total_amount_at_risk.toLocaleString()}`}
          icon={AlertTriangle}
          colorClass="text-amber-400 bg-amber-400"
        />
        <StatCard 
          title="Revenue Recovered" 
          value={`₹${metrics.total_recovered_amount.toLocaleString()}`}
          icon={DollarSign}
          colorClass="text-emerald-400 bg-emerald-400"
        />
        <StatCard 
          title="Orders Recovered" 
          value={`${metrics.total_recovered_orders} / ${metrics.total_orders_at_risk}`}
          icon={CheckCircle2}
          colorClass="text-indigo-400 bg-indigo-400"
        />
        <StatCard 
          title="Wasted Attempts" 
          value={metrics.wasted_attempts}
          icon={ShieldAlert}
          colorClass="text-rose-400 bg-rose-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Rate by Cause Chart */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Recovery Rate by Cause</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}} 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} 
                  itemStyle={{ color: '#818cf8' }} 
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate > 50 ? '#34d399' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Queue / Recent Orders */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 flex flex-col h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Recent Drop-offs</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {orders.slice(0, 10).map(order => (
              <div key={order.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{order.razorpay_order_id.slice(-8)}</div>
                  <div className="text-xs text-slate-400">₹{order.amount.toLocaleString()}</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  order.status === 'recovered' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                  order.status === 'paid' ? 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20' :
                  order.status === 'unrecovered' ? 'bg-rose-400/10 text-rose-400 border-rose-400/20' :
                  'bg-amber-400/10 text-amber-400 border-amber-400/20'
                }`}>
                  {order.status}
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-slate-500 text-sm text-center mt-10">No orders yet. Run the batch generator!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
