import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Clock, FileText, Settings, Play, CheckCircle, Handshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditTrail({ orders, apiBase }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promising, setPromising] = useState(false);

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

  const handlePromise = async (hours) => {
    setPromising(true);
    try {
      await axios.post(`${apiBase}/orders/${selectedOrder.id}/promise`, { hours_from_now: hours });
      await fetchLogs(selectedOrder.id);
    } catch (e) {
      console.error(e);
    } finally {
      setPromising(false);
    }
  };

  const getIconForEvent = (eventType) => {
    switch (eventType) {
      case 'ingestion': return <Clock className="w-4 h-4 text-sky-400" />;
      case 'classification': return <FileText className="w-4 h-4 text-teal-400" />;
      case 'decision': return <Settings className="w-4 h-4 text-amber-400" />;
      case 'action': return <Play className="w-4 h-4 text-violet-400" />;
      case 'outcome': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const isAbandoned = selectedOrder?.status === 'abandoned';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
      {/* Order List */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col shadow-xl"
      >
        <div className="flex items-center space-x-3 mb-6 p-3 bg-white/5 rounded-2xl border border-white/10">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search orders..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-500 text-white outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
          <AnimatePresence>
            {orders.map(order => (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={order.id}
                onClick={() => {
                  setSelectedOrder(order);
                  fetchLogs(order.id);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                  selectedOrder?.id === order.id 
                    ? 'bg-white/10 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)]' 
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-slate-200">{order.razorpay_order_id.slice(-8)}</span>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
                    order.status === 'recovered' ? 'text-emerald-400 bg-emerald-500/10' :
                    order.status === 'paid' ? 'text-teal-300 bg-teal-500/10' :
                    order.status === 'unrecovered' ? 'text-red-400 bg-red-500/10' :
                    order.status === 'abandoned' ? 'text-cyan-400 bg-cyan-500/10' :
                    'text-amber-400 bg-amber-500/10'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">₹{order.amount.toLocaleString()}</div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Audit Log View */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-xl"
      >
        {selectedOrder ? (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="border-b border-white/10 pb-6 mb-8 relative z-10 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold flex items-center space-x-2 tracking-tight">
                  <span className="text-white">Order:</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-emerald-300">{selectedOrder.razorpay_order_id}</span>
                </h2>
                <div className="text-sm text-slate-400 mt-2 font-medium">
                  Status: <span className="text-slate-200 uppercase tracking-wider text-xs ml-1 mr-4">{selectedOrder.status}</span> 
                  Amount: <span className="text-slate-200 ml-1">₹{selectedOrder.amount.toLocaleString()}</span>
                </div>
              </div>
              
              {isAbandoned && (
                <div className="flex flex-col items-end space-y-2">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Simulate Customer Promise</span>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handlePromise(2)}
                      disabled={promising}
                      className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded-xl border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <Handshake className="w-3 h-3" />
                      <span>In 2 hours</span>
                    </button>
                    <button 
                      onClick={() => handlePromise(48)}
                      disabled={promising}
                      className="px-3 py-1.5 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 rounded-xl border border-violet-500/30 text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <Handshake className="w-3 h-3" />
                      <span>In 2 days</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative pl-4 z-10">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-slate-500 text-sm text-center mt-10">No audit logs available for this order.</div>
              ) : (
                <div className="space-y-8 before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-teal-500/0 before:via-white/10 before:to-teal-500/0">
                  <AnimatePresence>
                    {logs.map((log, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={log.id} 
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                      >
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border bg-[#1a153a] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg md:absolute md:left-1/2 z-10 ${
                          log.event_type === 'outcome' && log.description.includes('Successfully') 
                            ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'border-white/10'
                        }`}>
                          {getIconForEvent(log.event_type)}
                        </div>
                        
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl hover:bg-white/10 transition-colors duration-300">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-slate-200 text-sm uppercase tracking-wider">{log.event_type}</div>
                            <time className="text-xs font-medium text-slate-400 bg-white/5 px-2 py-1 rounded-md">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</time>
                          </div>
                          <div className="text-sm text-slate-300 leading-relaxed">{log.description}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select an order to view its audit trail.
          </div>
        )}
      </motion.div>
    </div>
  );
}
