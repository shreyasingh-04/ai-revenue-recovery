import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Clock, FileText, Settings, Play, CheckCircle } from 'lucide-react';

export default function AuditTrail({ orders, apiBase }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (orderId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/orders/${orderId}/audit`);
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orders.length > 0 && !selectedOrder) {
      setSelectedOrder(orders[0]);
      fetchLogs(orders[0].id);
    }
  }, [orders]);

  const getIconForEvent = (eventType) => {
    switch (eventType) {
      case 'ingestion': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'classification': return <FileText className="w-4 h-4 text-purple-400" />;
      case 'decision': return <Settings className="w-4 h-4 text-amber-400" />;
      case 'action': return <Play className="w-4 h-4 text-indigo-400" />;
      case 'outcome': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
      {/* Order List */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center space-x-2 mb-4 px-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {orders.map(order => (
            <button
              key={order.id}
              onClick={() => {
                setSelectedOrder(order);
                fetchLogs(order.id);
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedOrder?.id === order.id 
                  ? 'bg-slate-700/80 border-indigo-500/50' 
                  : 'bg-slate-800/30 border-transparent hover:bg-slate-800/80'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{order.razorpay_order_id.slice(-8)}</span>
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                  order.status === 'recovered' ? 'text-emerald-400 bg-emerald-400/10' :
                  order.status === 'paid' ? 'text-indigo-400 bg-indigo-400/10' :
                  order.status === 'unrecovered' ? 'text-rose-400 bg-rose-400/10' :
                  'text-amber-400 bg-amber-400/10'
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">₹{order.amount.toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log View */}
      <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 flex flex-col">
        {selectedOrder ? (
          <>
            <div className="border-b border-slate-700 pb-4 mb-4">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <span>Order:</span>
                <span className="text-indigo-400">{selectedOrder.razorpay_order_id}</span>
              </h2>
              <div className="text-sm text-slate-400 mt-1">Status: <span className="text-slate-300 font-medium">{selectedOrder.status}</span> | Amount: ₹{selectedOrder.amount.toLocaleString()}</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative pl-4">
              {loading ? (
                <div className="text-slate-500 text-sm">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-slate-500 text-sm">No audit logs available for this order.</div>
              ) : (
                <div className="space-y-6 before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                  {logs.map((log, index) => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 bg-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow md:absolute md:left-1/2 z-10 ${
                        log.event_type === 'outcome' && log.description.includes('Successfully') ? 'border-emerald-500 bg-emerald-500/20' : ''
                      }`}>
                        {getIconForEvent(log.event_type)}
                      </div>
                      
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700 bg-slate-800/80 shadow">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-slate-300 text-sm capitalize">{log.event_type}</div>
                          <time className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</time>
                        </div>
                        <div className="text-sm text-slate-400">{log.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select an order to view its audit trail.
          </div>
        )}
      </div>
    </div>
  );
}
