import React from 'react';
import { DollarSign, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

function StatCard({ title, value, icon: Icon, colorClass, gradientClass, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 group`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 bg-gradient-to-br ${gradientClass} blur-3xl -mr-10 -mt-10 transition-opacity group-hover:opacity-40`}></div>
      <div className="relative z-10 flex items-center justify-between mb-6">
        <h3 className="text-slate-400 font-medium tracking-wide text-sm uppercase">{title}</h3>
        <div className={`p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
      </div>
      <div className="relative z-10 text-4xl font-bold tracking-tight text-white">{value}</div>
    </motion.div>
  );
}

export default function Dashboard({ metrics, orders }) {
  if (!metrics) return null;

  const chartData = Object.keys(metrics.recovery_rate_by_cause).map(cause => ({
    name: cause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    rate: metrics.recovery_rate_by_cause[cause]
  }));

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Revenue at Risk" 
          value={`₹${metrics.total_amount_at_risk.toLocaleString()}`}
          icon={AlertTriangle}
          colorClass="text-amber-400"
          gradientClass="from-amber-500 to-orange-600"
          delay={0}
        />
        <StatCard 
          title="Revenue Recovered" 
          value={`₹${metrics.total_recovered_amount.toLocaleString()}`}
          icon={DollarSign}
          colorClass="text-emerald-400"
          gradientClass="from-emerald-400 to-teal-600"
          delay={0.1}
        />
        <StatCard 
          title="Orders Recovered" 
          value={`${metrics.total_recovered_orders} / ${metrics.total_orders_at_risk}`}
          icon={CheckCircle2}
          colorClass="text-teal-400"
          gradientClass="from-teal-400 to-emerald-600"
          delay={0.2}
        />
        <StatCard 
          title="Wasted Attempts" 
          value={metrics.wasted_attempts}
          icon={ShieldAlert}
          colorClass="text-red-400"
          gradientClass="from-red-500 to-red-600"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Rate by Cause Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex items-center space-x-3 mb-8">
            <div className="p-2 bg-white/5 rounded-xl border border-white/10">
              <TrendingUp className="h-5 w-5 text-violet-300" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Recovery Rate by Cause</h2>
          </div>
          <div className="relative z-10 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#cbd5e1'}} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: 'rgba(15, 12, 41, 0.8)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '16px', backdropFilter: 'blur(12px)' }} 
                  itemStyle={{ color: '#d8b4fe' }} 
                />
                <Bar dataKey="rate" radius={[8, 8, 8, 8]} maxBarSize={50} animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate > 50 ? 'url(#colorEmerald)' : 'url(#colorViolet)'} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="colorViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Live Queue / Recent Orders */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col h-[450px] shadow-xl"
        >
          <h2 className="text-xl font-semibold tracking-tight text-white mb-6">Recent Drop-offs</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {orders.slice(0, 10).map((order, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + (index * 0.05) }}
                key={order.id} 
                className="p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/5 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-200">{order.razorpay_order_id.slice(-8)}</div>
                  <div className="text-xs text-slate-400 mt-1">₹{order.amount.toLocaleString()}</div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border ${
                  order.status === 'recovered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  order.status === 'paid' ? 'bg-teal-500/10 text-teal-300 border-teal-500/20' :
                  order.status === 'unrecovered' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  order.status === 'abandoned' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {order.status.toUpperCase()}
                </div>
              </motion.div>
            ))}
            {orders.length === 0 && (
              <div className="text-slate-400 text-sm text-center mt-12">No orders yet. Run the batch generator!</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
